const { randomBytes } = require("node:crypto");
const { hashSessionToken } = require("./identity");

const SESSION_COOKIE = "offensive_session";
const ADMIN_SESSION_COOKIE = "offensive_admin_session";
const COOKIE_PATH = "/";
const ADMIN_COOKIE_PATH = "/api/admin";

// Les cookies de session ne sont pas accessibles au JavaScript de la page.
function setSessionCookie(response, token, config, cookieName = SESSION_COOKIE, cookiePath = COOKIE_PATH) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: cookiePath,
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
  const isAdminRequest = request.originalUrl.startsWith("/api/admin/");
  const cookieName = isAdminRequest && request.cookies[ADMIN_SESSION_COOKIE]
    ? ADMIN_SESSION_COOKIE
    : SESSION_COOKIE;
  const cookiePath = cookieName === ADMIN_SESSION_COOKIE ? ADMIN_COOKIE_PATH : COOKIE_PATH;
  const token = request.cookies[cookieName];
  request.sessionCookieName = cookieName;
  request.sessionCookiePath = cookiePath;
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;

  const now = new Date();
  const session = await database.sessionAuth.findUnique({
    where: { empreinte: hashSessionToken(token) },
    include: { participant: true, administrateur: true },
  });

  if (!session || session.dateExpiration <= now) {
    response.clearCookie(cookieName, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: cookiePath });
    return null;
  }

  const participantOnly = Boolean(session.idParticipant) && !session.idAdministrateur;
  const adminOnly = Boolean(session.idAdministrateur) && !session.idParticipant;
  if ((!participantOnly && !adminOnly)
    || (participantOnly && !session.participant)
    || (adminOnly && !session.administrateur)) {
    await database.sessionAuth.delete({ where: { idSession: session.idSession } });
    response.clearCookie(cookieName, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: cookiePath });
    return null;
  }

  if ((isAdminRequest && !adminOnly) || (!isAdminRequest && !participantOnly)) return null;

  // Le renouvellement glissant garde une session active sans prolonger les sessions abandonnées.
  const renewalThreshold = config.sessionTtlDays * 24 * 60 * 60 * 1000 / 2;
  if (session.dateExpiration.getTime() - now.getTime() < renewalThreshold) {
    const expiresAt = new Date(now.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
    await database.sessionAuth.update({ where: { idSession: session.idSession }, data: { dateExpiration: expiresAt } });
    setSessionCookie(response, token, config, cookieName, cookiePath);
  }

  return participantOnly
    ? { kind: "participant", participant: session.participant }
    : { kind: "admin", admin: session.administrateur };
}

// La déconnexion retire le jeton côté serveur avant d'effacer le cookie du navigateur.
async function destroySession(database, request, response, config) {
  const cookieName = request.sessionCookieName || SESSION_COOKIE;
  const cookiePath = request.sessionCookiePath || COOKIE_PATH;
  const token = request.cookies[cookieName];
  if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    await database.sessionAuth.deleteMany({ where: { empreinte: hashSessionToken(token) } });
  }
  response.clearCookie(cookieName, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: cookiePath });
}

module.exports = {
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_COOKIE_PATH,
  setSessionCookie,
  createSession,
  loadSession,
  destroySession,
};
