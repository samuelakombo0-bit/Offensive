const { randomBytes } = require("node:crypto");
const { hashSessionToken } = require("./identity");

const SESSION_COOKIE = "offensive_session";
const COOKIE_PATH = "/";

// Les cookies de session ne sont pas accessibles au JavaScript de la page.
function setSessionCookie(response, token, config) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
  });
}

// Un nouveau secret aléatoire lie la session à un participant OU à un administrateur.
async function createSession(database, response, config, identity) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  await database.sessionAuth.create({
    data: {
      empreinte: hashSessionToken(token),
      idParticipant: identity.participantId || null,
      idAdministrateur: identity.adminId || null,
      dateExpiration: expiresAt,
    },
  });
  setSessionCookie(response, token, config);
}

// La session expirée est ignorée et le navigateur reçoit un cookie supprimé.
async function loadSession(database, request, response, config) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;

  const now = new Date();
  const session = await database.sessionAuth.findUnique({
    where: { empreinte: hashSessionToken(token) },
    include: { participant: true, administrateur: true },
  });

  if (!session || session.dateExpiration <= now) {
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: COOKIE_PATH });
    return null;
  }

  const participantOnly = Boolean(session.idParticipant) && !session.idAdministrateur;
  const adminOnly = Boolean(session.idAdministrateur) && !session.idParticipant;
  if ((!participantOnly && !adminOnly)
    || (participantOnly && !session.participant)
    || (adminOnly && !session.administrateur)) {
    await database.sessionAuth.delete({ where: { idSession: session.idSession } });
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: COOKIE_PATH });
    return null;
  }

  // Le renouvellement glissant garde une session active sans prolonger les sessions abandonnées.
  const renewalThreshold = config.sessionTtlDays * 24 * 60 * 60 * 1000 / 2;
  if (session.dateExpiration.getTime() - now.getTime() < renewalThreshold) {
    const expiresAt = new Date(now.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
    await database.sessionAuth.update({ where: { idSession: session.idSession }, data: { dateExpiration: expiresAt } });
    setSessionCookie(response, token, config);
  }

  return participantOnly
    ? { kind: "participant", participant: session.participant }
    : { kind: "admin", admin: session.administrateur };
}

// La déconnexion retire le jeton côté serveur avant d'effacer le cookie du navigateur.
async function destroySession(database, request, response, config) {
  const token = request.cookies[SESSION_COOKIE];
  if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    await database.sessionAuth.deleteMany({ where: { empreinte: hashSessionToken(token) } });
  }
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: COOKIE_PATH });
}

module.exports = { SESSION_COOKIE, setSessionCookie, createSession, loadSession, destroySession };
