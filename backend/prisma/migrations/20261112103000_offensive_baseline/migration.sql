-- CreateTable
CREATE TABLE `administrateur` (
    `id_administrateur` INTEGER NOT NULL AUTO_INCREMENT,
    `nom_administrateur` VARCHAR(100) NOT NULL,
    `email_adminstrateur` VARCHAR(100) NOT NULL,
    `mot_de_passe` VARCHAR(255) NOT NULL,
    `date_creation` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `derniere_connexion` DATETIME(0) NULL,

    UNIQUE INDEX `email_adminstrateur`(`email_adminstrateur`),
    PRIMARY KEY (`id_administrateur`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `assemblee` (
    `id_assemblee` INTEGER NOT NULL,
    `nom_assemblee` VARCHAR(50) NOT NULL,
    `ville_assemblee` VARCHAR(50) NOT NULL,
    `quartier_assemblee` VARCHAR(100) NOT NULL,
    `id_participant` INTEGER NOT NULL,

    INDEX `id_participant`(`id_participant`),
    PRIMARY KEY (`id_assemblee`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `participant` (
    `id_participant` INTEGER NOT NULL AUTO_INCREMENT,
    `id_assembler` INTEGER NULL,
    `nom_participant` VARCHAR(100) NOT NULL,
    `prenom_participant` VARCHAR(100) NOT NULL,
    `telephone_participant` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `telephone_participant`(`telephone_participant`),
    PRIMARY KEY (`id_participant`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `participant_suivie` (
    `id_suivie` INTEGER NOT NULL,
    `id_participant` INTEGER NOT NULL,

    INDEX `id_participant`(`id_participant`),
    PRIMARY KEY (`id_suivie`, `id_participant`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `suivie` (
    `id_suivie` INTEGER NOT NULL,
    `id_participant` INTEGER NOT NULL,
    `jours_suivie` INTEGER NOT NULL,
    `date_suivie` DATETIME(0) NOT NULL,
    `statut_suivie` BOOLEAN NULL,

    PRIMARY KEY (`id_suivie`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `temoignage` (
    `id_temoignage` INTEGER NOT NULL,
    `message_temoignage` VARCHAR(1000) NOT NULL,
    `date_temoignage` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id_temoignage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `temoignage_participant` (
    `id_temoignage` INTEGER NOT NULL,
    `id_participant` INTEGER NOT NULL,

    INDEX `id_participant`(`id_participant`),
    PRIMARY KEY (`id_temoignage`, `id_participant`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `assemblee` ADD CONSTRAINT `assemblee_ibfk_1` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `participant_suivie` ADD CONSTRAINT `participant_suivie_ibfk_1` FOREIGN KEY (`id_suivie`) REFERENCES `suivie`(`id_suivie`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `participant_suivie` ADD CONSTRAINT `participant_suivie_ibfk_2` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temoignage_participant` ADD CONSTRAINT `temoignage_participant_ibfk_1` FOREIGN KEY (`id_temoignage`) REFERENCES `temoignage`(`id_temoignage`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temoignage_participant` ADD CONSTRAINT `temoignage_participant_ibfk_2` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- MySQL 8.0.16+ enforces the same 1-to-21 range as the supplied SQL dump.
ALTER TABLE `suivie` ADD CONSTRAINT `suivie_chk_1` CHECK (`jours_suivie` BETWEEN 1 AND 21);
