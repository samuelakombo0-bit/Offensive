-- ============================================================================
--  Grande Offensive 2026 : schéma COMPLET de la base « offensive »
--  Version PostgreSQL 12+ (équivalent des scripts MySQL), pour une
--  installation NEUVE.
--
--  Avant de lancer ce fichier, créez la base (une seule fois) :
--      CREATE DATABASE offensive WITH ENCODING 'UTF8' TEMPLATE template0;
--  Configurez le fuseau séparément (ALTER DATABASE ne peut pas être exécuté
--  dans une transaction) :
--      psql -U postgres -d postgres -c "ALTER DATABASE offensive SET timezone TO 'UTC';"
--  puis connectez-vous à elle (psql : \c offensive) et exécutez ce script :
--      psql -U postgres -d offensive -f offensive_schema_complet_postgres.sql
--
--  Tout le script est dans une transaction : en cas d'erreur, rien n'est créé.
-- ============================================================================

BEGIN;

-- Les dates sont enregistrées en UTC, comme le fait l'application Node.js.
-- (Prend effet pour les NOUVELLES connexions à la base.)

-- ----------------------------------------------------------------------------
--  Types
-- ----------------------------------------------------------------------------

CREATE TYPE statut_temoignage AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REFUSE');

-- ----------------------------------------------------------------------------
--  Tables
-- ----------------------------------------------------------------------------

CREATE TABLE administrateur (
    id_administrateur   SERIAL        NOT NULL,
    nom_administrateur  VARCHAR(100)  NOT NULL,
    email_adminstrateur VARCHAR(100)  NOT NULL,
    mot_de_passe        VARCHAR(255)  NOT NULL,
    date_creation       TIMESTAMP(0)  NULL DEFAULT CURRENT_TIMESTAMP(0),
    derniere_connexion  TIMESTAMP(0)  NULL,

    CONSTRAINT administrateur_pkey PRIMARY KEY (id_administrateur)
);

CREATE TABLE participant (
    id_participant        SERIAL        NOT NULL,
    id_assembler          INTEGER       NULL,
    nom_participant       VARCHAR(100)  NOT NULL,
    prenom_participant    VARCHAR(100)  NOT NULL,
    telephone_participant VARCHAR(50)   NOT NULL,
    consentement_donnees  TIMESTAMP(3)  NULL,
    fuseau_horaire        VARCHAR(64)   NOT NULL DEFAULT 'UTC',
    date_creation         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT participant_pkey PRIMARY KEY (id_participant)
);

-- Table historique (assemblée liée à un participant) : conservée telle quelle.
CREATE TABLE assemblee (
    id_assemblee       INTEGER       NOT NULL,
    nom_assemblee      VARCHAR(50)   NOT NULL,
    ville_assemblee    VARCHAR(50)   NOT NULL,
    quartier_assemblee VARCHAR(100)  NOT NULL,
    id_participant     INTEGER       NOT NULL,

    CONSTRAINT assemblee_pkey PRIMARY KEY (id_assemblee)
);

-- NOUVEAU : liste des assemblées proposées dans le formulaire « Je m'engage »,
-- gérée depuis le panneau administrateur.
CREATE TABLE assemblee_catalogue (
    id_assemblee    SERIAL        NOT NULL,
    nom_assemblee   VARCHAR(70)   NOT NULL,
    ville_assemblee VARCHAR(40)   NOT NULL,
    actif           BOOLEAN       NOT NULL DEFAULT true,
    date_creation   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT assemblee_catalogue_pkey PRIMARY KEY (id_assemblee)
);

CREATE TABLE suivie (
    id_suivie      INTEGER       NOT NULL,
    id_participant INTEGER       NOT NULL,
    jours_suivie   INTEGER       NOT NULL,
    date_suivie    TIMESTAMP(0)  NOT NULL,
    statut_suivie  BOOLEAN       NULL,

    CONSTRAINT suivie_pkey PRIMARY KEY (id_suivie),
    CONSTRAINT suivie_chk_1 CHECK (jours_suivie BETWEEN 1 AND 21)
);

