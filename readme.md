# Grande Offensive 2026

Site vitrine de la **31e Grande Offensive de jeûne et prière**, qui se déroule du **15 novembre au 5 décembre 2026**.

- **Thème :** « Le pouvoir de la Parole »
- **Référence :** Matthieu 12:37
- **Identité mise en avant :** Apôtre Germain Ndeke

Le site centralise les informations de l’événement et facilite la participation. Il complète les échanges sur WhatsApp et les réseaux sociaux, sans les remplacer.

## Lancer le site

Le site public reste utilisable en HTML, CSS et JavaScript natifs, sans service externe. Le mode statique conserve les cartes et le suivi localement ; l’enregistrement serveur, les témoignages et le panneau nécessitent le backend optionnel décrit plus bas.

1. Ouvrir le dossier du projet dans VS Code.
2. Lancer `index.html` avec l’extension Live Server. Le navigateur doit servir le site en HTTP pour pouvoir charger `liensCarte.json`; l’ouverture directe du fichier HTML ne permet pas toujours cette lecture.
3. Pour activer les fonctions serveur, lancer Express et ouvrir le site à `http://localhost:3000` au lieu de Live Server.

## Fonctionnalités présentes

- Accueil avec thème, dates et compte à rebours.
- Navigation adaptée au mobile et liens vers les sections.
- Présentation de l’Offensive, de son ouverture à tous et de la vision « Implanter les églises ».
- Section thème et livret avec aperçu visuel animé et emplacements pour les 21 jours.
- Conseils de jeûne, avec contenus santé à compléter après validation médicale.
- Formulaire qui génère un visuel téléchargeable, prépare un partage WhatsApp et, si le backend fonctionne, enregistre le participant, l’engagement et la carte.
- Suivi des 21 jours sauvegardé localement en mode statique et synchronisé au compte participant lorsque le backend est actif.
- Témoignages écrits ou avec image, conservés en attente avant validation et publication.
- Panneau administrateur pour les statistiques, la modération, les participants et le journal des actions.
- Recherche dans la liste locale des assemblées de `liensCarte.json` et affichage de leur carte Google Maps à la sélection.
- Téléchargement de l’affiche et des visuels présents dans le projet.
- Sections pour les médias, les témoignages, la FAQ et les informations pratiques.
- Mode clair/sombre et pied de page avec liens de navigation.

## Limites du MVP et contenus à fournir

Le mode statique ne transmet aucune donnée. Le backend peut être lancé séparément pour tester la collecte ; la base ne sera connectée que lorsqu’un administrateur aura configuré MySQL.

- **Identité :** le numéro de téléphone est unique, mais n’est pas vérifié par SMS. Le cookie HttpOnly permet de retrouver le participant après fermeture du même navigateur ; si ses cookies sont effacés ou si la personne change d’appareil, elle ne peut pas récupérer le compte par le seul numéro. Cette récupération nécessite une vérification SMS qui n’est pas encore intégrée.
- **Données personnelles :** le nom, le prénom et le numéro sont conservés dans MySQL avec le consentement du participant. Le sujet de prière reste local et n’est pas envoyé au serveur. Avant publication, valider et publier l’information de confidentialité et le responsable du traitement.
- **Conservation :** le consentement annonce une conservation jusqu’à la fin de l’Offensive. La purge globale n’est jamais automatique ; la commande décrite ci-dessous est bloquée avant la fin des 21 jours et exige une confirmation explicite.
- **Engagements et cartes :** chaque création génère un enregistrement d’engagement et de carte ; un participant déjà reconnu dans son navigateur peut en créer plusieurs. Les compteurs publics affichent le nombre de participants et de cartes, pas le nombre d’assemblées.
- **Suivi des jours :** l’unicité SQL empêche de compter plusieurs fois le même jour pour le même participant. Le serveur bloque les validations futures selon le fuseau IANA enregistré sur le compte. Pour l’instant, le formulaire reprend le fuseau du navigateur ; l’API internationale annoncée pourra ensuite proposer le choix du fuseau approprié.
- **Images :** seuls JPEG, PNG et WebP de 5 Mo maximum sont acceptés. Les images sont réencodées, gardées dans le dossier privé local et visibles dans le panneau ; une image n’est publique qu’après approbation du témoignage. Le stockage local est prévu pour le développement et doit être remplacé par un stockage privé persistant avant un déploiement multi-serveur.
- **Administration :** l’interface fournit un seul rôle administrateur, une connexion par mot de passe haché, la modération, la recherche/pagination, les statistiques et un journal. La création du compte se fait depuis le terminal, jamais depuis un formulaire public.
- **Déploiement :** les limites de requêtes sont en mémoire et les fichiers sont sur disque local. Un déploiement à plusieurs instances nécessite un stockage partagé des limites et des fichiers. Utiliser HTTPS, `COOKIE_SECURE=true`, une base protégée et des sauvegardes.
- **Livret :** les pensées ou versets des 21 jours, les trois thèmes hebdomadaires et les informations d’achat ou de téléchargement restent à confirmer.
- **Conseils santé :** les informations sur l’alimentation, les précautions et les cas particuliers doivent être validées par les médecins concernés avant publication.
- **Assemblées :** les noms et liens de carte sont stockés localement dans `liensCarte.json`. Les adresses, horaires, contacts et référents manquants restent à fournir.
- **Médias :** aucun contenu officiel n’est fourni par le backend ; il ne publie que les témoignages approuvés.
- **Contact et réseaux :** les coordonnées générales et les liens officiels de l’Offensive restent à confirmer.

