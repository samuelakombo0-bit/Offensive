const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { createApp } = require("../src/app");
const { hashSessionToken } = require("../src/identity");

// Le serveur simulé permet de vérifier les routes publiques sans base de données configurée.
async function withServer(run) {
  const prisma = {
    $queryRaw: async () => [{ result: 1 }],
    participant: { count: async () => 4 },
    carte: { count: async () => 9 },
    assembleeCatalogue: {
      findMany: async ({ where }) => [
        { idAssemblee: 1, nomAssemblee: "Assemblée active", villeAssemblee: "Ville active", actif: true },
        { idAssemblee: 2, nomAssemblee: "Assemblée inactive", villeAssemblee: "Ville inactive", actif: false },
      ].filter((item) => item.actif === where.actif),
    },
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
    const [site, metadata, stats, hiddenConfig, assemblies] = await Promise.all([
      fetch(`${origin}/admin`),
      fetch(`${origin}/api/meta`),
      fetch(`${origin}/api/stats`),
      fetch(`${origin}/package.json`),
      fetch(`${origin}/api/assemblies`),
    ]);

    assert.equal(site.status, 200);
    assert.match(await site.text(), /Connexion administrateur/);
    assert.deepEqual(await metadata.json(), {
      eventStartDate: "2026-11-15",
      eventTimeZone: "UTC",
      eventDays: 21,
    });

    assert.deepEqual(await stats.json(), { participants: 4, cards: 9 });
    assert.deepEqual(await assemblies.json(), {
      items: [{ id: 1, name: "Assemblée active", city: "Ville active" }],
    });
    assert.equal(hiddenConfig.status, 404);
  });
});

