const { PrismaClient } = require("./generated/prisma");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

// Prisma ORM 7 utilise l'adaptateur MariaDB/MySQL pour les connexions directes en JavaScript.
function createPrismaClient(databaseUrl) {
  const connection = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: connection.hostname,
    port: Number(connection.port || 3306),
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database: decodeURIComponent(connection.pathname.slice(1)),
    connectionLimit: 5,
  });

  return new PrismaClient({ adapter });
}

module.exports = { createPrismaClient };
