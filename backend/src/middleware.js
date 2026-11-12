const { AppError } = require("./errors");
const { loadSession } = require("./security");

// Les mutations refusent les origines externes lorsqu'un navigateur fournit son en-tête Origin.
function requireSameOrigin(request, response, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  const origin = request.get("origin");
  if (!origin) return next();

  try {
    if (new URL(origin).origin !== `${request.protocol}://${request.get("host")}`) {
      throw new AppError(403, "CROSS_ORIGIN_REQUEST", "Cette requête ne provient pas du site.");
    }
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(403, "INVALID_ORIGIN", "L'origine de cette requête est invalide."));
  }
  return next();
}

// Cette fonction résout le cookie signé par secret aléatoire vers une session active en base.
function createAuthentication(database, config) {
  return async function authenticate(request, response, next) {
    try {
      request.identity = await loadSession(database, request, response, config);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Les routes publiques peuvent utiliser la session courante mais ne l'exigent pas toutes.
function requireParticipant(request, response, next) {
  if (request.identity?.kind !== "participant") {
    return next(new AppError(401, "PARTICIPANT_SESSION_REQUIRED", "Créez une carte dans ce navigateur pour ouvrir votre session participant."));
  }
  return next();
}

// Le panneau et ses API restent inaccessibles sans une session administrateur valide.
function requireAdmin(request, response, next) {
  if (request.identity?.kind !== "admin") {
    return next(new AppError(401, "ADMIN_SESSION_REQUIRED", "Connectez-vous pour accéder au panneau administrateur."));
  }
  return next();
}

module.exports = { requireSameOrigin, createAuthentication, requireParticipant, requireAdmin };