CREATE TABLE participant_suivie (
    id_suivie      INTEGER NOT NULL,
    id_participant INTEGER NOT NULL,

    CONSTRAINT participant_suivie_pkey PRIMARY KEY (id_suivie, id_participant)
);

CREATE TABLE temoignage (
    id_temoignage      SERIAL             NOT NULL,
    message_temoignage VARCHAR(1000)      NOT NULL,
    date_temoignage    TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    date_moderation    TIMESTAMP(3)       NULL,
    id_moderateur      INTEGER            NULL,
    id_participant     INTEGER            NULL,
    image_privee       VARCHAR(255)       NULL,
    statut             statut_temoignage  NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT temoignage_pkey PRIMARY KEY (id_temoignage)
);

CREATE TABLE temoignage_participant (
    id_temoignage  INTEGER NOT NULL,
    id_participant INTEGER NOT NULL,

    CONSTRAINT temoignage_participant_pkey PRIMARY KEY (id_temoignage, id_participant)
);

CREATE TABLE engagement (
    id_engagement   SERIAL        NOT NULL,
    id_participant  INTEGER       NOT NULL,
    lieu_engagement VARCHAR(120)  NOT NULL,
    jours_choisis   INTEGER       NOT NULL,
    date_creation   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT engagement_pkey PRIMARY KEY (id_engagement),
    CONSTRAINT engagement_jours_choisis_chk CHECK (jours_choisis BETWEEN 1 AND 21)
);

CREATE TABLE carte (
    id_carte      SERIAL        NOT NULL,
    id_engagement INTEGER       NOT NULL,
    date_creation TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT carte_pkey PRIMARY KEY (id_carte)
);

CREATE TABLE suivi_journalier (
    id_suivi        SERIAL        NOT NULL,
    id_participant  INTEGER       NOT NULL,
    jour            INTEGER       NOT NULL,
    date_validation TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT suivi_journalier_pkey PRIMARY KEY (id_suivi),
    CONSTRAINT suivi_journalier_jour_chk CHECK (jour BETWEEN 1 AND 21)
);

CREATE TABLE session_auth (
    id_session        SERIAL        NOT NULL,
    empreinte         CHAR(64)      NOT NULL,
    id_participant    INTEGER       NULL,
    id_administrateur INTEGER       NULL,
    date_creation     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    date_expiration   TIMESTAMP(3)  NOT NULL,

    CONSTRAINT session_auth_pkey PRIMARY KEY (id_session)
);

CREATE TABLE theme_hebdomadaire (
    semaine          INTEGER      NOT NULL,
    theme            VARCHAR(240) NOT NULL DEFAULT '',
    publie           BOOLEAN      NOT NULL DEFAULT false,
    date_modification TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT theme_hebdomadaire_pkey PRIMARY KEY (semaine),
    CONSTRAINT theme_hebdomadaire_semaine_chk CHECK (semaine BETWEEN 1 AND 3)
);

CREATE TABLE contenu_journalier (
    jour              INTEGER      NOT NULL,
    contenu           TEXT         NOT NULL DEFAULT '',
    publie            BOOLEAN      NOT NULL DEFAULT false,
    date_modification TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT contenu_journalier_pkey PRIMARY KEY (jour),
    CONSTRAINT contenu_journalier_jour_chk CHECK (jour BETWEEN 1 AND 21)
);

CREATE TABLE journal_admin (
    id_action         SERIAL         NOT NULL,
    id_administrateur INTEGER        NULL,
    action            VARCHAR(80)    NOT NULL,
    cible             VARCHAR(80)    NOT NULL,
    id_cible          VARCHAR(64)    NULL,
    details           VARCHAR(1000)  NULL,
    date_creation     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT journal_admin_pkey PRIMARY KEY (id_action)
);