Ne pas publier de contenu officiel, de recommandation médicale ou de donnée manquante sans validation des responsables concernés.

## Fichiers du projet

| Fichier ou dossier | Rôle |
| --- | --- |
| `index.html` | Contenu des pages et formulaires |
| `style.css` | Mise en page, styles responsive, animations et thèmes clair/sombre |
| `theme.js` | Préférence de thème initialisée avant l’affichage de la page |
| `script.js` | Interactions de la page |
| `liensCarte.json` | Noms et liens d’intégration Google Maps des assemblées |
| `backend/prisma/schema.prisma` | Modèle Prisma des tables existantes et des fonctions serveur |
| `backend/prisma/migrations/` | Schéma de base issu du dump et migration des fonctions serveur |
| `backend/server.js` | Démarrage du serveur Express |
| `backend/src/` | API, sessions, modération, validation et stockage privé des images |
| `backend/public/admin.html` | Interface du panneau administrateur |
| `backend/scripts/` | Création interactive de l’administrateur et purge contrôlée |
| `backend/.env.example` | Exemple de configuration locale, sans secrets |
| `affiche-offensive-2026.jpg` | Affiche de la 31e édition |
| `img/` | Logo et visuels fournis |
| `.gitignore` | Fichiers locaux et fichiers système exclus de Git |

## Modèle de données Prisma

`backend/prisma/schema.prisma` utilise Prisma ORM 7.10.1 et le générateur JavaScript CommonJS. Il conserve les tables SQL historiques, et ajoute `engagement`, `carte`, `suivi_journalier`, les sessions, l’état de modération des témoignages et le journal administratif. Les migrations sont dans `backend/prisma/migrations/`.

Le dump fourni décrit la structure MySQL 8.0.46 et ne contient aucune donnée. Les colonnes `participant.id_assembler` et `suivie.id_participant` historiques restent sans relation Prisma, comme dans le dump. Les nouvelles tables ont leurs propres clés étrangères et contraintes d’unicité. L’application n’a pas pu vérifier une base réellement connectée : `backend/.env` ne contient pas de connexion et aucune migration n’a été appliquée.

## Utiliser le backend et le panneau

### Prérequis

- Node.js 20.19 ou supérieur.
- MySQL 8.0.16 ou supérieur ; le dump fourni a été produit avec MySQL 8.0.46.
- Une base `offensive` créée localement et un utilisateur MySQL limité à cette base.

### Installation et configuration

1. Copier les valeurs de `backend/.env.example` dans `backend/.env`. Si ce dernier existe déjà, compléter ses paramètres sans écraser ses secrets.
2. Renseigner `DATABASE_URL` avec l’adresse, l’utilisateur, le mot de passe et le nom de la base MySQL.
3. `EVENT_TIME_ZONE="UTC"` sert uniquement de valeur de repli pour les comptes historiques sans fuseau enregistré. Les nouveaux comptes conservent leur fuseau IANA détecté par le navigateur lors de la création de carte. L’intégration de l’API internationale des fuseaux reste en attente de son URL et de son format.
4. Depuis la racine du dépôt, exécuter :

```powershell
npm --prefix backend install
Set-Location backend
npm run prisma:validate
npm run prisma:generate
```

### Première installation de la base

Choisir **une seule** des deux méthodes :

- **Base MySQL vide :** créer la base `offensive`, puis depuis `backend/` exécuter `npm run prisma:deploy`. Les migrations construisent d’abord le schéma correspondant au dump, puis ajoutent les fonctions du backend.
- **Base déjà créée avec `offensive.sql` :** effectuer une sauvegarde et vérifier que son schéma correspond bien au dump, puis depuis `backend/` exécuter `npx prisma migrate resolve --applied 20261112103000_offensive_baseline --schema prisma/schema.prisma --config prisma.config.ts`, puis `npm run prisma:deploy`. Cette commande indique à Prisma que le schéma historique existe déjà ; elle ne doit pas être exécutée sur une base vide.

