// Charge les variables locales avant de résoudre DATABASE_URL pour Prisma CLI.
import "dotenv/config";

// Cette configuration est utilisée uniquement par les commandes Prisma du backend.
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Le modèle reste à la racine du dépôt pour documenter la base entière.
  schema: "./prisma/schema.prisma",
  // Les migrations générées sont conservées dans le dossier backend.
  migrations: {
    path: "./prisma/migrations",
  },
  // Prisma 7 lit l’URL de connexion ici plutôt que dans schema.prisma.
  datasource: {
    url: env("DATABASE_URL"),
  },
});
