CREATE TABLE administrateur (
    id_administrateur SERIAL NOT NULL,
    nom_administrateur VARCHAR(100) NOT NULL,
    email_adminstrateur VARCHAR(100) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    derniere_connexion TIMESTAMP(0) NULL,
    CONSTRAINT administrateur_pkey PRIMARY KEY (id_administrateur)
);

CREATE UNIQUE INDEX email_adminstrateur ON administrateur (email_adminstrateur);

CREATE TABLE participant (
    id_participant SERIAL NOT NULL,
    id_assembler INTEGER NULL,
    nom_participant VARCHAR(100) NOT NULL,
    prenom_participant VARCHAR(100) NOT NULL,
    telephone_participant VARCHAR(50) NOT NULL,
    CONSTRAINT participant_pkey PRIMARY KEY (id_participant)
);

CREATE UNIQUE INDEX telephone_participant ON participant (telephone_participant);

CREATE TABLE assemblee (
    id_assemblee INTEGER NOT NULL,
    nom_assemblee VARCHAR(50) NOT NULL,
    ville_assemblee VARCHAR(50) NOT NULL,
    quartier_assemblee VARCHAR(100) NOT NULL,
    id_participant INTEGER NOT NULL,
    CONSTRAINT assemblee_pkey PRIMARY KEY (id_assemblee)
);

CREATE INDEX assemblee_id_participant_idx ON assemblee (id_participant);

CREATE TABLE suivie (
    id_suivie INTEGER NOT NULL,
    id_participant INTEGER NOT NULL,
    jours_suivie INTEGER NOT NULL,
    date_suivie TIMESTAMP(0) NOT NULL,
    statut_suivie BOOLEAN NULL,
    CONSTRAINT suivie_pkey PRIMARY KEY (id_suivie),
    CONSTRAINT suivie_chk_1 CHECK (jours_suivie BETWEEN 1 AND 21)
);

CREATE TABLE participant_suivie (
    id_suivie INTEGER NOT NULL,
    id_participant INTEGER NOT NULL,
    CONSTRAINT participant_suivie_pkey PRIMARY KEY (id_suivie, id_participant)
);

CREATE INDEX participant_suivie_id_participant_idx ON participant_suivie (id_participant);

CREATE TABLE temoignage (
    id_temoignage INTEGER NOT NULL,
    message_temoignage VARCHAR(1000) NOT NULL,
    date_temoignage TIMESTAMP(0) NOT NULL,
    CONSTRAINT temoignage_pkey PRIMARY KEY (id_temoignage)
);

CREATE TABLE temoignage_participant (
    id_temoignage INTEGER NOT NULL,
    id_participant INTEGER NOT NULL,
    CONSTRAINT temoignage_participant_pkey PRIMARY KEY (id_temoignage, id_participant)
);

CREATE INDEX temoignage_participant_id_participant_idx ON temoignage_participant (id_participant);

ALTER TABLE assemblee
    ADD CONSTRAINT assemblee_ibfk_1
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant)
    ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE participant_suivie
    ADD CONSTRAINT participant_suivie_ibfk_1
    FOREIGN KEY (id_suivie) REFERENCES suivie (id_suivie)
    ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE participant_suivie
    ADD CONSTRAINT participant_suivie_ibfk_2
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant)
    ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE temoignage_participant
    ADD CONSTRAINT temoignage_participant_ibfk_1
    FOREIGN KEY (id_temoignage) REFERENCES temoignage (id_temoignage)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE temoignage_participant
    ADD CONSTRAINT temoignage_participant_ibfk_2
    FOREIGN KEY (id_participant) REFERENCES participant (id_participant)
    ON DELETE NO ACTION ON UPDATE CASCADE;