Ne pas importer `offensive.sql` puis exécuter la migration de base sans l’avoir marquée comme appliquée : ses tables existent déjà. Ne pas utiliser une base contenant des modifications non vérifiées. La migration de fonctions ajoute notamment les contraintes, index et tables d’engagement ; sauvegarder la base avant toute évolution.

### Créer l’administrateur et lancer le site

Depuis `backend/`, dans un terminal interactif :

```powershell
npm run admin:create
npm run dev
```

La première commande demande un nom, une adresse et deux saisies masquées du mot de passe (12 caractères minimum). Elle ne crée pas un deuxième administrateur si un compte existe déjà. Ouvrir ensuite `http://localhost:3000` pour le site et `http://localhost:3000/admin` pour le panneau. Le serveur Express ne publie que les fichiers du site explicitement autorisés ; `.env`, les migrations et les images en attente ne sont pas servis comme fichiers statiques.

`npm start` lance le serveur sans mode surveillance. En production HTTPS, définir `NODE_ENV=production`, `COOKIE_SECURE=true` et, uniquement derrière un proxy fiable configuré, `TRUST_PROXY=true`.

### Principales routes API

| Route | Usage |
| --- | --- |
| `GET /api/health` | Vérifie la connexion MySQL |
| `GET /api/meta` | Renvoie la date de départ, le fuseau et la durée de l’événement |
| `GET /api/me` | Vérifie la session participant du navigateur courant |
| `POST /api/engagements` | Crée le participant à la première carte, puis les engagements/cartes suivants |
| `GET /api/stats` | Renvoie uniquement les nombres publics participants/cartes |
| `GET /api/checkins` · `POST /api/checkins` · `DELETE /api/checkins/:day` | Lit, valide ou retire un jour pour le participant connecté |
| `POST /api/testimonials` | Soumet un témoignage et une image facultative en attente |
| `GET /api/testimonials` | Liste uniquement les témoignages approuvés |
| `/api/admin/*` | Connexion et opérations réservées au panneau administrateur |

### Sessions, modération et données

- Le navigateur reçoit un cookie `HttpOnly`, `SameSite=Lax`, persistant 30 jours et renouvelé lorsqu’il est utilisé. Seule l’empreinte du jeton aléatoire est stockée en MySQL ; les sessions expirées sont nettoyées chaque heure.
- Chaque compte participant conserve son fuseau IANA. Le navigateur le détecte au premier engagement ; une prochaine intégration de l’API des pays pourra proposer les fuseaux pertinents, notamment lorsque le pays a plusieurs zones horaires. Aucune API externe n’est encore appelée.
- Le téléphone est une clé unique, **pas une preuve d’identité**. Si un numéro existe mais que le navigateur ne possède plus sa session, le serveur refuse de rattacher ce compte. La récupération sûre après perte de cookie ou changement d’appareil attend l’ajout d’un code SMS ; ne pas remplacer ce contrôle par une simple recherche de téléphone.
- La soumission d’un témoignage nécessite une session participant obtenue après la création d’une carte. Les images restent privées jusqu’à approbation ; le panneau permet d’éditer, approuver, refuser ou supprimer les témoignages et de rechercher, modifier ou supprimer les participants.
- La suppression d’un participant retire également ses engagements, cartes, suivis et témoignages associés. Après la période de conservation, la purge globale est d’abord simulée puis peut être confirmée depuis `backend/` avec `npm run data:purge -- --confirm`. Faire une sauvegarde avant cette suppression ; le script conserve les comptes administrateurs et leur journal.
- Les fichiers de code contiennent des commentaires détaillés sur les choix métier et les opérations sensibles (sessions, validation, transactions et confidentialité), plutôt que des commentaires répétitifs sur les instructions évidentes.

### Tests et limites de vérification

Depuis `backend/`, lancer `npm test` pour les tests unitaires et HTTP sans base de données. `npm run prisma:validate` valide le modèle. La connexion à une base réelle, l’application des migrations et le parcours complet d’administration restent à vérifier après configuration de `DATABASE_URL`.

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
- Parcours d’engagement sans formulaire de création de compte distinct : un compte participant est créé au premier engagement si le backend est activé.
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
- Le site statique reste disponible ; le backend facultatif doit être configuré et validé par les responsables avant toute mise en production.
- Respect du cahier des charges et absence de contenus officiels inventés.
- Design responsive, léger et centré sur l’identité de l’Apôtre Germain Ndeke.
- Toute évolution importante est soumise à validation.
## une idée du mobile
  <img width="647" height="409" alt="image" src="https://github.com/user-attachments/assets/612e3d1c-987b-46af-96f9-68f494203dac" />


**Méthode de travail :** Cahier des charges → MVP → Présentation au client → Retours → Décisions → Évolutions.
