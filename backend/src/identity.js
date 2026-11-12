const { createHash } = require("node:crypto");

// La normalisation élimine les séparateurs fréquents sans inventer d'indicatif national.
function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d{8,15}$/.test(compact)) return null;
  return compact;
}

// Une date événementielle est calculée dans le fuseau configuré, pas celui du navigateur.
function getEventDayNumber(now, startDate, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const localDate = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const localMidnight = Date.UTC(Number(localDate.year), Number(localDate.month) - 1, Number(localDate.day));
  const startMidnight = Date.parse(`${startDate}T00:00:00Z`);
  return Math.floor((localMidnight - startMidnight) / 86_400_000) + 1;
}

// Seuls les jours déjà commencés sont validables, selon l'horloge du serveur.
function isEventDayAvailable(day, now, startDate, timeZone) {
  return Number.isInteger(day) && day >= 1 && day <= 21 && day <= getEventDayNumber(now, startDate, timeZone);
}

// Le cookie contient un secret aléatoire, mais seule son empreinte est conservée en base.
function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

module.exports = { normalizePhone, getEventDayNumber, isEventDayAvailable, hashSessionToken };
