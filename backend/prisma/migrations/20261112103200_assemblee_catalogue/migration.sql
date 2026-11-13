CREATE TABLE assemblee_catalogue (
    id_assemblee SERIAL NOT NULL,
    nom_assemblee VARCHAR(70) NOT NULL,
    ville_assemblee VARCHAR(40) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT assemblee_catalogue_pkey PRIMARY KEY (id_assemblee)
);

CREATE UNIQUE INDEX assemblee_catalogue_nom_ville_uq
    ON assemblee_catalogue (nom_assemblee, ville_assemblee);

CREATE INDEX assemblee_catalogue_actif_idx
    ON assemblee_catalogue (actif, ville_assemblee, nom_assemblee);
