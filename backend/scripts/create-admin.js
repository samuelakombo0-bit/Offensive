require("dotenv").config();

const readline = require("node:readline/promises");
const bcrypt = require("bcryptjs");
const { stdin, stdout } = require("node:process");
const { loadConfig } = require("../src/config");
const { createPrismaClient } = require("../src/prisma");

// Le mot de passe n'est jamais fourni par défaut ni affiché dans le terminal.
function promptHidden(label) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("La création interactive du compte exige un terminal."));
  }

  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          stdin.setRawMode(false);
          stdin.off("data", onData);
          stdin.pause();
          stdout.write("\n");
          reject(new Error("Création annulée."));
          return;
        }
        if (character === "\r" || character === "\n") {
          stdin.setRawMode(false);
          stdin.off("data", onData);
          stdin.pause();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        } else if (character >= " ") {
          value += character;
          stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

// Un seul administrateur est créé par cette commande ; aucun formulaire public ne peut en ajouter.
async function main() {
  const config = loadConfig();
  const prisma = createPrismaClient(config.databaseUrl);
  const prompt = readline.createInterface({ input: stdin, output: stdout });

  try {
    await prisma.$connect();
    const existing = await prisma.administrateur.count();
    if (existing > 0) throw new Error("Un administrateur existe déjà ; aucun nouveau compte n’a été créé.");

    const name = (await prompt.question("Nom affiché : ")).trim();
    const email = (await prompt.question("Adresse e-mail : ")).trim().toLowerCase();
    prompt.close();

    if (!name || name.length > 100) throw new Error("Le nom doit contenir entre 1 et 100 caractères.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) throw new Error("L’adresse e-mail est invalide.");

    const password = await promptHidden("Mot de passe (12 caractères minimum) : ");
    const confirmation = await promptHidden("Confirmer le mot de passe : ");
    if (password.length < 12 || password.length > 128) throw new Error("Le mot de passe doit contenir de 12 à 128 caractères.");
    if (password !== confirmation) throw new Error("Les mots de passe ne correspondent pas.");

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.administrateur.create({
      data: { nomAdministrateur: name, emailAdministrateur: email, motDePasse: passwordHash },
    });
    console.info("Compte administrateur créé. Gardez son mot de passe hors du dépôt.");
  } finally {
    prompt.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Création du compte administrateur impossible.", error.message);
  process.exitCode = 1;
});
