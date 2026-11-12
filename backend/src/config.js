const path = require("node:path");

// La configuration est vérifiée au démarrage afin d'éviter un serveur partiellement opérationnel.
function loadConfig(environment = process.env) {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL doit être défini dans backend/.env.");

  const parsedDatabaseUrl = new URL(databaseUrl);
  if (!["mysql:", "mariadb:"].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("DATABASE_URL doit utiliser le protocole mysql:// ou mariadb://.");
  }

  const port = Number(environment.PORT || 3000);
  const sessionTtlDays = Number(environment.SESSION_TTL_DAYS || 30);
  const eventStartDate = environment.EVENT_START_DATE || "2026-11-15";
  const eventTimeZone = environment.EVENT_TIME_ZONE || "UTC";
  const parsedEventStart = new Date(`${eventStartDate}T00:00:00Z`);

  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT doit être un port valide.");
  if (!Number.isInteger(sessionTtlDays) || sessionTtlDays < 1 || sessionTtlDays > 365) {
    throw new Error("SESSION_TTL_DAYS doit être compris entre 1 et 365.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventStartDate)
    || Number.isNaN(parsedEventStart.getTime())
    || parsedEventStart.toISOString().slice(0, 10) !== eventStartDate) {
    throw new Error("EVENT_START_DATE doit être une date au format AAAA-MM-JJ.");
  }

  // Intl valide le fuseau IANA sans supposer le pays d'hébergement du site.
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: eventTimeZone });
  } catch {
    throw new Error("EVENT_TIME_ZONE doit être un fuseau horaire IANA valide.");
  }

  const production = environment.NODE_ENV === "production";
  const cookieSecure = environment.COOKIE_SECURE === "true";
  if (production && !cookieSecure) {
    throw new Error("COOKIE_SECURE=true est obligatoire en production HTTPS.");
  }

  return {
    databaseUrl,
    port,
    sessionTtlDays,
    eventStartDate,
    eventTimeZone,
    cookieSecure,
    trustProxy: environment.TRUST_PROXY === "true",
    uploadDirectory: path.resolve(__dirname, "..", environment.UPLOAD_DIR || "private-uploads"),
    production,
  };
}

module.exports = { loadConfig };
