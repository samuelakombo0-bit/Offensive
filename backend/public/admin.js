// Les requêtes d'administration utilisent le cookie HttpOnly, jamais un jeton stocké dans le navigateur.
async function adminApi(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  let payload = null;
  if (response.status !== 204) {
    try {
      payload = await response.json();
    } catch {
      throw new Error("Le serveur a renvoyé une réponse illisible.");
    }
  }
  if (!response.ok) throw new Error(payload?.error?.message || "La requête n’a pas abouti.");
  return payload;
}

const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const dashboard = document.querySelector("#dashboard");
const adminAccount = document.querySelector("#admin-account");
const globalStatus = document.querySelector("#global-status");
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
let testimonialPage = 1;
let participantPage = 1;
let auditPage = 1;

// Les valeurs fournies par l'API sont affectées à textContent pour neutraliser tout balisage reçu.
function showMessage(element, message) {
  element.textContent = message;
}

function renderEmpty(container, message) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  container.replaceChildren(empty);
}

function addPagination(container, page, total, pageSize, onPageChange) {
  container.replaceChildren();
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return;

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "button button-secondary";
  previous.textContent = "Précédent";
  previous.disabled = page <= 1;
  previous.addEventListener("click", () => onPageChange(page - 1));

  const next = document.createElement("button");
  next.type = "button";
  next.className = "button button-secondary";
  next.textContent = "Suivant";
  next.disabled = page >= pageCount;
  next.addEventListener("click", () => onPageChange(page + 1));

  const current = document.createElement("span");
  current.textContent = `Page ${page} sur ${pageCount}`;
  container.append(previous, current, next);
}

// Les nombres du tableau de bord sont calculés par le serveur à partir des enregistrements.
async function loadDashboard() {
  try {
    const stats = await adminApi("/api/admin/dashboard");
    document.querySelectorAll("[data-stat]").forEach((element) => {
      element.textContent = Number(stats[element.dataset.stat]).toLocaleString("fr-FR");
    });
    const chart = document.querySelector("#checkin-chart");
    const counts = new Map(stats.checkinsByDay.map((entry) => [entry.day, entry.count]));
    const maxParticipants = Math.max(1, stats.participants);
    const bars = Array.from({ length: 21 }, (_, index) => {
      const day = index + 1;
      const item = document.createElement("div");
      const label = document.createElement("span");
      const progress = document.createElement("progress");
      const count = document.createElement("strong");
      const value = counts.get(day) || 0;
      item.className = "chart-item";
      label.textContent = `Jour ${day}`;
      progress.max = maxParticipants;
      progress.value = value;
      progress.setAttribute("aria-label", `${value} validation(s) au jour ${day}`);
      count.textContent = String(value);
      item.append(label, progress, count);
      return item;
    });
    chart.replaceChildren(...bars);
  } catch (error) {
    showMessage(globalStatus, `Statistiques indisponibles : ${error.message}`);
  }
}

