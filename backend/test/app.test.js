const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { createApp } = require("../src/app");

// Le serveur simulé permet de vérifier les routes publiques sans base de données configurée.
async function withServer(run) {
  const prisma = {
    $queryRaw: async () => [{ result: 1 }],
    participant: { count: async () => 4 },
    carte: { count: async () => 9 },
    sessionAuth: { findUnique: async () => null },
  };
  const config = {
    cookieSecure: false,
    eventStartDate: "2026-11-15",
    eventTimeZone: "UTC",
    port: 0,
    production: false,
    sessionTtlDays: 30,
    trustProxy: false,
    uploadDirectory: "C:\\offensive-test-uploads",
  };
  const server = createApp({ prisma, config }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("site, événements de calendrier et statistiques n'exposent que les routes prévues", async () => {
  await withServer(async (origin) => {
    const [site, metadata, stats, hiddenConfig] = await Promise.all([
      fetch(`${origin}/admin`),
      fetch(`${origin}/api/meta`),
      fetch(`${origin}/api/stats`),
      fetch(`${origin}/package.json`),
    ]);

    assert.equal(site.status, 200);
    assert.match(await site.text(), /Connexion administrateur/);
    assert.deepEqual(await metadata.json(), {
      eventStartDate: "2026-11-15",
      eventTimeZone: "UTC",
      eventDays: 21,
    });

    assert.deepEqual(await stats.json(), { participants: 4, cards: 9 });
    assert.equal(hiddenConfig.status, 404);
  });
});

test("les sessions et les mutations refusent les accès anonymes et inter-origines", async () => {
  await withServer(async (origin) => {
    const [privateCheckins, adminPanel, crossOrigin] = await Promise.all([
      fetch(`${origin}/api/checkins`),
      fetch(`${origin}/api/admin/session`),
      fetch(`${origin}/api/engagements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://site-inconnu.example" },
        body: JSON.stringify({}),
      }),
    ]);

    assert.equal(privateCheckins.status, 401);
    assert.equal(adminPanel.status, 401);
    assert.equal(crossOrigin.status, 403);
  });
});

test("la première carte crée un participant et le cookie le retrouve sans créer un doublon", async () => {
  const participants = [];
  const sessions = [];
  const engagements = [];
  const cards = [];
  let nextId = 1;
  const participantModel = {
    count: async () => participants.length,
    findUnique: async ({ where }) => participants.find((item) =>
      where.telephoneParticipant
        ? item.telephoneParticipant === where.telephoneParticipant
        : item.idParticipant === where.idParticipant) || null,
    create: async ({ data }) => {
      const record = { idParticipant: nextId++, ...data };
      participants.push(record);
      return record;
    },
    update: async ({ where, data }) => {
      const record = participants.find((item) => item.idParticipant === where.idParticipant);
      Object.assign(record, data);
      return record;
    },
  };
  const prisma = {
    $queryRaw: async () => [{ result: 1 }],
    $transaction: async (operation) => operation(prisma),
    participant: participantModel,
    carte: {
      count: async () => cards.length,
      create: async ({ data }) => {
        const record = { idCarte: nextId++, ...data };
        cards.push(record);
        return record;
      },
    },
    engagement: {
      create: async ({ data }) => {
        const record = { idEngagement: nextId++, ...data };
        engagements.push(record);
        return record;
      },
    },
    sessionAuth: {
      create: async ({ data }) => {
        const record = { idSession: nextId++, ...data };
        sessions.push(record);
        return record;
      },
      findUnique: async ({ where }) => {
        const session = sessions.find((item) => item.empreinte === where.empreinte);
        return session
          ? {
              ...session,
              participant: participants.find((item) => item.idParticipant === session.idParticipant),
              administrateur: null,
            }
          : null;
      },
      delete: async ({ where }) => {
        const index = sessions.findIndex((item) => item.idSession === where.idSession);
        return sessions.splice(index, 1)[0];
      },
      update: async ({ where, data }) => {
        const record = sessions.find((item) => item.idSession === where.idSession);
        Object.assign(record, data);
        return record;
      },
      deleteMany: async ({ where }) => {
        const remaining = sessions.filter((item) => item.empreinte !== where.empreinte);
        const count = sessions.length - remaining.length;
        sessions.splice(0, sessions.length, ...remaining);
        return { count };
      },
    },
    suiviJournalier: { findMany: async () => [] },
  };
  const config = {
    cookieSecure: false,
    eventStartDate: "2020-11-15",
    eventTimeZone: "UTC",
    port: 0,
    production: false,
    sessionTtlDays: 30,
    trustProxy: false,
    uploadDirectory: "C:\\offensive-test-uploads",
  };
  const server = createApp({ prisma, config }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const form = {
      firstName: "Amina",
      lastName: "Test",
      phone: "+243812345678",
      timeZone: "Africa/Kinshasa",
      location: "Kinshasa",
      duration: 7,
      consent: true,
    };
    const invalidTimeZone = await fetch(`${origin}/api/engagements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, timeZone: "Africa/" }),
    });
    assert.equal(invalidTimeZone.status, 400);
    assert.equal((await invalidTimeZone.json()).error.code, "INVALID_TIME_ZONE");

    const firstCard = await fetch(`${origin}/api/engagements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    assert.equal(firstCard.status, 201);
    const created = await firstCard.json();
    assert.equal(participants.length, 1);
    assert.equal(engagements.length, 1);
    assert.equal(cards.length, 1);

    const sessionCookie = firstCard.headers.get("set-cookie").split(";")[0];
    const restored = await fetch(`${origin}/api/me`, { headers: { Cookie: sessionCookie } });
    assert.deepEqual(await restored.json(), {
      authenticated: true,
      participant: {
        id: created.participantId,
        firstName: "Amina",
        lastName: "Test",
        phone: "+243812345678",
        timeZone: "Africa/Kinshasa",
      },
    });

    const secondCard = await fetch(`${origin}/api/engagements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ ...form, duration: 14 }),
    });
    assert.equal(secondCard.status, 201);
    assert.equal(participants.length, 1);
    assert.equal(engagements.length, 2);
    assert.equal(cards.length, 2);

    const duplicateWithoutSession = await fetch(`${origin}/api/engagements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    assert.equal(duplicateWithoutSession.status, 409);
    assert.equal(participants.length, 1);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("le compte administrateur se connecte avec un cookie HttpOnly", async () => {
  const passwordHash = await bcrypt.hash("un-mot-de-passe-de-test", 4);
  const admin = {
    idAdministrateur: 1,
    nomAdministrateur: "Administratrice de test",
    emailAdministrateur: "admin@example.test",
    motDePasse: passwordHash,
    derniereConnexion: null,
  };
  const sessions = [];
  let nextId = 1;
  const prisma = {
    $queryRaw: async () => [{ result: 1 }],
    $transaction: async (operation) => operation(prisma),
    administrateur: {
      findUnique: async () => admin,
      update: async ({ data }) => Object.assign(admin, data),
    },
    sessionAuth: {
      create: async ({ data }) => {
        const session = { idSession: nextId++, ...data };
        sessions.push(session);
        return session;
      },
      findUnique: async ({ where }) => {
        const session = sessions.find((item) => item.empreinte === where.empreinte);
        return session ? { ...session, administrateur: admin, participant: null } : null;
      },
      update: async ({ where, data }) => {
        const session = sessions.find((item) => item.idSession === where.idSession);
        Object.assign(session, data);
        return session;
      },
      delete: async ({ where }) => {
        const index = sessions.findIndex((item) => item.idSession === where.idSession);
        return sessions.splice(index, 1)[0];
      },
    },
    journalAdmin: { create: async () => ({ idAction: nextId++ }) },
  };
  const config = {
    cookieSecure: false,
    eventStartDate: "2020-11-15",
    eventTimeZone: "UTC",
    port: 0,
    production: false,
    sessionTtlDays: 30,
    trustProxy: false,
    uploadDirectory: "C:\\offensive-test-uploads",
  };
  const server = createApp({ prisma, config }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const login = await fetch(`${origin}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: admin.emailAdministrateur, password: "un-mot-de-passe-de-test" }),
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(login.headers.get("set-cookie"), /SameSite=Lax/i);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const session = await fetch(`${origin}/api/admin/session`, { headers: { Cookie: cookie } });
    const sessionData = await session.json();
    assert.equal(session.status, 200, JSON.stringify({ cookie, sessionData }));
    assert.deepEqual(sessionData, {
      admin: { name: admin.nomAdministrateur, email: admin.emailAdministrateur },
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
