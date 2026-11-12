const { randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { AppError, parseInput } = require("../errors");
const { hashSessionToken } = require("../identity");
const { destroySession, SESSION_COOKIE, setSessionCookie } = require("../security");
const { requireAdmin } = require("../middleware");
const { removePrivateImage, resolvePrivateImage } = require("../storage");

const loginInput = z.object({
  email: z.string().trim().email().max(100),
  password: z.string().min(1).max(128),
});
const moderationInput = z.object({
  status: z.enum(["EN_ATTENTE", "APPROUVE", "REFUSE"]),
  message: z.string().trim().min(10).max(1000).optional(),
});
const participantUpdateInput = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Fournissez au moins un champ à modifier.");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "LOGIN_RATE_LIMIT", message: "Trop de tentatives. Réessayez dans 15 minutes." } },
});

// Chaque mutation d'administration conserve une trace minimale, sans y copier les données personnelles.
function logAction(transaction, request, action, cible, idCible, details = null) {
  return transaction.journalAdmin.create({
    data: {
      idAdministrateur: request.identity.admin.idAdministrateur,
      action,
      cible,
      idCible: String(idCible),
      details: details ? JSON.stringify(details) : null,
    },
  });
}

// Le panneau expose des listes paginées et des actions d'administration à rôle unique.
function createAdminRouter({ prisma, config }) {
  const router = express.Router();

  router.post("/login", loginLimiter, async (request, response) => {
    const input = parseInput(loginInput, request.body);
    const email = input.email.toLowerCase();
    const admin = await prisma.administrateur.findUnique({ where: { emailAdministrateur: email } });
    if (!admin || !(await bcrypt.compare(input.password, admin.motDePasse))) {
      throw new AppError(401, "INVALID_ADMIN_CREDENTIALS", "Adresse ou mot de passe incorrect.");
    }

    if (request.cookies[SESSION_COOKIE]) {
      await destroySession(prisma, request, response, config);
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86_400_000);
    await prisma.$transaction(async (transaction) => {
      await transaction.administrateur.update({
        where: { idAdministrateur: admin.idAdministrateur },
        data: { derniereConnexion: new Date() },
      });
      await transaction.sessionAuth.create({
        data: {
          empreinte: hashSessionToken(token),
          idAdministrateur: admin.idAdministrateur,
          dateExpiration: expiresAt,
        },
      });
      await transaction.journalAdmin.create({
        data: {
          idAdministrateur: admin.idAdministrateur,
          action: "CONNEXION",
          cible: "ADMINISTRATEUR",
          idCible: String(admin.idAdministrateur),
        },
      });
    });

    setSessionCookie(response, token, config);
    return response.json({ admin: { name: admin.nomAdministrateur, email: admin.emailAdministrateur } });
  });

  router.get("/session", requireAdmin, (request, response) => {
    response.json({
      admin: {
        name: request.identity.admin.nomAdministrateur,
        email: request.identity.admin.emailAdministrateur,
      },
    });
  });

  router.post("/logout", requireAdmin, async (request, response) => {
    await prisma.journalAdmin.create({
      data: {
        idAdministrateur: request.identity.admin.idAdministrateur,
        action: "DECONNEXION",
        cible: "ADMINISTRATEUR",
        idCible: String(request.identity.admin.idAdministrateur),
      },
    });
    await destroySession(prisma, request, response, config);
    response.status(204).end();
  });

  router.get("/dashboard", requireAdmin, async (request, response) => {
    const [participants, engagements, cards, checkins, pendingTestimonials, approvedTestimonials, checkinsByDay] = await Promise.all([
      prisma.participant.count(),
      prisma.engagement.count(),
      prisma.carte.count(),
      prisma.suiviJournalier.count(),
      prisma.temoignage.count({ where: { statut: "EN_ATTENTE" } }),
      prisma.temoignage.count({ where: { statut: "APPROUVE" } }),
      prisma.suiviJournalier.groupBy({
        by: ["jour"],
        _count: { _all: true },
        orderBy: { jour: "asc" },
      }),
    ]);
    response.json({
      participants,
      engagements,
      cards,
      checkins,
      pendingTestimonials,
      approvedTestimonials,
      checkinsByDay: checkinsByDay.map((entry) => ({ day: entry.jour, count: entry._count._all })),
    });
  });

  router.get("/testimonials", requireAdmin, async (request, response) => {
    const requestedStatus = request.query.status || "EN_ATTENTE";
    if (!["EN_ATTENTE", "APPROUVE", "REFUSE", "TOUS"].includes(requestedStatus)) {
      throw new AppError(400, "INVALID_TESTIMONIAL_STATUS", "Filtre de modération invalide.");
    }
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const pageSize = 10;
    const search = String(request.query.search || "").trim().slice(0, 100);
    const where = {
      ...(requestedStatus === "TOUS" ? {} : { statut: requestedStatus }),
      ...(search ? { messageTemoignage: { contains: search } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.temoignage.findMany({
        where,
        include: { auteur: { select: { nomParticipant: true, prenomParticipant: true } } },
        orderBy: { dateTemoignage: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.temoignage.count({ where }),
    ]);
    response.json({
      items: items.map((item) => ({
        id: item.idTemoignage,
        message: item.messageTemoignage,
        status: item.statut,
        createdAt: item.dateTemoignage,
        author: item.auteur ? `${item.auteur.prenomParticipant} ${item.auteur.nomParticipant}` : "Participant",
        imageUrl: item.imagePrivee ? `/api/admin/testimonials/${item.idTemoignage}/image` : null,
      })),
      page,
      pageSize,
      total,
    });
  });

  router.get("/testimonials/:id/image", requireAdmin, async (request, response, next) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_TESTIMONIAL_ID", "Identifiant de témoignage invalide.");
    const testimonial = await prisma.temoignage.findFirst({
      where: { idTemoignage: id, imagePrivee: { not: null } },
      select: { imagePrivee: true },
    });
    const imagePath = testimonial && resolvePrivateImage(config.uploadDirectory, testimonial.imagePrivee);
    if (!imagePath) throw new AppError(404, "IMAGE_NOT_FOUND", "Cette image n’est pas disponible.");
    response.type("image/webp").set("X-Content-Type-Options", "nosniff").sendFile(imagePath, (error) => {
      if (error) next(error);
    });
  });

  router.patch("/testimonials/:id", requireAdmin, async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_TESTIMONIAL_ID", "Identifiant de témoignage invalide.");
    const input = parseInput(moderationInput, request.body);
    const existing = await prisma.temoignage.findUnique({ where: { idTemoignage: id } });
    if (!existing) throw new AppError(404, "TESTIMONIAL_NOT_FOUND", "Témoignage introuvable.");

    const updated = await prisma.$transaction(async (transaction) => {
      const testimonial = await transaction.temoignage.update({
        where: { idTemoignage: id },
        data: {
          statut: input.status,
          ...(input.message ? { messageTemoignage: input.message } : {}),
          idModerateur: request.identity.admin.idAdministrateur,
          dateModeration: new Date(),
        },
        select: { idTemoignage: true, statut: true },
      });
      await logAction(transaction, request, "MODERATION_TEMOIGNAGE", "TEMOIGNAGE", id, { status: input.status });
      return testimonial;
    });
    response.json({ id: updated.idTemoignage, status: updated.statut });
  });

  router.delete("/testimonials/:id", requireAdmin, async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_TESTIMONIAL_ID", "Identifiant de témoignage invalide.");
    const existing = await prisma.temoignage.findUnique({ where: { idTemoignage: id } });
    if (!existing) throw new AppError(404, "TESTIMONIAL_NOT_FOUND", "Témoignage introuvable.");

    await prisma.$transaction(async (transaction) => {
      await transaction.temoignage.delete({ where: { idTemoignage: id } });
      await logAction(transaction, request, "SUPPRESSION_TEMOIGNAGE", "TEMOIGNAGE", id);
    });
    if (existing.imagePrivee) await removePrivateImage(config.uploadDirectory, existing.imagePrivee);
    response.status(204).end();
  });

  router.get("/participants", requireAdmin, async (request, response) => {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const pageSize = 20;
    const search = String(request.query.search || "").trim().slice(0, 100);
    const where = search
      ? {
          OR: [
            { nomParticipant: { contains: search } },
            { prenomParticipant: { contains: search } },
            { telephoneParticipant: { contains: search } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        select: {
          idParticipant: true,
          nomParticipant: true,
          prenomParticipant: true,
          telephoneParticipant: true,
          dateCreation: true,
          _count: { select: { engagements: true, suivisJournaliers: true } },
        },
        orderBy: { idParticipant: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.participant.count({ where }),
    ]);
    response.json({
      items: items.map((item) => ({
        id: item.idParticipant,
        firstName: item.prenomParticipant,
        lastName: item.nomParticipant,
        phone: item.telephoneParticipant,
        createdAt: item.dateCreation,
        engagements: item._count.engagements,
        checkins: item._count.suivisJournaliers,
      })),
      page,
      pageSize,
      total,
    });
  });

  router.patch("/participants/:id", requireAdmin, async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_PARTICIPANT_ID", "Identifiant de participant invalide.");
    const input = parseInput(participantUpdateInput, request.body);
    const data = {};
    if (input.firstName) data.prenomParticipant = input.firstName;
    if (input.lastName) data.nomParticipant = input.lastName;
    if (input.phone) {
      const phone = normalizePhone(input.phone);
      if (!phone) throw new AppError(400, "INVALID_PHONE", "Entrez un numéro contenant 8 à 15 chiffres.");
      data.telephoneParticipant = phone;
    }

    try {
      const updated = await prisma.$transaction(async (transaction) => {
        const participant = await transaction.participant.update({
          where: { idParticipant: id },
          data,
          select: { idParticipant: true, nomParticipant: true, prenomParticipant: true, telephoneParticipant: true },
        });
        await logAction(transaction, request, "MODIFICATION_PARTICIPANT", "PARTICIPANT", id, { fields: Object.keys(data) });
        return participant;
      });
      response.json({
        id: updated.idParticipant,
        firstName: updated.prenomParticipant,
        lastName: updated.nomParticipant,
        phone: updated.telephoneParticipant,
      });
    } catch (error) {
      if (error.code === "P2002") throw new AppError(409, "PHONE_ALREADY_REGISTERED", "Ce numéro est déjà associé à un autre participant.");
      if (error.code === "P2025") throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Participant introuvable.");
      throw error;
    }
  });

  router.delete("/participants/:id", requireAdmin, async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_PARTICIPANT_ID", "Identifiant de participant invalide.");
    const testimonials = await prisma.temoignage.findMany({
      where: { idParticipant: id },
      select: { idTemoignage: true, imagePrivee: true },
    });

    try {
      await prisma.$transaction(async (transaction) => {
        const legacyTracks = await transaction.suivie.findMany({
          where: {
            idParticipant: id,
            participants: { none: { idParticipant: { not: id } } },
          },
          select: { idSuivie: true },
        });
        await transaction.assemblee.deleteMany({ where: { idParticipant: id } });
        await transaction.participantSuivie.deleteMany({ where: { idParticipant: id } });
        if (legacyTracks.length) {
          await transaction.suivie.deleteMany({ where: { idSuivie: { in: legacyTracks.map((item) => item.idSuivie) } } });
        }
        await transaction.temoignageParticipant.deleteMany({
          where: {
            OR: [
              { idParticipant: id },
              ...(testimonials.length ? [{ idTemoignage: { in: testimonials.map((item) => item.idTemoignage) } }] : []),
            ],
          },
        });
        await transaction.temoignage.deleteMany({ where: { idParticipant: id } });
        await logAction(transaction, request, "SUPPRESSION_PARTICIPANT", "PARTICIPANT", id);
        await transaction.participant.delete({ where: { idParticipant: id } });
      });
    } catch (error) {
      if (error.code === "P2025") throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Participant introuvable.");
      throw error;
    }

    for (const testimonial of testimonials) {
      if (testimonial.imagePrivee) await removePrivateImage(config.uploadDirectory, testimonial.imagePrivee);
    }
    response.status(204).end();
  });

  router.get("/audit-log", requireAdmin, async (request, response) => {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const pageSize = 25;
    const [items, total] = await Promise.all([
      prisma.journalAdmin.findMany({
        include: { administrateur: { select: { nomAdministrateur: true } } },
        orderBy: { dateCreation: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.journalAdmin.count(),
    ]);
    response.json({
      items: items.map((item) => ({
        action: item.action,
        target: item.cible,
        targetId: item.idCible,
        details: item.details,
        admin: item.administrateur?.nomAdministrateur || "Administrateur supprimé",
        date: item.dateCreation,
      })),
      page,
      pageSize,
      total,
    });
  });

  return router;
}

module.exports = { createAdminRouter };
