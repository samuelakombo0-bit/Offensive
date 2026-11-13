const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { AppError } = require("./errors");
const { createAuthentication, requireSameOrigin } = require("./middleware");
const { createAdminRouter } = require("./routes/admin");
const { createPublicRouter } = require("./routes/public");

const projectRoot = path.resolve(__dirname, "..", "..");
const backendPublic = path.resolve(__dirname, "..", "public");

// Seuls les fichiers nécessaires au site sont publiés ; le reste du dépôt reste privé.
function sendFileFrom(response, filename) {
  return response.sendFile(path.join(projectRoot, filename));
}

function createApp({ prisma, config }) {
  const app = express();
  const authenticate = createAuthentication(prisma, config);

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy ? 1 : false);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        frameSrc: ["'self'", "https://www.google.com", "https://maps.google.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: "20kb", strict: true }));

  // Le serveur publie uniquement les fichiers du site explicitement nécessaires au navigateur.
  app.get(["/", "/index.html"], (request, response) => sendFileFrom(response, "index.html"));
  app.get("/style.css", (request, response) => sendFileFrom(response, "style.css"));
  app.get("/script.js", (request, response) => sendFileFrom(response, "script.js"));
  app.get("/theme.js", (request, response) => sendFileFrom(response, "theme.js"));
  app.get("/liensCarte.json", (request, response) => sendFileFrom(response, "liensCarte.json"));
  app.get(["/admin", "/admin/"], (request, response) => response.sendFile(path.join(backendPublic, "admin.html")));
  app.get("/aF4gJ9Lp8x", (request, response) => response.sendFile(path.join(backendPublic, "admin.html")));
  app.get("/admin.css", (request, response) => response.sendFile(path.join(backendPublic, "admin.css")));
  app.get("/admin.js", (request, response) => response.sendFile(path.join(backendPublic, "admin.js")));
  app.use("/img", express.static(path.join(projectRoot, "img"), { dotfiles: "deny", index: false, maxAge: "1d" }));

  app.get("/api/health", async (request, response) => {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", database: "connected" });
  });

  // Limite la fréquence des créations avant que la route écrive dans la base.
  app.use("/api/engagements", rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "ENGAGEMENT_RATE_LIMIT", message: "Trop de cartes ont été demandées depuis cette connexion. Réessayez plus tard." } },
  }));

  app.use("/api", requireSameOrigin, authenticate);
  app.use("/api", createPublicRouter({ prisma, config }));
  app.use("/api/admin", createAdminRouter({ prisma, config }));

  // Les requêtes inconnues reçoivent un JSON exploitable par le client et non une page HTML.
  app.use((request, response, next) => {
    next(new AppError(404, "ROUTE_NOT_FOUND", "Cette adresse n’existe pas."));
  });

  // Les abus courants sur les formulaires sont distingués des erreurs serveur.
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error.name === "MulterError" && error.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({ error: { code: "IMAGE_TOO_LARGE", message: "L’image ne doit pas dépasser 5 Mo." } });
    }
    if (error.name === "MulterError") {
      return response.status(400).json({ error: { code: "INVALID_UPLOAD", message: "Le fichier envoyé ne respecte pas les limites autorisées." } });
    }
    if (error.type === "entity.parse.failed") {
      return response.status(400).json({ error: { code: "INVALID_JSON", message: "Le corps JSON de la requête est invalide." } });
    }
    if (error instanceof AppError) {
      return response.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    if (error.code === "P2002") {
      return response.status(409).json({ error: { code: "DUPLICATE_RECORD", message: "Cette donnée existe déjà." } });
    }
    if (error.code === "P2025") {
      return response.status(404).json({ error: { code: "RECORD_NOT_FOUND", message: "La donnée demandée n’existe plus." } });
    }
    console.error("Erreur API non traitée", { method: request.method, path: request.path, error });
    return response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Une erreur est survenue. Réessayez plus tard." } });
  });

  return app;
}

module.exports = { createApp };