-- ----------------------------------------------------------------------------
--  Index
--  (sous PostgreSQL, un nom d'index doit être unique dans tout le schéma :
--   les trois index « id_participant » de MySQL sont donc renommés)
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX email_adminstrateur ON administrateur (email_adminstrateur);
CREATE UNIQUE INDEX telephone_participant ON participant (telephone_participant);

CREATE INDEX assemblee_id_participant_idx ON assemblee (id_participant);
CREATE INDEX participant_suivie_id_participant_idx ON participant_suivie (id_participant);
CREATE INDEX temoignage_participant_id_participant_idx ON temoignage_participant (id_participant);

CREATE INDEX assemblee_catalogue_actif_idx ON assemblee_catalogue (actif, ville_assemblee, nom_assemblee);
-- Attention : sensible à la casse sous PostgreSQL ("Matari" ≠ "matari").
CREATE UNIQUE INDEX assemblee_catalogue_nom_ville_uq ON assemblee_catalogue (nom_assemblee, ville_assemblee);

CREATE INDEX temoignage_statut_date_idx ON temoignage (statut, date_temoignage);
CREATE INDEX temoignage_participant_idx ON temoignage (id_participant);

CREATE INDEX engagement_participant_date_idx ON engagement (id_participant, date_creation);
CREATE INDEX carte_engagement_idx ON carte (id_engagement);

CREATE INDEX suivi_journalier_date_idx ON suivi_journalier (date_validation);
CREATE UNIQUE INDEX suivi_journalier_participant_jour_uq ON suivi_journalier (id_participant, jour);

CREATE UNIQUE INDEX session_auth_empreinte_uq ON session_auth (empreinte);
CREATE INDEX session_auth_expiration_idx ON session_auth (date_expiration);
CREATE INDEX session_auth_admin_idx ON session_auth (id_administrateur);

CREATE INDEX journal_admin_date_idx ON journal_admin (date_creation);
CREATE INDEX journal_admin_admin_idx ON journal_admin (id_administrateur);

-- ----------------------------------------------------------------------------
--  Clés étrangères
-- ----------------------------------------------------------------------------

ALTER TABLE assemblee ADD CONSTRAINT assemblee_ibfk_1
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE participant_suivie ADD CONSTRAINT participant_suivie_ibfk_1
    FOREIGN KEY (id_suivie) REFERENCES suivie (id_suivie) ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE participant_suivie ADD CONSTRAINT participant_suivie_ibfk_2
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE temoignage_participant ADD CONSTRAINT temoignage_participant_ibfk_1
    FOREIGN KEY (id_temoignage) REFERENCES temoignage (id_temoignage) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE temoignage_participant ADD CONSTRAINT temoignage_participant_ibfk_2
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE engagement ADD CONSTRAINT engagement_ibfk_1
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE carte ADD CONSTRAINT carte_ibfk_1
    FOREIGN KEY (id_engagement) REFERENCES engagement (id_engagement) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE suivi_journalier ADD CONSTRAINT suivi_journalier_ibfk_1
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE temoignage ADD CONSTRAINT temoignage_auteur_ibfk
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE temoignage ADD CONSTRAINT temoignage_moderateur_ibfk
    FOREIGN KEY (id_moderateur) REFERENCES administrateur (id_administrateur) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE session_auth ADD CONSTRAINT session_auth_participant_ibfk
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE session_auth ADD CONSTRAINT session_auth_admin_ibfk
    FOREIGN KEY (id_administrateur) REFERENCES administrateur (id_administrateur) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE journal_admin ADD CONSTRAINT journal_admin_admin_ibfk
    FOREIGN KEY (id_administrateur) REFERENCES administrateur (id_administrateur) ON DELETE SET NULL ON UPDATE CASCADE;

-- Le compte administrateur n'est PAS créé ici (aucun mot de passe dans un .sql).

COMMIT;
