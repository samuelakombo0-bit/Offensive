const { randomBytes } = require("node:crypto");
const express = require("express");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { AppError, parseInput } = require("../errors");
const { normalizePhone, hashSessionToken, isEventDayAvailable } = require("../identity");
const { setSessionCookie } = require("../security");
const { requireParticipant } = require("../middleware");
const { ImageValidationError, removePrivateImage, resolvePrivateImage, savePrivateImage } = require("../storage");

const cardInput = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire.").max(100),
  lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(100),
  phone: z.string().trim().min(1, "Le téléphone est obligatoire.").max(50),
  location: z.string().trim().min(1, "L’assemblée ou la ville est obligatoire.").max(120),
  timeZone: z.string().trim().min(1).max(64),
  duration: z.coerce.number().int().min(1).max(21),
  consent: z.literal(true, { error: "Le consentement à la conservation des données est obligatoire." }),
});
const checkinInput = z.object({ day: z.coerce.number().int().min(1).max(21) });
const testimonialInput = z.object({
  message: z.string().trim().min(10, "Le témoignage doit contenir au moins 10 caractères.").max(1000),
  publicationConsent: z.literal("on", { error: "L’autorisation de publication est obligatoire." }),
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const testimonialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "TESTIMONIAL_RATE_LIMIT", message: "Trop de témoignages ont été envoyés. Réessayez plus tard." } },
});

