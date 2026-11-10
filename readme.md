# Grande Offensive 2026

Site vitrine de la **31e Grande Offensive de jeûne et prière**, qui se déroule du **15 novembre au 5 décembre 2026**.

- **Thème :** « Le pouvoir de la Parole »
- **Référence :** Matthieu 12:37
- **Identité mise en avant :** Apôtre Germain Ndeke

Le site centralise les informations de l’événement et facilite la participation. Il complète les échanges sur WhatsApp et les réseaux sociaux, sans les remplacer.

## Lancer le site

Le projet utilise uniquement HTML, CSS et JavaScript natifs. Il n’y a ni dépendance à installer ni serveur backend.

1. Ouvrir le dossier du projet dans VS Code.
2. Lancer `index.html` avec l’extension Live Server. Le navigateur doit servir le site en HTTP pour pouvoir charger `liensCarte.json`; l’ouverture directe du fichier HTML ne permet pas toujours cette lecture.

## Fonctionnalités présentes

- Accueil avec thème, dates et compte à rebours.
- Navigation adaptée au mobile et liens vers les sections.
- Présentation de l’Offensive, de son ouverture à tous et de la vision « Implanter les églises ».
- Section thème et livret avec aperçu visuel animé et emplacements pour les 21 jours.
- Conseils de jeûne, avec contenus santé à compléter après validation médicale.
- Formulaire local qui génère un visuel téléchargeable et prépare un partage WhatsApp.
- Suivi personnel des 21 jours enregistré dans le navigateur.
- Recherche dans la liste locale des assemblées de `liensCarte.json` et affichage de leur carte Google Maps à la sélection.
- Téléchargement de l’affiche et des visuels présents dans le projet.
- Sections pour les médias, les témoignages, la FAQ et les informations pratiques.
- Mode clair/sombre et pied de page avec liens de navigation.

## Limites du MVP et contenus à fournir

Ce MVP est entièrement statique : aucune donnée de formulaire n’est envoyée à l’organisation.

- **Engagement :** le formulaire crée le visuel dans le navigateur. Le texte préparé pour WhatsApp ne joint pas automatiquement l’image.
- **Compteur public :** non connecté à un système de collecte ; les chiffres ne sont pas disponibles.
- **Suivi des jours :** sauvegardé uniquement dans le navigateur et sur l’appareil utilisés.
- **Livret :** les pensées ou versets des 21 jours, les trois thèmes hebdomadaires et les informations d’achat ou de téléchargement restent à confirmer.
- **Conseils santé :** les informations sur l’alimentation, les précautions et les cas particuliers doivent être validées par les médecins concernés avant publication.
- **Assemblées :** les noms et liens de carte sont stockés localement dans `liensCarte.json`. Les adresses, horaires, contacts et référents manquants restent à fournir.
- **Médias et témoignages :** les emplacements sont prévus, mais aucun contenu officiel ni formulaire de soumission modérée n’est intégré.
- **Contact et réseaux :** les coordonnées générales et les liens officiels de l’Offensive restent à confirmer.

Ne pas publier de contenu officiel, de recommandation médicale ou de donnée manquante sans validation des responsables concernés.

## Fichiers du projet

| Fichier ou dossier | Rôle |
| --- | --- |
| `index.html` | Contenu des pages, formulaires et interactions JavaScript |
| `style.css` | Mise en page, styles responsive, animations et thèmes clair/sombre |
| `liensCarte.json` | Noms et liens d’intégration Google Maps des assemblées |
| `affiche-offensive-2026.jpg` | Affiche de la 31e édition |
| `img/` | Logo et visuels fournis |
| `.gitignore` | Fichiers locaux et fichiers système exclus de Git |

## Cahier des charges

### Objectif

Permettre à toute personne, membre ou non, de comprendre l’Offensive, de s’y engager et de la vivre pendant les 21 jours.

### Parcours et contenus prévus

1. **Accueil :** affiche officielle, thème, dates, compte à rebours et accès à l’engagement.
2. **Comprendre l’Offensive :** définition, historique, ouverture à tous, vision et message du Président du Conseil.
3. **Thème et livret :** présentation du livret, pensée ou verset quotidien, thèmes hebdomadaires et modalités d’accès au livret.
4. **Conseils de jeûne :** repères spirituels, informations santé validées et cas particuliers.
5. **Engagement :** formulaire simple, visuel à partager, compteur public et suivi des 21 jours.
6. **Médias :** spot, vidéos, podcasts, réels, témoignages, interviews et récapitulatifs des assemblées.
7. **Assemblées :** liste avec adresses, horaires, contacts et référents, ainsi qu’une carte.
8. **Kit :** affiches, visuels pour WhatsApp, bannières, logos et textes à partager.
9. **Témoignages :** textes, photos ou vidéos, après modération.
10. **Informations pratiques :** contact, FAQ, réseaux sociaux et invitation à partager.

### Conditions de réalisation

- Priorité aux smartphones et aux connexions faibles.
- Partage facile vers WhatsApp.
- Parcours d’engagement simple, sans création de compte.
- Français ; lingala ou kituba pour les messages clés si nécessaire.
- Gestion des contenus par un responsable et des contributeurs désignés.

### Éléments à décider avec le Conseil de la Vision

- Validation des contenus et gestion du site.
- Nom de domaine et budget d’hébergement.
- Données personnelles collectées et modalités de protection.
- Date de mise en ligne.

### Évolutions possibles — à valider

Carte des engagés, messages quotidiens WhatsApp, quiz ou défi sur la Parole, direct de clôture et espace de bilan après l’Offensive. Ces fonctionnalités ne font pas partie du MVP actuel.

## Règles du projet

- HTML5, CSS3 et JavaScript natif uniquement.
- Pas de backend pour le MVP.
- Respect du cahier des charges et absence de contenus officiels inventés.
- Design responsive, léger et centré sur l’identité de l’Apôtre Germain Ndeke.
- Toute évolution importante est soumise à validation.

**Méthode de travail :** Cahier des charges → MVP → Présentation au client → Retours → Décisions → Évolutions.