test("les sessions et les mutations refusent les accès anonymes et inter-origines", async () => {
  await withServer(async (origin) => {
    const [privateCheckins, adminPanel, anonymousTestimonial, crossOrigin] = await Promise.all([
      fetch(`${origin}/api/checkins`),
      fetch(`${origin}/api/admin/session`),
      fetch(`${origin}/api/testimonials`, { method: "POST" }),
      fetch(`${origin}/api/engagements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://site-inconnu.example" },
        body: JSON.stringify({}),
      }),
    ]);

    assert.equal(privateCheckins.status, 401);
    assert.equal(adminPanel.status, 401);
    assert.equal(anonymousTestimonial.status, 401);
    assert.equal((await anonymousTestimonial.json()).error.message, "Veuillez créer une carte dans ce navigateur pour ouvrir votre session participant.");
    assert.equal(crossOrigin.status, 403);
  });
});

test("la première carte crée un participant et le cookie le retrouve sans créer un doublon", async () => {
  const participants = [];
  const sessions = [];
  const engagements = [];
  const cards = [];
  const admin = { idAdministrateur: 99 };
  const legacyAdminToken = Buffer.alloc(32, 7).toString("base64url");
  sessions.push({
    idSession: 99,
    empreinte: hashSessionToken(legacyAdminToken),
    idAdministrateur: admin.idAdministrateur,
    idParticipant: null,
    dateExpiration: new Date(Date.now() + 60_000),
  });
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
    assembleeCatalogue: {
      findFirst: async ({ where }) => (
        where.idAssemblee === 1 && where.actif
          ? { nomAssemblee: "Assemblée de test", villeAssemblee: "Ville de test" }
          : null
      ),
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
              participant: session.idParticipant
                ? participants.find((item) => item.idParticipant === session.idParticipant)
                : null,
              administrateur: session.idAdministrateur ? admin : null,
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
      assemblyId: 1,
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

    const invalidAssembly = await fetch(`${origin}/api/engagements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assemblyId: 99 }),
    });
    assert.equal(invalidAssembly.status, 400);
    assert.equal((await invalidAssembly.json()).error.code, "INVALID_ASSEMBLY");

    const firstCard = await fetch(`${origin}/api/engagements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `offensive_admin_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA; offensive_session=${legacyAdminToken}`,
      },
      body: JSON.stringify(form),
    });
    assert.equal(firstCard.status, 201);
    assert.match(firstCard.headers.get("set-cookie"), /offensive_session=/i);
    assert.match(firstCard.headers.get("set-cookie"), /Path=\//i);
    const created = await firstCard.json();
    assert.equal(participants.length, 1);
    assert.equal(engagements.length, 1);
    assert.equal(engagements[0].lieu, "Assemblée de test — Ville de test");
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
  const weeklyThemes = new Map();
  const dailyContent = new Map();
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
    themeHebdomadaire: {
      findMany: async ({ where } = {}) => Array.from(weeklyThemes.values())
        .filter((item) => where?.publie === undefined || item.publie === where.publie),
      upsert: async ({ where, create, update }) => {
        const item = weeklyThemes.get(where.semaine) || { ...create };
        Object.assign(item, weeklyThemes.has(where.semaine) ? update : {});
        weeklyThemes.set(where.semaine, item);
        return item;
      },
    },
    contenuJournalier: {
      findMany: async ({ where } = {}) => Array.from(dailyContent.values())
        .filter((item) => where?.publie === undefined || item.publie === where.publie),
      upsert: async ({ where, create, update }) => {
        const item = dailyContent.get(where.jour) || { ...create };
        Object.assign(item, dailyContent.has(where.jour) ? update : {});
        dailyContent.set(where.jour, item);
        return item;
      },
    },
    temoignage: { findMany: async () => [], count: async () => 0 },
    participant: { findMany: async () => [], count: async () => 0 },
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
    assert.match(login.headers.get("set-cookie"), /offensive_admin_session=/i);
    assert.match(login.headers.get("set-cookie"), /Path=\/api\/admin/i);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const session = await fetch(`${origin}/api/admin/session`, { headers: { Cookie: cookie } });
    const sessionData = await session.json();
    assert.equal(session.status, 200, JSON.stringify({ cookie, sessionData }));
    assert.deepEqual(sessionData, {
      admin: { name: admin.nomAdministrateur, email: admin.emailAdministrateur },
    });

    const [testimonials, participants] = await Promise.all([
      fetch(`${origin}/api/admin/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ status: "TOUS", page: 1, search: "recherche de test" }),
      }),
      fetch(`${origin}/api/admin/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ page: 1, search: "recherche de test" }),
      }),
    ]);
    assert.equal(testimonials.status, 200);
    assert.equal(participants.status, 200);
    assert.deepEqual(await testimonials.json(), { items: [], page: 1, pageSize: 10, total: 0 });
    assert.deepEqual(await participants.json(), { items: [], page: 1, pageSize: 20, total: 0 });

    const editorResponse = await fetch(`${origin}/api/admin/devotional`, { headers: { Cookie: cookie } });
    const editor = await editorResponse.json();
    assert.equal(editorResponse.status, 200);
    assert.equal(editor.weeks.length, 3);
    assert.equal(editor.days.length, 21);
    assert.equal(editor.days[0].published, false);

    const emptyPublish = await fetch(`${origin}/api/admin/devotional/days/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ content: "", published: true }),
    });
    assert.equal(emptyPublish.status, 400);

    const saveWeek = await fetch(`${origin}/api/admin/devotional/weeks/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ theme: "Thème saisi par l’équipe", published: true }),
    });
    assert.equal(saveWeek.status, 200);

    const saveDay = await fetch(`${origin}/api/admin/devotional/days/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ content: "Contenu du jour", published: true }),
    });
    assert.equal(saveDay.status, 200);

    const publicContent = await fetch(`${origin}/api/devotional`);
    assert.deepEqual(await publicContent.json(), {
      weeks: [{ week: 1, theme: "Thème saisi par l’équipe" }],
      days: [{ day: 1, content: "Contenu du jour" }],
    });

    const unpublishDay = await fetch(`${origin}/api/admin/devotional/days/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ content: "Contenu du jour", published: false }),
    });
    assert.equal(unpublishDay.status, 200);
    const afterUnpublish = await fetch(`${origin}/api/devotional`);
    assert.deepEqual(await afterUnpublish.json(), {
      weeks: [{ week: 1, theme: "Thème saisi par l’équipe" }],
      days: [],
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
