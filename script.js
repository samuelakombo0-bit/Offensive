const menuToggle = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".primary-navigation");
    const menuLabel = document.querySelector(".menu-label");

    function closeMenu(returnFocus = false) {
      menuToggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
      menuLabel.textContent = "Menu";
      if (returnFocus) menuToggle.focus();
    }

    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      navigation.classList.toggle("is-open", !isExpanded);
      menuLabel.textContent = isExpanded ? "Menu" : "Fermer";
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      }
    });

    window.matchMedia("(min-width: 68.75rem)").addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });

    const themeToggle = document.querySelector("#theme-toggle");
    const themeToggleLabel = document.querySelector("#theme-toggle-label");
    const themeStatus = document.querySelector("#theme-status");
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    function updateThemeControl() {
      const isDark = document.documentElement.dataset.theme === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "Activer le mode clair" : "Activer le mode sombre");
      themeToggleLabel.textContent = isDark ? "Mode clair" : "Mode sombre";
      themeColorMeta.content = isDark ? "#10182b" : "#2146b3";
    }

    updateThemeControl();
    if (window.themePreferenceError) {
      themeStatus.textContent = "Le thème suit votre appareil ; votre préférence ne peut pas être mémorisée dans ce navigateur.";
    }

    themeToggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      updateThemeControl();
      themeStatus.textContent = "";

      try {
        localStorage.setItem("offensive-theme", nextTheme);
      } catch (error) {
        themeStatus.textContent = `Le thème est modifié, mais la préférence n’a pas pu être mémorisée : ${error.message}`;
      }
    });

    const presidentMessageOpen = document.querySelector("#president-message-open");
    const presidentMessageDialog = document.querySelector("#president-message-dialog");

    presidentMessageOpen.addEventListener("click", () => presidentMessageDialog.showModal());

    const assemblySearch = document.querySelector("#assembly-search");
    const assemblyList = document.querySelector("#assembly-list");
    const assemblyEmpty = document.querySelector("#assembly-empty");
    const assemblySearchStatus = document.querySelector("#assembly-search-status");
    const assemblyMap = document.querySelector("#assembly-map-frame");
    const mapPlaceholderContent = document.querySelector("#map-placeholder-content");
    const mapPanel = document.querySelector(".map-placeholder");
    let assemblyLocations = [];

    function hideAssemblyMap() {
      assemblyMap.removeAttribute("src");
      delete assemblyMap.dataset.assemblyName;
      assemblyMap.title = "Carte de l’assemblée sélectionnée";
      assemblyMap.hidden = true;
      mapPlaceholderContent.hidden = false;
      mapPanel.classList.remove("is-showing-map");
    }

    function showAssemblyMap(assembly) {
      if (assemblyMap.dataset.assemblyName !== assembly.nom) {
        assemblyMap.src = assembly.lienIntegrationCarte;
        assemblyMap.dataset.assemblyName = assembly.nom;
      }
      assemblyMap.title = `Carte Google Maps : ${assembly.nom}`;
      assemblyMap.hidden = false;
      mapPlaceholderContent.hidden = true;
      mapPanel.classList.add("is-showing-map");
      assemblyList.querySelectorAll("[data-assembly-map]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item.dataset.assemblyMap === assembly.nom));
      });
    }

    function renderAssemblyList() {
      const query = assemblySearch.value.trim().toLocaleLowerCase("fr");
      assemblyList.querySelectorAll(".assembly-card").forEach((card) => card.remove());

      if (!query) {
        assemblyEmpty.hidden = true;
        assemblySearchStatus.textContent = "Saisissez un nom d’assemblée pour lancer la recherche.";
        hideAssemblyMap();
        return;
      }

      const matches = assemblyLocations.filter((assembly) => assembly.nom.toLocaleLowerCase("fr").includes(query));

      for (const assembly of matches) {
        const card = document.createElement("article");
        const source = document.createElement("p");
        const title = document.createElement("h3");
        const button = document.createElement("button");
        card.className = "assembly-card";
        source.className = "assembly-source";
        source.textContent = "Carte Google Maps";
        title.textContent = assembly.nom;
        button.className = "assembly-map-button";
        button.type = "button";
        button.dataset.assemblyMap = assembly.nom;
        button.setAttribute("aria-pressed", String(assemblyMap.dataset.assemblyName === assembly.nom && !assemblyMap.hidden));
        button.textContent = "Afficher la carte";
        card.append(source, title);

        if (assembly.adresse) {
          const address = document.createElement("address");
          address.textContent = assembly.adresse;
          card.append(address);
        }
        if (Array.isArray(assembly.telephones) && assembly.telephones.length) {
          const phoneLine = document.createElement("p");
          phoneLine.append(document.createTextNode("Téléphones : "));
          assembly.telephones.forEach((phone, index) => {
            if (index) phoneLine.append(document.createTextNode(" · "));
            const phoneLink = document.createElement("a");
            phoneLink.href = `tel:${phone.replace(/[^+\d]/g, "")}`;
            phoneLink.textContent = phone;
            phoneLine.append(phoneLink);
          });
          card.append(phoneLine);
        }
        if (assembly.reseaux) {
          const socialLine = document.createElement("p");
          socialLine.textContent = `Réseaux : ${assembly.reseaux}`;
          card.append(socialLine);
        }
        card.append(button);
        assemblyList.insertBefore(card, assemblyEmpty);
      }

      assemblyEmpty.hidden = matches.length > 0;
      assemblySearchStatus.textContent = `${matches.length} assemblée${matches.length === 1 ? "" : "s"} trouvée${matches.length === 1 ? "" : "s"}.`;
      if (matches.length === 1) {
        showAssemblyMap(matches[0]);
      } else {
        hideAssemblyMap();
      }
    }

    assemblySearch.addEventListener("input", renderAssemblyList);
    assemblyList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-assembly-map]");
      if (!button) return;

      const assembly = assemblyLocations.find((item) => item.nom === button.dataset.assemblyMap);
      if (!assembly) return;
      showAssemblyMap(assembly);
      assemblySearchStatus.textContent = `Carte affichée : ${assembly.nom}.`;
    });

    async function loadAssemblyLocations() {
      try {
        const response = await fetch("./liensCarte.json");
        if (!response.ok) throw new Error("Le fichier des assemblées est introuvable.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Le fichier doit contenir une liste d’assemblées.");
        assemblyLocations = data.filter((assembly) => {
          if (typeof assembly.nom !== "string" || typeof assembly.lienIntegrationCarte !== "string") return false;
          try {
            const mapUrl = new URL(assembly.lienIntegrationCarte);
            return mapUrl.protocol === "https:" && mapUrl.hostname === "www.google.com" && mapUrl.pathname === "/maps/embed";
          } catch {
            return false;
          }
        });
        if (!assemblyLocations.length) throw new Error("Aucune entrée Google Maps valide n’a été trouvée.");
        renderAssemblyList();
      } catch (error) {
        assemblyEmpty.hidden = false;
        assemblyEmpty.textContent = "La liste n’a pas pu être chargée. Ouvrez le site avec Live Server pour lire le fichier JSON.";
        assemblySearchStatus.textContent = `Chargement impossible : ${error.message}`;
      }
    }

    loadAssemblyLocations();

    const invitationText = [
      "Je vous invite à la 31e Grande Offensive de jeûne et prière.",
      "Thème : « Le pouvoir de la Parole » (Matthieu 12:37).",
      "Du 15 novembre au 5 décembre 2026."
    ];
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      invitationText.push(window.location.href.split("#")[0]);
    }
    const invitationMessage = invitationText.join("\n");
    const copyStatus = document.querySelector("#copy-status");
    const shareStatus = document.querySelector("#share-status");
    const kitWhatsappInvite = document.querySelector("#kit-whatsapp-invite");

    kitWhatsappInvite.href = `https://wa.me/?text=${encodeURIComponent(invitationMessage)}`;

    async function copyInvitation() {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(invitationMessage);
        return;
      }

      const temporaryField = document.createElement("textarea");
      temporaryField.value = invitationMessage;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "fixed";
      temporaryField.style.opacity = "0";
      document.body.append(temporaryField);
      temporaryField.select();
      const copied = document.execCommand("copy");
      temporaryField.remove();
      if (!copied) throw new Error("Le navigateur n’a pas autorisé la copie.");
    }

    document.querySelector("[data-copy-invitation]").addEventListener("click", async () => {
      copyStatus.textContent = "";
      try {
        await copyInvitation();
        copyStatus.textContent = "Texte d’invitation copié.";
      } catch (error) {
        copyStatus.textContent = `Impossible de copier le texte : ${error.message}`;
      }
    });

    document.querySelector("[data-share-invitation]").addEventListener("click", () => {
      shareStatus.textContent = "Ouverture de WhatsApp avec le texte d’invitation. L’adresse du site sera incluse une fois le site publié.";
      window.open(`https://wa.me/?text=${encodeURIComponent(invitationMessage)}`, "_blank", "noopener,noreferrer");
    });

    const engagementForm = document.querySelector("#engagement-form");
    const engagementStatus = document.querySelector("#engagement-status");
    const engagementResult = document.querySelector("#engagement-result");
    const engagementCanvas = document.querySelector("#engagement-canvas");
    const downloadCard = document.querySelector("#download-card");
    const shareCard = document.querySelector("#share-card");
    let cardImageUrl = "";

    function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
      const lines = [];
      let line = "";

      for (const word of text.split(/\s+/)) {
        let remainingWord = word;
        while (remainingWord && context.measureText(`${line}${line ? " " : ""}${remainingWord}`).width > maxWidth) {
          if (line) {
            lines.push(line);
            line = "";
          } else {
            let fittingPart = "";
            while (remainingWord && context.measureText(remainingWord[0]).width <= maxWidth) {
              const nextPart = fittingPart + remainingWord[0];
              if (context.measureText(nextPart).width > maxWidth) break;
              fittingPart = nextPart;
              remainingWord = remainingWord.slice(1);
            }
            if (!fittingPart) {
              fittingPart = remainingWord[0];
              remainingWord = remainingWord.slice(1);
            }
            lines.push(fittingPart);
          }
        }
        if (remainingWord) line = line ? `${line} ${remainingWord}` : remainingWord;
      }

      if (line) lines.push(line);
      lines.forEach((textLine, index) => context.fillText(textLine, x, y + index * lineHeight));
      return y + lines.length * lineHeight;
    }

    engagementForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      engagementStatus.textContent = "";
      engagementResult.hidden = true;

      const formData = new FormData(engagementForm);
      const name = formData.get("name").trim();
      const location = formData.get("location").trim();
      const duration = Number(formData.get("duration"));

      if (!name || !location || !Number.isInteger(duration) || duration < 1 || duration > 21) {
        engagementStatus.textContent = "Vérifiez votre prénom, votre assemblée ou ville et une durée de 1 à 21 jours.";
        return;
      }

      const context = engagementCanvas.getContext("2d");
      if (!context) {
        engagementStatus.textContent = "La création du visuel n’est pas prise en charge par ce navigateur.";
        return;
      }

      context.fillStyle = "#10245f";
      context.fillRect(0, 0, engagementCanvas.width, engagementCanvas.height);
      const goldGlow = context.createRadialGradient(810, 250, 20, 810, 250, 720);
      goldGlow.addColorStop(0, "rgba(255, 211, 100, 0.3)");
      goldGlow.addColorStop(1, "rgba(255, 211, 100, 0)");
      context.fillStyle = goldGlow;
      context.fillRect(0, 0, engagementCanvas.width, engagementCanvas.height);
      context.strokeStyle = "#f3c84b";
      context.lineWidth = 12;
      context.strokeRect(40, 40, engagementCanvas.width - 80, engagementCanvas.height - 80);

      context.textAlign = "center";
      context.fillStyle = "#ffe08a";
      context.font = "700 36px Arial, sans-serif";
      context.fillText("31e GRANDE OFFENSIVE", 540, 190);
      context.font = "900 74px Arial, sans-serif";
      context.fillText("LE POUVOIR", 540, 390);
      context.fillText("DE LA PAROLE", 540, 480);
      context.fillStyle = "#ffffff";
      context.font = "700 34px Arial, sans-serif";
      context.fillText("Matthieu 12:37", 540, 560);
      context.strokeStyle = "rgba(255, 255, 255, 0.55)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(170, 630);
      context.lineTo(910, 630);
      context.stroke();
      context.fillStyle = "#ffffff";
      context.font = "700 32px Arial, sans-serif";
      context.fillText("JE M’ENGAGE", 540, 735);
      context.fillStyle = "#ffe08a";
      context.font = "900 64px Arial, sans-serif";
      const nameBottom = drawWrappedText(context, name, 540, 850, 820, 76);
      context.fillStyle = "#ffffff";
      context.font = "600 34px Arial, sans-serif";
      const locationBottom = drawWrappedText(context, location, 540, nameBottom + 44, 820, 48);
      context.fillStyle = "#ffe08a";
      context.font = "700 32px Arial, sans-serif";
      context.fillText(`${duration} jour${duration > 1 ? "s" : ""} de jeûne`, 540, Math.max(1090, locationBottom + 32));
      context.fillStyle = "#ffffff";
      context.font = "500 28px Arial, sans-serif";
      context.fillText("15 novembre → 5 décembre 2026", 540, 1200);
      context.font = "500 24px Arial, sans-serif";
      context.fillText("Avec l’Apôtre Germain Ndeke", 540, 1260);

      try {
        const imageBlob = await new Promise((resolve) => engagementCanvas.toBlob(resolve, "image/png"));
        if (!imageBlob) throw new Error("Impossible de générer l’image.");

        if (cardImageUrl) URL.revokeObjectURL(cardImageUrl);
        cardImageUrl = URL.createObjectURL(imageBlob);
        downloadCard.href = cardImageUrl;
        const shareText = `Je m’engage pour ${duration} jour${duration > 1 ? "s" : ""} à la 31e Grande Offensive « Le pouvoir de la Parole ». Matthieu 12:37`;
        shareCard.href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        engagementResult.hidden = false;
        engagementStatus.textContent = "Visuel créé. Téléchargez-le puis joignez-le à votre message WhatsApp si vous le souhaitez.";
      } catch (error) {
        engagementStatus.textContent = `Impossible de créer le visuel : ${error.message}`;
      }
    });

    const checkinGrid = document.querySelector("#checkin-grid");
    const checkinProgress = document.querySelector("#checkin-progress");
    const checkinStatus = document.querySelector("#checkin-status");
    const checkinStorageKey = "offensive-2026-checkin";
    let checkedDays = Array(21).fill(false);

    function isCheckinDayAvailable(index) {
      const eventDay = new Date(2026, 10, 15 + index);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDay <= today;
    }

    function updateCheckinProgress() {
      const completed = checkedDays.filter(Boolean).length;
      checkinProgress.textContent = `${completed} jour${completed === 1 ? "" : "s"} coché${completed === 1 ? "" : "s"} sur 21`;
    }

    try {
      const savedDays = localStorage.getItem(checkinStorageKey);
      if (savedDays) {
        const parsedDays = JSON.parse(savedDays);
        if (!Array.isArray(parsedDays) || parsedDays.length !== 21 || parsedDays.some((day) => typeof day !== "boolean")) {
          throw new Error("Le suivi enregistré est invalide.");
        }
        checkedDays = parsedDays.map((isChecked, index) => isChecked && isCheckinDayAvailable(index));
      }
    } catch (error) {
      checkinStatus.textContent = `Le suivi local n’a pas pu être lu : ${error.message}`;
    }

    const checkinDateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
    for (let index = 0; index < 21; index++) {
      const date = new Date(2026, 10, 15 + index);
      const dayContainer = document.createElement("div");
      const checkbox = document.createElement("input");
      const label = document.createElement("label");
      const dayName = document.createElement("strong");
      const dayDate = document.createElement("span");

      dayContainer.className = "checkin-day";
      checkbox.type = "checkbox";
      checkbox.id = `checkin-day-${index + 1}`;
      checkbox.checked = checkedDays[index];
      checkbox.disabled = !isCheckinDayAvailable(index);
      label.htmlFor = checkbox.id;
      dayName.textContent = `Jour ${index + 1}`;
      dayDate.textContent = checkinDateFormat.format(date);
      label.append(dayName, dayDate);
      dayContainer.append(checkbox, label);
      checkinGrid.append(dayContainer);

      checkbox.addEventListener("change", () => {
        checkedDays[index] = checkbox.checked;
        updateCheckinProgress();
        try {
          localStorage.setItem(checkinStorageKey, JSON.stringify(checkedDays));
          checkinStatus.textContent = "";
        } catch (error) {
          checkinStatus.textContent = `Le suivi reste visible jusqu’à la fermeture de cette page, mais n’a pas pu être enregistré : ${error.message}`;
        }
      });
    }

    updateCheckinProgress();
    window.setInterval(() => {
      checkinGrid.querySelectorAll("input").forEach((checkbox, index) => {
        checkbox.disabled = !isCheckinDayAvailable(index);
      });
    }, 60_000);

    const countdown = document.querySelector("#launch-countdown");
    const countdownDays = countdown.querySelector("[data-countdown-days]");
    const countdownHours = countdown.querySelector("[data-countdown-hours]");
    const countdownMinutes = countdown.querySelector("[data-countdown-minutes]");
    const countdownSeconds = countdown.querySelector("[data-countdown-seconds]");
    const secondsGroup = countdownSeconds.parentElement;
    const launchDate = new Date(2026, 10, 15, 0, 0, 0);

    function updateCountdown() {
      const remainingSeconds = Math.max(0, Math.floor((launchDate - Date.now()) / 1000));
      const days = Math.floor(remainingSeconds / 86400);
      const hours = Math.floor((remainingSeconds % 86400) / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      countdownDays.textContent = String(days);
      countdownHours.textContent = String(hours).padStart(2, "0");
      countdownMinutes.textContent = String(minutes).padStart(2, "0");
      countdownSeconds.textContent = String(seconds).padStart(2, "0");
      secondsGroup.classList.remove("is-ticking");
      void secondsGroup.offsetWidth;
      secondsGroup.classList.add("is-ticking");
    }

    updateCountdown();
    window.setInterval(updateCountdown, 1000);