function makeRecordButton(label, className, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `button ${className}`;
  button.textContent = label;
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await action();
    } catch (error) {
      showMessage(globalStatus, `Action impossible : ${error.message}`);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

async function updateTestimonial(id, status, message) {
  await adminApi(`/api/admin/testimonials/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...(message === undefined ? {} : { message }) }),
  });
  showMessage(globalStatus, "Statut du témoignage mis à jour.");
  await Promise.all([loadTestimonials(testimonialPage), loadDashboard()]);
}

async function deleteTestimonial(id) {
  if (!window.confirm("Supprimer définitivement ce témoignage et son image privée ?")) return;
  await adminApi(`/api/admin/testimonials/${id}`, { method: "DELETE" });
  showMessage(globalStatus, "Témoignage supprimé.");
  await Promise.all([loadTestimonials(testimonialPage), loadDashboard()]);
}

// Le panneau de modération ne rend visibles les images en attente qu'après authentification.
async function loadTestimonials(page = 1) {
  const list = document.querySelector("#testimonial-list");
  const pagination = document.querySelector("#testimonial-pagination");
  const status = document.querySelector("#testimonial-status-filter").value;
  const search = document.querySelector("#testimonial-search").value.trim();
  try {
    const result = await adminApi("/api/admin/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, page, search }),
    });
    testimonialPage = result.page;
    if (result.items.length === 0) {
      renderEmpty(list, "Aucun témoignage ne correspond à ce filtre.");
      pagination.replaceChildren();
      return;
    }

    const cards = result.items.map((item) => {
      const card = document.createElement("article");
      const metadata = document.createElement("div");
      const author = document.createElement("span");
      const badge = document.createElement("span");
      const message = document.createElement("p");
      const actions = document.createElement("div");
      card.className = "record-card";
      metadata.className = "record-meta";
      actions.className = "record-actions";
      author.textContent = `Envoyé par ${item.author} · ${dateFormat.format(new Date(item.createdAt))}`;
      badge.className = "status-pill";
      badge.dataset.status = item.status;
      badge.textContent = { EN_ATTENTE: "En attente", APPROUVE: "Approuvé", REFUSE: "Refusé" }[item.status];
      message.textContent = item.message;
      metadata.append(author, badge);
      card.append(metadata, message);

      if (item.imageUrl) {
        const image = document.createElement("img");
        image.src = item.imageUrl;
        image.alt = "Image privée jointe au témoignage";
        image.loading = "lazy";
        card.append(image);
      }

      const editor = document.createElement("details");
      const summary = document.createElement("summary");
      const textarea = document.createElement("textarea");
      const saveEdit = makeRecordButton("Enregistrer le texte", "button-secondary", async () => {
        await updateTestimonial(item.id, item.status, textarea.value);
      });
      editor.className = "record-editor";
      summary.textContent = "Modifier le texte";
      textarea.setAttribute("aria-label", "Texte du témoignage");
      textarea.maxLength = 1000;
      textarea.value = item.message;
      editor.append(summary, textarea, saveEdit);
      card.append(editor);

      if (item.status !== "APPROUVE") {
        actions.append(makeRecordButton("Approuver", "button-approve", () => updateTestimonial(item.id, "APPROUVE")));
      }
      if (item.status !== "REFUSE") {
        actions.append(makeRecordButton("Refuser", "button-danger", () => updateTestimonial(item.id, "REFUSE")));
      }
      actions.append(makeRecordButton("Supprimer", "button-danger", () => deleteTestimonial(item.id)));
      card.append(actions);
      return card;
    });

    list.replaceChildren(...cards);
    addPagination(pagination, result.page, result.total, result.pageSize, loadTestimonials);
  } catch (error) {
    renderEmpty(list, `Impossible de charger les témoignages : ${error.message}`);
  }
}

// Chaque ligne ne montre les coordonnées qu'à l'administrateur authentifié et valide les modifications côté serveur.
async function loadParticipants(page = 1) {
  const list = document.querySelector("#participant-list");
  const pagination = document.querySelector("#participant-pagination");
  const search = document.querySelector("#participant-search").value.trim();
  try {
    const result = await adminApi("/api/admin/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, search }),
    });
    participantPage = result.page;
    if (result.items.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "Aucun participant ne correspond à cette recherche.";
      row.append(cell);
      list.replaceChildren(row);
      pagination.replaceChildren();
      return;
    }

    const rows = result.items.map((participant) => {
      const row = document.createElement("tr");
      const nameCell = document.createElement("td");
      const phoneCell = document.createElement("td");
      const engagementsCell = document.createElement("td");
      const checkinsCell = document.createElement("td");
      const createdCell = document.createElement("td");
      const actionCell = document.createElement("td");
      const form = document.createElement("form");
      const firstName = document.createElement("input");
      const lastName = document.createElement("input");
      const phone = document.createElement("input");
      const save = document.createElement("button");

      nameCell.textContent = `${participant.firstName} ${participant.lastName}`;
      phoneCell.textContent = participant.phone;
      engagementsCell.textContent = String(participant.engagements);
      checkinsCell.textContent = String(participant.checkins);
      createdCell.textContent = dateFormat.format(new Date(participant.createdAt));
      form.className = "participant-edit";
      form.method = "post";
      firstName.setAttribute("aria-label", "Prénom");
      firstName.value = participant.firstName;
      lastName.setAttribute("aria-label", "Nom");
      lastName.value = participant.lastName;
      phone.setAttribute("aria-label", "Téléphone");
      phone.type = "tel";
      phone.value = participant.phone;
      save.type = "submit";
      save.className = "button button-secondary";
      save.textContent = "Enregistrer";
      form.append(firstName, lastName, phone, save);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        save.disabled = true;
        try {
          await adminApi(`/api/admin/participants/${participant.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName: firstName.value, lastName: lastName.value, phone: phone.value }),
          });
          showMessage(globalStatus, "Participant mis à jour.");
          await loadParticipants(participantPage);
        } catch (error) {
          showMessage(globalStatus, `Modification impossible : ${error.message}`);
        } finally {
          save.disabled = false;
        }
      });
      const deleteButton = makeRecordButton("Supprimer", "button-danger", async () => {
        if (!window.confirm("Supprimer ce participant, ses cartes, son suivi et ses témoignages ?")) return;
        await adminApi(`/api/admin/participants/${participant.id}`, { method: "DELETE" });
        showMessage(globalStatus, "Participant et données associées supprimés.");
        await Promise.all([loadParticipants(participantPage), loadDashboard(), loadTestimonials(testimonialPage)]);
      });
      actionCell.append(form, deleteButton);
      row.append(nameCell, phoneCell, engagementsCell, checkinsCell, createdCell, actionCell);
      return row;
    });

    list.replaceChildren(...rows);
    addPagination(pagination, result.page, result.total, result.pageSize, loadParticipants);
  } catch (error) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = `Impossible de charger les participants : ${error.message}`;
    row.replaceChildren(cell);
    list.replaceChildren(row);
  }
}

