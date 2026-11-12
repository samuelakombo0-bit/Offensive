const test = require("node:test");
const assert = require("node:assert/strict");
const { getEventDayNumber, hashSessionToken, isEventDayAvailable, normalizePhone } = require("../src/identity");

// Les formats de téléphone usuels sont normalisés pour l'unicité sans deviner le pays.
test("normalizePhone conserve l'indicatif et supprime les séparateurs", () => {
  assert.equal(normalizePhone("+243 812-345-678"), "+243812345678");
  assert.equal(normalizePhone("(081) 234 5678"), "0812345678");
  assert.equal(normalizePhone("123"), null);
});

// Le décompte quotidien suit le calendrier configuré plutôt que le fuseau de la machine.
test("getEventDayNumber calcule le jour dans le fuseau de l'événement", () => {
  assert.equal(getEventDayNumber(new Date("2026-11-14T23:00:00Z"), "2026-11-15", "Africa/Kinshasa"), 1);
  assert.equal(getEventDayNumber(new Date("2026-11-14T23:00:00Z"), "2026-11-15", "UTC"), 0);
  assert.equal(getEventDayNumber(new Date("2026-12-05T12:00:00Z"), "2026-11-15", "UTC"), 21);
});

// Le serveur refuse les jours futurs même si une requête falsifie le navigateur.
test("isEventDayAvailable ne valide jamais un jour futur ni un jour hors période", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  assert.equal(isEventDayAvailable(2, now, "2026-11-15", "UTC"), true);
  assert.equal(isEventDayAvailable(3, now, "2026-11-15", "UTC"), false);
  assert.equal(isEventDayAvailable(22, now, "2026-11-15", "UTC"), false);
});

// Une empreinte SHA-256 est déterministe afin de retrouver un cookie sans stocker son secret.
test("hashSessionToken produit une empreinte hexadécimale stable", () => {
  assert.match(hashSessionToken("secret-session"), /^[a-f0-9]{64}$/);
  assert.equal(hashSessionToken("secret-session"), hashSessionToken("secret-session"));
});
