const { PrismaClient } = require("./generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

// Prisma ORM 7 utilise l'adaptateur PostgreSQL pour les connexions directes en JavaScript.
function createPrismaClient(databaseUrl) {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  return new PrismaClient({ adapter });
}

module.exports = { createPrismaClient };
