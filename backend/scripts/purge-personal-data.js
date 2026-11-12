require("dotenv").config();

const { loadConfig } = require("../src/config");
const { getEventDayNumber } = require("../src/identity");
const { createPrismaClient } = require("../src/prisma");
const { removePrivateImage } = require("../src/storage");

// L'effacement global n'est possible qu'après les 21 jours et avec une confirmation explicite.
async function main() {
  const config = loadConfig();
  const prisma = createPrismaClient(config.databaseUrl);
  const confirmed = process.argv.includes("--confirm");

  try {
    await prisma.$connect();
    if (getEventDayNumber(new Date(), config.eventStartDate, config.eventTimeZone) <= 21) {
      throw new Error("La purge est bloquée jusqu'au lendemain du 21e jour de l'Offensive.");
    }

    const [participants, testimonials, cards] = await Promise.all([
      prisma.participant.count(),
      prisma.temoignage.count(),
      prisma.carte.count(),
    ]);
    console.info(`À purger : ${participants} participant(s), ${cards} carte(s), ${testimonials} témoignage(s).`);
    if (!confirmed) {
      console.info("Aucune donnée supprimée. Après vérification, relancez avec --confirm.");
      return;
    }

    const images = await prisma.temoignage.findMany({
      where: { imagePrivee: { not: null } },
      select: { imagePrivee: true },
    });
    await prisma.$transaction(async (transaction) => {
      await transaction.temoignageParticipant.deleteMany();
      await transaction.temoignage.deleteMany();
      await transaction.assemblee.deleteMany();
      await transaction.participantSuivie.deleteMany();
      await transaction.suivie.deleteMany();
      await transaction.suiviJournalier.deleteMany();
      await transaction.carte.deleteMany();
      await transaction.engagement.deleteMany();
      await transaction.sessionAuth.deleteMany({ where: { idParticipant: { not: null } } });
      await transaction.participant.deleteMany();
    });

    for (const { imagePrivee } of images) {
      await removePrivateImage(config.uploadDirectory, imagePrivee);
    }
    console.info("Données des participants et témoignages supprimés. Les comptes administrateurs et leur journal sont conservés.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Purge des données impossible.", error.message);
  process.exitCode = 1;
});
