CREATE TABLE theme_hebdomadaire (
    semaine INTEGER NOT NULL,
    theme VARCHAR(240) NOT NULL DEFAULT '',
    publie BOOLEAN NOT NULL DEFAULT FALSE,
    date_modification TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT theme_hebdomadaire_pkey PRIMARY KEY (semaine),
    CONSTRAINT theme_hebdomadaire_semaine_chk CHECK (semaine BETWEEN 1 AND 3)
);

CREATE TABLE contenu_journalier (
    jour INTEGER NOT NULL,
    contenu TEXT NOT NULL DEFAULT '',
    publie BOOLEAN NOT NULL DEFAULT FALSE,
    date_modification TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT contenu_journalier_pkey PRIMARY KEY (jour),
    CONSTRAINT contenu_journalier_jour_chk CHECK (jour BETWEEN 1 AND 21)
);