// Les routes publiques ne renvoient jamais de liste de téléphones ou de profils d'autres participants.
function createPublicRouter({ prisma, config }) {
  const router = express.Router();

  router.get("/meta", (request, response) => {
    response.json({
      eventStartDate: config.eventStartDate,
      eventTimeZone: config.eventTimeZone,
      eventDays: 21,
    });
  });

  router.get("/me", (request, response) => {
    if (request.identity?.kind !== "participant") return response.json({ authenticated: false });
    const { idParticipant, nomParticipant, prenomParticipant, telephoneParticipant, fuseauHoraire } = request.identity.participant;
    return response.json({
      authenticated: true,
      participant: {
        id: idParticipant,
        firstName: prenomParticipant,
        lastName: nomParticipant,
        phone: telephoneParticipant,
        timeZone: fuseauHoraire,
      },
    });
  });

  router.get("/stats", async (request, response) => {
    const [participants, cards] = await Promise.all([prisma.participant.count(), prisma.carte.count()]);
    response.json({ participants, cards });
  });

  router.post("/engagements", async (request, response) => {
    const input = parseInput(cardInput, request.body);
    const phone = normalizePhone(input.phone);
    if (!phone) throw new AppError(400, "INVALID_PHONE", "Entrez un numéro contenant 8 à 15 chiffres, avec l’indicatif international si vous le connaissez.");
    let timeZone;
    try {
      timeZone = new Intl.DateTimeFormat("fr-FR", { timeZone: input.timeZone }).resolvedOptions().timeZone;
    } catch {
      throw new AppError(400, "INVALID_TIME_ZONE", "Le fuseau horaire envoyé n’est pas reconnu.");
    }

    if (request.identity?.kind === "admin") {
      throw new AppError(409, "PARTICIPANT_SESSION_REQUIRED", "Déconnectez le panneau administrateur avant de créer une carte participant.");
    }

    const returningParticipant = request.identity?.kind === "participant" ? request.identity.participant : null;
    if (returningParticipant && returningParticipant.telephoneParticipant !== phone) {
      throw new AppError(409, "PHONE_MISMATCH", "Le téléphone doit rester le même dans ce navigateur pour réutiliser le compte.");
    }

    // Le secret est préparé avant la transaction, mais n'est envoyé qu'après son commit.
    const newSessionToken = returningParticipant ? null : randomBytes(32).toString("base64url");
    let result;
    try {
      result = await prisma.$transaction(async (transaction) => {
        let participant;
        if (returningParticipant) {
          participant = await transaction.participant.update({
            where: { idParticipant: returningParticipant.idParticipant },
            data: {
              nomParticipant: input.lastName,
              prenomParticipant: input.firstName,
              fuseauHoraire: timeZone,
            },
          });
        } else {
          const existingParticipant = await transaction.participant.findUnique({
            where: { telephoneParticipant: phone },
            select: { idParticipant: true },
          });
          if (existingParticipant) {
            throw new AppError(409, "PHONE_ALREADY_REGISTERED", "Ce numéro est déjà associé à un compte. Réutilisez le navigateur qui l’a créé ; la récupération par SMS n’est pas encore activée.");
          }

          participant = await transaction.participant.create({
            data: {
              nomParticipant: input.lastName,
              prenomParticipant: input.firstName,
              telephoneParticipant: phone,
              fuseauHoraire: timeZone,
              consentementDonnees: new Date(),
            },
          });
          await transaction.sessionAuth.create({
            data: {
              empreinte: hashSessionToken(newSessionToken),
              idParticipant: participant.idParticipant,
              dateExpiration: new Date(Date.now() + config.sessionTtlDays * 86_400_000),
            },
          });
        }

        const engagement = await transaction.engagement.create({
          data: {
            idParticipant: participant.idParticipant,
            lieu: input.location,
            joursChoisis: input.duration,
          },
        });
        const card = await transaction.carte.create({ data: { idEngagement: engagement.idEngagement } });
        return { participant, engagement, card };
      });
    } catch (error) {
      if (error.code === "P2002") {
        throw new AppError(409, "PHONE_ALREADY_REGISTERED", "Ce numéro est déjà associé à un compte. Réutilisez le navigateur qui l’a créé ; la récupération par SMS n’est pas encore activée.");
      }
      throw error;
    }

    if (newSessionToken) setSessionCookie(response, newSessionToken, config);
    return response.status(201).json({
      participantId: result.participant.idParticipant,
      engagementId: result.engagement.idEngagement,
      cardId: result.card.idCarte,
    });
  });

  router.get("/checkins", requireParticipant, async (request, response) => {
    const records = await prisma.suiviJournalier.findMany({
      where: { idParticipant: request.identity.participant.idParticipant },
      select: { jour: true, dateValidation: true },
      orderBy: { jour: "asc" },
    });
    response.json({ days: records });
  });

  router.post("/checkins", requireParticipant, async (request, response) => {
    const { day } = parseInput(checkinInput, request.body);
    if (!isEventDayAvailable(day, new Date(), config.eventStartDate, request.identity.participant.fuseauHoraire)) {
      throw new AppError(409, "CHECKIN_DAY_NOT_AVAILABLE", "Ce jour de suivi n’est pas encore disponible selon le calendrier de l’Offensive.");
    }

    const record = await prisma.suiviJournalier.upsert({
      where: {
        idParticipant_jour: {
          idParticipant: request.identity.participant.idParticipant,
          jour: day,
        },
      },
      create: { idParticipant: request.identity.participant.idParticipant, jour: day },
      update: {},
      select: { jour: true, dateValidation: true },
    });
    response.status(200).json({ day: record });
  });

  router.delete("/checkins/:day", requireParticipant, async (request, response) => {
    const { day } = parseInput(checkinInput, { day: request.params.day });
    if (!isEventDayAvailable(day, new Date(), config.eventStartDate, request.identity.participant.fuseauHoraire)) {
      throw new AppError(409, "CHECKIN_DAY_NOT_AVAILABLE", "Ce jour de suivi n’est pas encore disponible selon le calendrier de l’Offensive.");
    }

    await prisma.suiviJournalier.deleteMany({
      where: { idParticipant: request.identity.participant.idParticipant, jour: day },
    });
    response.status(204).end();
  });

  router.get("/testimonials", async (request, response) => {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const pageSize = 12;
    const [items, total] = await Promise.all([
      prisma.temoignage.findMany({
        where: { statut: "APPROUVE" },
        select: { idTemoignage: true, messageTemoignage: true, dateTemoignage: true, imagePrivee: true },
        orderBy: { dateTemoignage: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.temoignage.count({ where: { statut: "APPROUVE" } }),
    ]);

    response.json({
      items: items.map(({ idTemoignage, messageTemoignage, dateTemoignage, imagePrivee }) => ({
        id: idTemoignage,
        message: messageTemoignage,
        date: dateTemoignage,
        imageUrl: imagePrivee ? `/api/testimonials/${idTemoignage}/image` : null,
      })),
      page,
      total,
    });
  });

  router.get("/testimonials/:id/image", async (request, response, next) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_TESTIMONIAL_ID", "Identifiant de témoignage invalide.");
    const testimonial = await prisma.temoignage.findFirst({
      where: { idTemoignage: id, statut: "APPROUVE", imagePrivee: { not: null } },
      select: { imagePrivee: true },
    });
    const imagePath = testimonial && resolvePrivateImage(config.uploadDirectory, testimonial.imagePrivee);
    if (!imagePath) throw new AppError(404, "IMAGE_NOT_FOUND", "Cette image n’est pas disponible.");
    response.type("image/webp").set("X-Content-Type-Options", "nosniff").sendFile(imagePath, (error) => {
      if (error) next(error);
    });
  });

  router.post("/testimonials", testimonialLimiter, requireParticipant, imageUpload.single("image"), async (request, response) => {
    const { message } = parseInput(testimonialInput, request.body);
    let imageFilename = null;
    if (request.file) {
      try {
        imageFilename = await savePrivateImage(request.file.buffer, config.uploadDirectory);
      } catch (error) {
        if (error instanceof ImageValidationError) throw new AppError(400, "INVALID_IMAGE", error.message);
        throw error;
      }
    }

    try {
      const testimonial = await prisma.temoignage.create({
        data: {
          messageTemoignage: message,
          statut: "EN_ATTENTE",
          imagePrivee: imageFilename,
          idParticipant: request.identity.participant.idParticipant,
        },
        select: { idTemoignage: true, statut: true },
      });
      return response.status(201).json({ id: testimonial.idTemoignage, status: testimonial.statut });
    } catch (error) {
      if (imageFilename) await removePrivateImage(config.uploadDirectory, imageFilename);
      throw error;
    }
  });

  return router;
}

module.exports = { createPublicRouter };
