-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: offensive
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `administrateur`
--

DROP TABLE IF EXISTS `administrateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administrateur` (
  `id_administrateur` int NOT NULL AUTO_INCREMENT,
  `nom_administrateur` varchar(100) NOT NULL,
  `email_adminstrateur` varchar(100) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `derniere_connexion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_administrateur`),
  UNIQUE KEY `email_adminstrateur` (`email_adminstrateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administrateur`
--

LOCK TABLES `administrateur` WRITE;
/*!40000 ALTER TABLE `administrateur` DISABLE KEYS */;
/*!40000 ALTER TABLE `administrateur` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assemblee`
--

DROP TABLE IF EXISTS `assemblee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assemblee` (
  `id_assemblee` int NOT NULL,
  `nom_assemblee` varchar(50) NOT NULL,
  `ville_assemblee` varchar(50) NOT NULL,
  `quartier_assemblee` varchar(100) NOT NULL,
  `id_participant` int NOT NULL,
  PRIMARY KEY (`id_assemblee`),
  KEY `id_participant` (`id_participant`),
  CONSTRAINT `assemblee_ibfk_1` FOREIGN KEY (`id_participant`) REFERENCES `participant` (`id_participant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assemblee`
--

LOCK TABLES `assemblee` WRITE;
/*!40000 ALTER TABLE `assemblee` DISABLE KEYS */;
/*!40000 ALTER TABLE `assemblee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participant`
--

DROP TABLE IF EXISTS `participant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participant` (
  `id_participant` int NOT NULL AUTO_INCREMENT,
  `id_assembler` int DEFAULT NULL,
  `nom_participant` varchar(100) NOT NULL,
  `prenom_participant` varchar(100) NOT NULL,
  `telephone_participant` varchar(50) NOT NULL,
  PRIMARY KEY (`id_participant`),
  UNIQUE KEY `telephone_participant` (`telephone_participant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participant`
--

LOCK TABLES `participant` WRITE;
/*!40000 ALTER TABLE `participant` DISABLE KEYS */;
/*!40000 ALTER TABLE `participant` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participant_suivie`
--

DROP TABLE IF EXISTS `participant_suivie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participant_suivie` (
  `id_suivie` int NOT NULL,
  `id_participant` int NOT NULL,
  PRIMARY KEY (`id_suivie`,`id_participant`),
  KEY `id_participant` (`id_participant`),
  CONSTRAINT `participant_suivie_ibfk_1` FOREIGN KEY (`id_suivie`) REFERENCES `suivie` (`id_suivie`),
  CONSTRAINT `participant_suivie_ibfk_2` FOREIGN KEY (`id_participant`) REFERENCES `participant` (`id_participant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participant_suivie`
--

LOCK TABLES `participant_suivie` WRITE;
/*!40000 ALTER TABLE `participant_suivie` DISABLE KEYS */;
/*!40000 ALTER TABLE `participant_suivie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suivie`
--

DROP TABLE IF EXISTS `suivie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suivie` (
  `id_suivie` int NOT NULL,
  `id_participant` int NOT NULL,
  `jours_suivie` int NOT NULL,
  `date_suivie` datetime NOT NULL,
  `statut_suivie` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id_suivie`),
  CONSTRAINT `suivie_chk_1` CHECK ((`jours_suivie` between 1 and 21))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suivie`
--

LOCK TABLES `suivie` WRITE;
/*!40000 ALTER TABLE `suivie` DISABLE KEYS */;
/*!40000 ALTER TABLE `suivie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temoignage`
--

DROP TABLE IF EXISTS `temoignage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temoignage` (
  `id_temoignage` int NOT NULL,
  `message_temoignage` varchar(1000) NOT NULL,
  `date_temoignage` datetime NOT NULL,
  PRIMARY KEY (`id_temoignage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temoignage`
--

LOCK TABLES `temoignage` WRITE;
/*!40000 ALTER TABLE `temoignage` DISABLE KEYS */;
/*!40000 ALTER TABLE `temoignage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temoignage_participant`
--

DROP TABLE IF EXISTS `temoignage_participant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temoignage_participant` (
  `id_temoignage` int NOT NULL,
  `id_participant` int NOT NULL,
  PRIMARY KEY (`id_temoignage`,`id_participant`),
  KEY `id_participant` (`id_participant`),
  CONSTRAINT `temoignage_participant_ibfk_1` FOREIGN KEY (`id_temoignage`) REFERENCES `temoignage` (`id_temoignage`),
  CONSTRAINT `temoignage_participant_ibfk_2` FOREIGN KEY (`id_participant`) REFERENCES `participant` (`id_participant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temoignage_participant`
--

LOCK TABLES `temoignage_participant` WRITE;
/*!40000 ALTER TABLE `temoignage_participant` DISABLE KEYS */;
/*!40000 ALTER TABLE `temoignage_participant` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-12  9:58:44
