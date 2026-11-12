require('dotenv').config();

const { createApp } = require("./src/app");
const { loadConfig } = require("./src/config");
const { createPrismaClient } = require("./src/prisma");

// Le processus ne démarre que si sa configuration et la connexion SQL fonctionnent.
async function startServer() {
  const config = loadConfig();
  const prisma = createPrismaClient(config.databaseUrl);
  await prisma.$connect();

  const app = createApp({ prisma, config });
  const server = app.listen(config.port, () => {
    console.log(`Grande Offensive : serveur prêt sur http://localhost:${config.port}`);
  });

  // Les anciennes sessions expirées sont supprimées périodiquement pour limiter leur conservation.
  const sessionCleanup = setInterval(async () => {
    try {
      const result = await prisma.sessionAuth.deleteMany({ where: { dateExpiration: { lt: new Date() } } });
      if (result.count > 0) console.info(`${result.count} session(s) expirée(s) supprimée(s).`);
    } catch (error) {
      console.error("Nettoyage des sessions expirées impossible.", error);
    }
  }, 60 * 60 * 1000);
  sessionCleanup.unref();

  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    clearInterval(sessionCleanup);
    console.info(`Arrêt du serveur demandé (${signal}).`);
    server.close(async (error) => {
      await prisma.$disconnect();
      if (error) {
        console.error("Fermeture du serveur impossible.", error);
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Le serveur n’a pas pu démarrer.", error);
  process.exitCode = 1;
});