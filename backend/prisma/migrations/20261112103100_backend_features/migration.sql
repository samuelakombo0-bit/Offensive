-- AlterTable
ALTER TABLE `participant` ADD COLUMN `consentement_donnees` DATETIME(3) NULL,
    ADD COLUMN `fuseau_horaire` VARCHAR(64) NOT NULL DEFAULT 'UTC',
    ADD COLUMN `date_creation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- The testimony primary key is referenced by the participant junction table.
ALTER TABLE `temoignage_participant` DROP FOREIGN KEY `temoignage_participant_ibfk_1`;

-- AlterTable
ALTER TABLE `temoignage` ADD COLUMN `date_moderation` DATETIME(3) NULL,
    ADD COLUMN `id_moderateur` INTEGER NULL,
    ADD COLUMN `id_participant` INTEGER NULL,
    ADD COLUMN `image_privee` VARCHAR(255) NULL,
    ADD COLUMN `statut` ENUM('EN_ATTENTE', 'APPROUVE', 'REFUSE') NOT NULL DEFAULT 'EN_ATTENTE',
    MODIFY `id_temoignage` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `date_temoignage` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Restore the historical relationship after changing the referenced primary key.
ALTER TABLE `temoignage_participant` ADD CONSTRAINT `temoignage_participant_ibfk_1`
    FOREIGN KEY (`id_temoignage`) REFERENCES `temoignage`(`id_temoignage`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `engagement` (
    `id_engagement` INTEGER NOT NULL AUTO_INCREMENT,
    `id_participant` INTEGER NOT NULL,
    `lieu_engagement` VARCHAR(120) NOT NULL,
    `jours_choisis` INTEGER NOT NULL,
    `date_creation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT `engagement_jours_choisis_chk` CHECK (`jours_choisis` BETWEEN 1 AND 21),
    INDEX `engagement_participant_date_idx`(`id_participant`, `date_creation`),
    PRIMARY KEY (`id_engagement`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `carte` (
    `id_carte` INTEGER NOT NULL AUTO_INCREMENT,
    `id_engagement` INTEGER NOT NULL,
    `date_creation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `carte_engagement_idx`(`id_engagement`),
    PRIMARY KEY (`id_carte`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `suivi_journalier` (
    `id_suivi` INTEGER NOT NULL AUTO_INCREMENT,
    `id_participant` INTEGER NOT NULL,
    `jour` INTEGER NOT NULL,
    `date_validation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT `suivi_journalier_jour_chk` CHECK (`jour` BETWEEN 1 AND 21),
    INDEX `suivi_journalier_date_idx`(`date_validation`),
    UNIQUE INDEX `suivi_journalier_participant_jour_uq`(`id_participant`, `jour`),
    PRIMARY KEY (`id_suivi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `session_auth` (
    `id_session` INTEGER NOT NULL AUTO_INCREMENT,
    `empreinte` CHAR(64) NOT NULL,
    `id_participant` INTEGER NULL,
    `id_administrateur` INTEGER NULL,
    `date_creation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_expiration` DATETIME(3) NOT NULL,

    UNIQUE INDEX `session_auth_empreinte_uq`(`empreinte`),
    INDEX `session_auth_expiration_idx`(`date_expiration`),
    INDEX `session_auth_admin_idx`(`id_administrateur`),
    PRIMARY KEY (`id_session`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `journal_admin` (
    `id_action` INTEGER NOT NULL AUTO_INCREMENT,
    `id_administrateur` INTEGER NULL,
    `action` VARCHAR(80) NOT NULL,
    `cible` VARCHAR(80) NOT NULL,
    `id_cible` VARCHAR(64) NULL,
    `details` VARCHAR(1000) NULL,
    `date_creation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `journal_admin_date_idx`(`date_creation`),
    INDEX `journal_admin_admin_idx`(`id_administrateur`),
    PRIMARY KEY (`id_action`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateIndex
CREATE INDEX `temoignage_statut_date_idx` ON `temoignage`(`statut`, `date_temoignage`);

-- CreateIndex
CREATE INDEX `temoignage_participant_idx` ON `temoignage`(`id_participant`);

-- AddForeignKey
ALTER TABLE `engagement` ADD CONSTRAINT `engagement_ibfk_1` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carte` ADD CONSTRAINT `carte_ibfk_1` FOREIGN KEY (`id_engagement`) REFERENCES `engagement`(`id_engagement`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suivi_journalier` ADD CONSTRAINT `suivi_journalier_ibfk_1` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temoignage` ADD CONSTRAINT `temoignage_auteur_ibfk` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temoignage` ADD CONSTRAINT `temoignage_moderateur_ibfk` FOREIGN KEY (`id_moderateur`) REFERENCES `administrateur`(`id_administrateur`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_auth` ADD CONSTRAINT `session_auth_participant_ibfk` FOREIGN KEY (`id_participant`) REFERENCES `participant`(`id_participant`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_auth` ADD CONSTRAINT `session_auth_admin_ibfk` FOREIGN KEY (`id_administrateur`) REFERENCES `administrateur`(`id_administrateur`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_admin` ADD CONSTRAINT `journal_admin_admin_ibfk` FOREIGN KEY (`id_administrateur`) REFERENCES `administrateur`(`id_administrateur`) ON DELETE SET NULL ON UPDATE CASCADE;