// Le journal fournit une trace des décisions sans stocker les mots de passe ni les sessions.
async function loadAudit(page = 1) {
  const list = document.querySelector("#audit-list");
  const pagination = document.querySelector("#audit-pagination");
  try {
    const result = await adminApi(`/api/admin/audit-log?page=${page}`);
    auditPage = result.page;
    if (result.items.length === 0) {
      renderEmpty(list, "Aucune action administrative enregistrée.");
      pagination.replaceChildren();
      return;
    }
    const records = result.items.map((item) => {
      const record = document.createElement("article");
      const detail = document.createElement("p");
      const date = document.createElement("time");
      record.className = "record-card";
      detail.textContent = `${item.admin} · ${item.action} · ${item.target} ${item.targetId || ""}${item.details ? ` · ${item.details}` : ""}`;
      date.dateTime = new Date(item.date).toISOString();
      date.textContent = dateFormat.format(new Date(item.date));
      record.append(detail, date);
      return record;
    });
    list.replaceChildren(...records);
    addPagination(pagination, result.page, result.total, result.pageSize, loadAudit);
  } catch (error) {
    renderEmpty(list, `Impossible de charger le journal : ${error.message}`);
  }
}

function createDevotionalForm({ id, labelText, value, published, field, url, maxLength, rows }) {
  const form = document.createElement("form");
  const label = document.createElement("label");
  const textarea = document.createElement("textarea");
  const controls = document.createElement("div");
  const publishLabel = document.createElement("label");
  const checkbox = document.createElement("input");
  const button = document.createElement("button");
  const status = document.createElement("span");

  form.className = "devotional-item-form";
  form.method = "post";
  label.htmlFor = `${id}-content`;
  label.textContent = labelText;
  textarea.id = `${id}-content`;
  textarea.name = field;
  textarea.rows = rows;
  textarea.maxLength = maxLength;
  textarea.value = value;
  checkbox.type = "checkbox";
  checkbox.id = `${id}-published`;
  checkbox.checked = published;
  publishLabel.htmlFor = checkbox.id;
  publishLabel.append(checkbox, document.createTextNode(" Publier sur le site"));
  controls.className = "devotional-form-controls";
  button.type = "submit";
  button.className = "button button-secondary";
  button.textContent = "Enregistrer";
  status.className = "devotional-item-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  controls.append(publishLabel, button);
  form.append(label, textarea, controls, status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = "Enregistrement…";
    try {
      const result = await adminApi(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: textarea.value, published: checkbox.checked }),
      });
      status.textContent = result.published ? "Publié sur le site." : "Enregistré en brouillon.";
      showMessage(globalStatus, `${labelText} enregistré.`);
    } catch (error) {
      status.textContent = `Enregistrement impossible : ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });

  return form;
}

async function loadDevotionalEditor() {
  const editor = document.querySelector("#devotional-editor");
  const status = document.querySelector("#devotional-editor-status");
  try {
    const result = await adminApi("/api/admin/devotional");
    const weeks = result.weeks.map((week) => {
      const firstDay = (week.week - 1) * 7 + 1;
      const card = document.createElement("article");
      const heading = document.createElement("h3");
      const range = document.createElement("p");
      const themeForm = createDevotionalForm({
        id: `week-${week.week}`,
        labelText: "Thème de la semaine",
        value: week.theme,
        published: week.published,
        field: "theme",
        url: `/api/admin/devotional/weeks/${week.week}`,
        maxLength: 240,
        rows: 2,
      });
      const days = document.createElement("div");
      const weekDays = result.days.filter((day) => day.day >= firstDay && day.day < firstDay + 7);

      card.className = "devotional-week-editor";
      heading.textContent = `Semaine ${week.week}`;
      range.textContent = `Jours ${firstDay} à ${firstDay + 6}`;
      range.className = "devotional-week-range";
      days.className = "devotional-day-list";
      card.append(heading, range, themeForm);

      weekDays.forEach((day) => {
        const dayForm = createDevotionalForm({
          id: `day-${day.day}`,
          labelText: `Jour ${day.day} — pensée ou verset`,
          value: day.content,
          published: day.published,
          field: "content",
          url: `/api/admin/devotional/days/${day.day}`,
          maxLength: 3000,
          rows: 3,
        });
        days.append(dayForm);
      });

      card.append(days);
      return card;
    });
    editor.replaceChildren(...weeks);
    status.textContent = "";
  } catch (error) {
    status.textContent = `Impossible de charger le programme : ${error.message}`;
  }
}

// Une session est vérifiée par le serveur avant d'afficher les données confidentielles du panneau.
async function showDashboard(admin) {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  adminAccount.hidden = false;
  document.querySelector("#admin-name").textContent = `${admin.name} · ${admin.email}`;
  await Promise.all([loadDashboard(), loadTestimonials(), loadParticipants(), loadAudit(), loadDevotionalEditor()]);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(loginStatus, "Connexion…");
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const data = await adminApi("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginForm.elements.email.value,
        password: loginForm.elements.password.value,
      }),
    });
    loginForm.reset();
    await showDashboard(data.admin);
  } catch (error) {
    showMessage(loginStatus, `Connexion impossible : ${error.message}`);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await adminApi("/api/admin/logout", { method: "POST" });
  } catch (error) {
    showMessage(globalStatus, `Déconnexion serveur non confirmée : ${error.message}`);
    return;
  }
  dashboard.hidden = true;
  adminAccount.hidden = true;
  loginPanel.hidden = false;
  showMessage(loginStatus, "Vous êtes déconnecté.");
});

document.querySelector("#testimonial-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  loadTestimonials(1);
});
document.querySelector("#testimonial-status-filter").addEventListener("change", () => loadTestimonials(1));
document.querySelector("#participant-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  loadParticipants(1);
});

adminApi("/api/admin/session")
  .then(({ admin }) => showDashboard(admin))
  .catch(() => {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    adminAccount.hidden = true;
  });
