import { EventData } from '../types';
import { parseTimelineDate } from '../utils/dateUtils';
import { createCategoryId, createEventId } from '../utils/stableIds';
import { normalizeCategoryName } from '../utils/dataVocabulary';

interface RawEvent {
  text: string;
  category: string;
  start: string;
  end: string;
  description?: string;
  icon?: string;
  fuzzy_start?: boolean;
  fuzzy_end?: boolean;
  default_color?: string;
  associatedLocationIds?: string[];
}

const rawEventsData: RawEvent[] = [
  // General & Bible Periods
  { text: "Genèse", category: "Periode Livre Biblique", start: "-10207-12-31 00:00:00", end: "-1656-01-19 05:34:00" },
  { text: "Exode", category: "Periode Livre Biblique", start: "-1656-01-01 00:00:00", end: "-1511-01-01 00:00:00" },
  { text: "Nombres", category: "Periode Livre Biblique", start: "-1511-04-08 00:01:00", end: "-1472-01-01 00:00:00" },
  { text: "Deutéronome", category: "Periode Livre Biblique", start: "-1473-10-02 00:00:00", end: "-1472-01-01 00:00:00" },
  { text: "Josué", category: "Periode Livre Biblique", start: "-1472-01-01 20:59:00", end: "-1449-01-01 20:59:00" },
  { text: "Juges", category: "Periode Livre Biblique", start: "-1449-01-01 00:00:00", end: "-1119-01-01 00:00:00" },
  { text: "1 Samuel", category: "Periode Livre Biblique", start: "-1179-01-01 00:00:00", end: "-1077-01-01 00:00:00" },
  { text: "2 Samuel", category: "Periode Livre Biblique", start: "-1078-12-19 06:25:08", end: "-1041-12-20 06:25:08" },
  { text: "1 Rois", category: "Periode Livre Biblique", start: "-1039-01-02 00:00:00", end: "-910-01-01 00:00:00" },
  { text: "2 Rois", category: "Periode Livre Biblique", start: "-919-01-01 00:00:00", end: "-579-01-01 00:00:00" },
  { text: "1 Chroniques", category: "Periode Livre Biblique", start: "-1076-01-01 00:00:00", end: "-1036-01-01 00:00:00" },
  { text: "2 Chroniques", category: "Periode Livre Biblique", start: "-1036-01-01 00:00:00", end: "-536-01-01 00:00:00" },
  { text: "Job (Livre de)", category: "Periode Livre Biblique", start: "-1656-01-01 00:00:00", end: "-1472-01-01 00:00:00" },
  { text: "Esdras (Livre de)", category: "Periode Livre Biblique", start: "-536-01-01 00:00:00", end: "-466-01-01 00:00:00" },
  { text: "Néhémie (Livre de)", category: "Periode Livre Biblique", start: "-455-01-01 00:00:00", end: "-442-01-01 00:00:00" },
  { text: "Esther (Livre de)", category: "Periode Livre Biblique", start: "-492-01-01 00:00:00", end: "-474-01-01 00:00:00" },
  { text: "Isaïe (Livre de)", category: "Periode Livre Biblique", start: "-777-01-01 00:00:00", end: "-731-01-01 00:00:00" },
  { text: "Jérémie (Livre de)", category: "Periode Livre Biblique", start: "-646-01-01 00:00:00", end: "-579-01-01 00:00:00" },
  { text: "Ézéchiel (Livre de)", category: "Periode Livre Biblique", start: "-612-01-01 00:00:00", end: "-590-01-01 00:00:00" },
  { text: "Daniel (Livre de)", category: "Periode Livre Biblique", start: "-617-01-01 00:00:00", end: "-535-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true },

  // Key patriarchs & figures
  { text: "Adam", category: "Personnage", start: "-4025-01-01 00:00:00", end: "-3095-01-01 00:00:00", associatedLocationIds: ["eden"] },
  { text: "Abel", category: "Personnage", start: "-3995-01-01 00:00:00", end: "-3895-01-01 00:00:00", fuzzy_end: true },
  { text: "Seth", category: "Personnage", start: "-3895-01-01 00:00:00", end: "-2983-01-01 00:00:00" },
  { text: "Enosh", category: "Personnage", start: "-3790-01-01 00:00:00", end: "-2885-01-01 00:00:00" },
  { text: "Hénoch", category: "Personnage", start: "-3403-01-01 00:00:00", end: "-3038-01-01 00:00:00" },
  { text: "Mathusalem", category: "Personnage", start: "-3338-01-01 00:00:00", end: "-2369-01-01 00:00:00" },
  { text: "Lamek", category: "Personnage", start: "-3151-01-01 00:00:00", end: "-2374-01-01 00:00:00", description: "Père de Noé" },
  { text: "Noé", category: "Personnage", start: "-2969-01-01 00:00:00", end: "-2019-01-01 00:00:00", associatedLocationIds: ["ararat"] },
  { text: "Sem", category: "Personnage", start: "-2467-01-01 00:00:00", end: "-1867-01-01 00:00:00" },
  { text: "Japhet", category: "Personnage", start: "-2469-01-01 00:00:00", end: "-2269-01-01 00:00:00", fuzzy_end: true },
  { text: "Arpakshad", category: "Personnage", start: "-2367-01-01 00:00:00", end: "-1928-12-31 00:00:00", description: "Fils de Sem" },
  { text: "Shéla", category: "Personnage", start: "-2332-01-01 00:00:00", end: "-1899-12-31 00:00:00", description: "Fils d'Arpakshad" },
  { text: "Ébèr", category: "Personnage", start: "-2302-01-01 00:00:00", end: "-1838-12-31 00:00:00", description: "Fils de Shéla" },
  { text: "Pélèg", category: "Personnage", start: "-2268-01-01 00:00:00", end: "-2029-12-31 00:00:00", description: "Fils de Ébèr" },
  { text: "Téra", category: "Personnage", start: "-2147-01-01 00:00:00", end: "-1942-01-01 00:00:00", description: "Père d'Abraham", associatedLocationIds: ["ur", "haran"] },
  { text: "Haran", category: "Personnage", start: "-2077-01-01 00:00:00", end: "-1999-01-01 00:00:00", description: "Frère aîné d'Abraham", associatedLocationIds: ["ur", "haran"] },
  { text: "Abraham", category: "Personnage", start: "-2017-01-01 00:00:00", end: "-1842-01-01 00:00:00", associatedLocationIds: ["ur", "haran", "hebron", "beersheba", "shechem"] },
  { text: "Sara", category: "Personnage", start: "-2007-01-01 00:00:00", end: "-1880-01-01 00:00:00", associatedLocationIds: ["hebron"] },
  { text: "Lot ?", category: "Personnage", start: "-2037-01-01 00:00:00", end: "-1880-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["sodom"] },
  { text: "Isaac", category: "Personnage", start: "-1917-01-01 00:00:00", end: "-1737-01-01 00:00:00", associatedLocationIds: ["beersheba", "hebron"] },
  { text: "Jacob", category: "Personnage", start: "-1857-01-01 00:00:00", end: "-1710-01-01 00:00:00", associatedLocationIds: ["bethel", "haran", "penuel", "hebron", "goshen"] },
  { text: "Joseph", category: "FIls de Rachel", start: "-1766-01-01 00:00:00", end: "-1656-01-01 00:00:00", associatedLocationIds: ["hebron", "shechem", "dothan", "memphis", "goshen"] },
  { text: "Ruben", category: "Fils de Léa", start: "-1773-01-01 00:00:00", end: "-1660-04-27 23:45:25", fuzzy_end: true },
  { text: "Siméon", category: "Fils de Léa", start: "-1773-10-09 19:12:00", end: "-1660-04-27 23:45:25", fuzzy_start: true, fuzzy_end: true },
  { text: "Lévi", category: "Fils de Léa", start: "-1772-07-01 18:28:00", end: "-1660-08-09 19:45:05", fuzzy_start: true, fuzzy_end: true },
  { text: "Juda", category: "Fils de Léa", start: "-1771-05-01 11:16:00", end: "-1660-11-21 15:44:44", fuzzy_start: true, fuzzy_end: true },
  { text: "Dan", category: "Fils de Bila", start: "-1770-01-01 09:18:00", end: "-1660-04-27 23:45:25", fuzzy_start: true, fuzzy_end: true },
  { text: "Nephtali", category: "Fils de Bila", start: "-1769-10-07 06:42:00", end: "-1660-04-27 23:45:25", fuzzy_start: true, fuzzy_end: true },
  { text: "Gad", category: "Fils de Zilpa", start: "-1768-06-14 22:37:00", end: "-1660-11-21 15:44:44", fuzzy_start: true, fuzzy_end: true },
  { text: "Aser", category: "Fils de Zilpa", start: "-1767-01-13 00:00:00", end: "-1659-06-17 07:44:02", fuzzy_start: true, fuzzy_end: true },
  { text: "Issachar", category: "Fils de Léa", start: "-1767-09-29 00:00:00", end: "-1659-03-05 11:44:23", fuzzy_start: true, fuzzy_end: true },
  { text: "Zabulon", category: "Fils de Léa", start: "-1766-09-03 09:41:39", end: "-1659-03-05 11:44:23", fuzzy_start: true, fuzzy_end: true },
  { text: "Benjamin", category: "FIls de Rachel", start: "-1757-01-01 00:00:00", end: "-1659-06-17 07:44:02", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["bethlehem"] },

  { text: "Moïse", category: "Personnage", start: "-1592-01-01 00:00:00", end: "-1472-01-01 00:00:00", associatedLocationIds: ["memphis", "sinai", "kadesh_barnea", "moab"] },
  { text: "Samuel", category: "Prophètes (ou période de ministère)", start: "-1189-01-01 00:00:00", end: "-1094-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["shiloh", "ramah"] },
  { text: "David", category: "Personnage", start: "-1106-01-01 00:00:00", end: "-1036-01-01 00:00:00", associatedLocationIds: ["bethlehem", "hebron", "jerusalem"] },
  { text: "Anne", category: "Personnage", start: "-85-01-10 00:00:00", end: "5-05-13 00:00:00", fuzzy_end: true, description: "Prophétesse", associatedLocationIds: ["jerusalem"] },

  // Kings of Judah
  { text: "Roboam", category: "Roi de Juda", start: "-996-01-01 00:00:00", end: "-979-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Abia (Abiyam)", category: "Roi de Juda", start: "-979-01-01 00:00:00", end: "-977-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Asa", category: "Roi de Juda", start: "-977-01-01 00:00:00", end: "-936-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Josaphat", category: "Roi de Juda", start: "-936-01-02 00:00:00", end: "-911-12-31 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Joram", category: "Roi de Juda", start: "-912-01-01 00:00:00", end: "-906-12-31 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Ochozias", category: "Roi de Juda", start: "-905-01-01 00:00:00", end: "-905-12-31 00:00:00", fuzzy_start: true, associatedLocationIds: ["jerusalem"] },
  { text: "Athalie (reine)", category: "Roi de Juda", start: "-904-01-01 00:00:00", end: "-898-12-31 00:00:00", fuzzy_start: true, associatedLocationIds: ["jerusalem"] },
  { text: "Joas", category: "Roi de Juda", start: "-897-01-01 00:00:00", end: "-857-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Amazia", category: "Roi de Juda", start: "-857-01-01 00:00:00", end: "-828-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Ozias (Azarias)", category: "Roi de Juda", start: "-828-01-01 00:00:00", end: "-776-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Jotam", category: "Roi de Juda", start: "-776-01-01 00:00:00", end: "-761-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Achaz", category: "Roi de Juda", start: "-761-01-01 00:00:00", end: "-745-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Ezéchias", category: "Roi de Juda", start: "-745-01-01 00:00:00", end: "-715-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Manassé", category: "Roi de Juda", start: "-715-01-02 00:00:00", end: "-660-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Amon", category: "Roi de Juda", start: "-660-01-01 00:00:00", end: "-658-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Josias", category: "Roi de Juda", start: "-658-01-01 00:00:00", end: "-627-01-01 00:00:00", associatedLocationIds: ["jerusalem", "megiddo"] },
  { text: "Joachaz", category: "Roi de Juda", start: "-627-01-01 00:00:00", end: "-627-04-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Joachim", category: "Roi de Juda", start: "-627-04-01 00:00:00", end: "-617-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Joachin", category: "Roi de Juda", start: "-617-01-01 00:00:00", end: "-617-04-10 00:00:00", associatedLocationIds: ["jerusalem", "babylon"] },
  { text: "Sédécias", category: "Roi de Juda", start: "-617-04-11 00:00:00", end: "-606-01-01 00:00:00", associatedLocationIds: ["jerusalem", "babylon"] },

  // Kings of Israel
  { text: "Jéroboam", category: "Roi d'Israel", start: "-996-01-01 00:00:00", end: "-975-01-01 00:00:00", associatedLocationIds: ["shechem", "dan", "bethel"] },
  { text: "Nadab", category: "Roi d'Israel", start: "-975-01-01 00:00:00", end: "-974-12-31 00:00:00", fuzzy_start: true, fuzzy_end: true },
  { text: "Baasa", category: "Roi d'Israel", start: "-973-01-01 00:00:00", end: "-951-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["tirzah"] },
  { text: "Ela", category: "Roi d'Israel", start: "-951-01-01 00:00:00", end: "-950-12-24 00:00:00", fuzzy_start: true, associatedLocationIds: ["tirzah"] },
  { text: "Zimri", category: "Roi d'Israel", start: "-950-12-24 00:00:00", end: "-950-12-31 00:00:00", associatedLocationIds: ["tirzah"] },
  { text: "Omri et Tibni", category: "Roi d'Israel", start: "-949-01-01 00:00:00", end: "-946-01-01 00:00:00", associatedLocationIds: ["samaria"] },
  { text: "Omri (seul)", category: "Roi d'Israel", start: "-946-01-01 00:00:00", end: "-939-01-01 00:00:00", associatedLocationIds: ["samaria"] },
  { text: "Achab", category: "Roi d'Israel", start: "-939-01-01 00:00:00", end: "-919-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["samaria", "jezreel"] },
  { text: "Ochozias", category: "Roi d'Israel", start: "-919-01-01 00:00:00", end: "-916-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["samaria"] },
  { text: "Joram", category: "Roi d'Israel", start: "-916-01-01 00:00:00", end: "-904-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["samaria", "jezreel"] },
  { text: "Jéhu", category: "Roi d'Israel", start: "-904-01-01 00:00:00", end: "-875-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["samaria", "jezreel"] },
  { text: "Joachaz", category: "Roi d'Israel", start: "-875-01-02 00:00:00", end: "-861-01-02 00:00:00", associatedLocationIds: ["samaria"] },
  { text: "Joachaz et Joas", category: "Roi d'Israel", start: "-861-01-01 00:00:00", end: "-858-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true },
  { text: "Joas", category: "Roi d'Israel", start: "-858-01-01 00:00:00", end: "-843-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["samaria"] },
  { text: "Jéroboam II", category: "Roi d'Israel", start: "-843-01-01 00:00:00", end: "-802-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["samaria"] },
  { text: "Zacharie", category: "Roi d'Israel", start: "-802-01-01 00:00:00", end: "-790-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, description: "Seulement 6 mois de règne confirmé" },
  { text: "Shaloum", category: "Roi d'Israel", start: "-790-01-01 00:00:00", end: "-790-02-01 00:00:00" },
  { text: "Menahem", category: "Roi d'Israel", start: "-790-02-01 00:00:00", end: "-779-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true },
  { text: "Pekaya", category: "Roi d'Israel", start: "-779-01-01 00:00:00", end: "-777-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true },
  { text: "Péka", category: "Roi d'Israel", start: "-777-01-01 00:00:00", end: "-757-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true },
  { text: "Osée", category: "Roi d'Israel", start: "-757-01-01 00:00:00", end: "-739-01-01 00:00:00", fuzzy_start: true, description: "Dernier roi d'Israël avant la prise de Samarie par l'Assyrie", associatedLocationIds: ["samaria"] },

  // Reigns & United Monarchy
  { text: "Saül", category: "Règnes", start: "-1119-01-01 00:00:00", end: "-1076-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["gibeah"] },
  { text: "Ish-Bosheth", category: "Règnes", start: "-1076-01-01 00:00:00", end: "-1074-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["mahanaim"] },
  { text: "David - Israel (12 Tribus)", category: "Règnes", start: "-1076-01-01 00:00:00", end: "-1036-01-01 00:00:00", associatedLocationIds: ["hebron", "jerusalem"] },
  { text: "Salomon - Israel (12 Tribus)", category: "Règnes", start: "-1036-01-02 00:00:00", end: "-997-12-31 00:00:00", associatedLocationIds: ["jerusalem"] },

  // Prophets
  { text: "Elie", category: "Prophètes (ou période de ministère)", start: "-939-01-01 00:00:00", end: "-904-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["carmel", "samaria"] },
  { text: "Elisée", category: "Prophètes (ou période de ministère)", start: "-916-01-01 00:00:00", end: "-849-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["samaria", "shunam"] },
  { text: "Jonas", category: "Prophètes (ou période de ministère)", start: "-849-01-01 00:00:00", end: "-814-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["joppa", "nineveh"] },
  { text: "Amos", category: "Prophètes (ou période de ministère)", start: "-828-01-01 00:00:00", end: "-799-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["tekoa", "bethel"] },
  { text: "Joël", category: "Prophètes (ou période de ministère)", start: "-824-01-01 00:00:00", end: "-809-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["jerusalem"] },
  { text: "Osée", category: "Prophètes (ou période de ministère)", start: "-809-01-01 00:00:00", end: "-739-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["samaria"] },
  { text: "Isaïe", category: "Prophètes (ou période de ministère)", start: "-789-01-01 00:00:00", end: "-730-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["jerusalem"] },
  { text: "Michée", category: "Prophètes (ou période de ministère)", start: "-776-01-01 00:00:00", end: "-715-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["moresheth", "jerusalem"] },
  { text: "Jérémie", category: "Prophètes (ou période de ministère)", start: "-666-01-01 00:00:00", end: "-599-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, description: "Mission prophétique", associatedLocationIds: ["anathoth", "jerusalem"] },
  { text: "Daniel", category: "Prophètes (ou période de ministère)", start: "-633-01-01 00:00:00", end: "-533-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["babylon", "susa"] },

  // Key Events
  { text: "Déluge", category: "Événements Marquants", start: "-2369-10-31 00:00:00", end: "-2369-10-31 00:00:00", associatedLocationIds: ["ararat"] },
  { text: "Jéhovah décrète le Déluge", category: "Événements Marquants", start: "-2489-01-01 00:00:00", end: "-2489-01-01 00:00:00" },
  { text: "Periode Possible Tour de Babel", category: "Événements Marquants", start: "-2268-01-02 00:00:00", end: "-2028-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, description: "Genèse 10:25", associatedLocationIds: ["babylon"] },
  { text: "Alliance avec Abraham", category: "Événements Marquants", start: "-1942-01-01 00:00:00", end: "-1942-01-01 00:00:00", description: "14 Nisan", associatedLocationIds: ["shechem", "hebron"] },
  { text: "Jacob fuit son frère à Haran", category: "Événements Marquants", start: "-1780-01-01 00:00:00", end: "-1780-01-01 00:00:00", description: "Source : It(2) Rachel", associatedLocationIds: ["beersheba", "bethel", "haran"] },
  { text: "Retrouvailles avec Joseph", category: "Événements Marquants", start: "-1727-01-01 00:00:00", end: "-1727-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["goshen"] },
  { text: "Épreuve de Job ?", category: "Événements Marquants", start: "-1656-01-01 00:00:00", end: "-1511-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, description: "L'épreuve de Job s'est déroulée entre la mort de Joseph et le choix de Moïse." },
  { text: "Sortie d’Égypte", category: "Événements Marquants", start: "-1512-01-01 00:00:00", end: "-1512-01-01 00:00:00", associatedLocationIds: ["ramses", "red_sea", "sinai"] },
  { text: "Alliance de la Loi", category: "Événements Marquants", start: "-1512-01-01 00:00:00", end: "-1512-01-01 00:00:00", associatedLocationIds: ["sinai"] },
  { text: "Entrée en Canaan sous la direction de Josué", category: "Événements Marquants", start: "-1472-01-01 00:00:00", end: "-1472-01-01 00:00:00", associatedLocationIds: ["jordan_river", "jericho", "gilgal"] },
  { text: "Division des tribus d’Israël en deux royaumes", category: "Événements Marquants", start: "-996-01-01 00:00:00", end: "-996-01-01 00:00:00", associatedLocationIds: ["shechem", "jerusalem"] },
  { text: "Prise de Samarie par l'Assyrie", category: "Événements Marquants", start: "-739-01-01 00:00:00", end: "-739-01-01 00:00:00", description: "L’Assyrie prend Samarie, fin du royaume du Nord.", associatedLocationIds: ["samaria"] },
  { text: "Fin de la compilation des Proverbes", category: "Événements Marquants", start: "-716-01-01 00:00:00", end: "-716-01-01 00:00:00", fuzzy_start: true },
  { text: "Livre de la loi retrouvé dans le temple", category: "Événements Marquants", start: "-639-01-01 00:00:00", end: "-639-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Jérusalem tombe sous la domination de Babylone.", category: "Événements Marquants", start: "-619-01-01 00:00:00", end: "-619-01-01 00:00:00", associatedLocationIds: ["jerusalem", "babylon"] },
  { text: "Babylone emmène les premiers captifs de Jérusalem.", category: "Événements Marquants", start: "-616-01-01 00:00:00", end: "-616-01-01 00:00:00", associatedLocationIds: ["jerusalem", "babylon"] },
  { text: "Destruction de Jérusalem par les Babyloniens", category: "Événements Marquants", start: "-606-01-01 00:00:00", end: "-606-01-01 00:00:00", associatedLocationIds: ["jerusalem", "babylon"] },
  { text: "Prise de Babylone par Cyrus", category: "Événements Marquants", start: "-538-01-01 00:00:00", end: "-538-01-01 00:00:00", associatedLocationIds: ["babylon"] },
  { text: "Retour des Juifs à Jérusalem", category: "Événements Marquants", start: "-536-01-01 00:00:00", end: "-536-01-01 00:00:00", description: "Décret de Cyrus de rebâtir le temple.", associatedLocationIds: ["jerusalem", "babylon"] },
  { text: "Alexandre le Grand conquit Jérusalem", category: "Événements Marquants", start: "-331-01-01 00:00:00", end: "-331-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Colonie juive en Égypte", category: "Événements Marquants", start: "-319-01-01 00:00:00", end: "-319-01-01 00:00:00", description: "Ptolémée Ier encouragea les Juifs à venir en Égypte.", associatedLocationIds: ["alexandria"] },
  { text: "Prise de pouvoir des Séleucides", category: "Événements Marquants", start: "-197-01-01 00:00:00", end: "-197-01-01 00:00:00", associatedLocationIds: ["jerusalem", "sidon"] },
  { text: "Révolte des Maccabées", category: "Événements Marquants", start: "-167-01-01 00:00:00", end: "-167-01-01 00:00:00", description: "Profanation puis redédicace du temple.", associatedLocationIds: ["jerusalem"] },
  { text: "Demande d'aide à Rome", category: "Événements Marquants", start: "-159-01-01 00:00:00", end: "-159-01-01 00:00:00", associatedLocationIds: ["rome", "jerusalem"] },
  { text: "Prise de Jérusalem par Pompée", category: "Événements Marquants", start: "-62-01-01 00:00:00", end: "-62-01-01 00:00:00", description: "Pompée prend Jérusalem et annexa la Judée à l'empire.", associatedLocationIds: ["jerusalem", "rome"] },
  { text: "Hérode institué par Rome", category: "Événements Marquants", start: "-38-01-01 00:00:00", end: "-38-01-01 00:00:00", associatedLocationIds: ["jerusalem", "rome"] },

  // Restoration of Jerusalem
  { text: "Autel établi ; sacrifices offerts", category: "Rétablissement de Jérusalem", start: "-536-07-01 00:00:00", end: "-536-07-01 00:00:00", description: "Esdras 3:3", associatedLocationIds: ["jerusalem"] },
  { text: "Fondations posées", category: "Rétablissement de Jérusalem", start: "-535-01-01 00:00:00", end: "-535-01-01 00:00:00", description: "Esdras 3:10,11", associatedLocationIds: ["jerusalem"] },
  { text: "Le roi Artaxerxès fait arrêter la construction", category: "Rétablissement de Jérusalem", start: "-521-01-01 00:00:00", end: "-521-01-01 00:00:00", description: "Esdras 4:23,24", associatedLocationIds: ["jerusalem"] },
  { text: "Zekaria et Haggaï encouragent le peuple à reprendre les travaux", category: "Rétablissement de Jérusalem", start: "-519-01-01 00:00:00", end: "-519-01-01 00:00:00", description: "Esdras 5:1,2", associatedLocationIds: ["jerusalem"] },
  { text: "Temple achevé", category: "Rétablissement de Jérusalem", start: "-514-01-01 00:00:00", end: "-514-01-01 00:00:00", description: "Esdras 6:15", associatedLocationIds: ["jerusalem"] },
  { text: "Reconstruction des murs de Jérusalem ; début des 69 semaines d’années", category: "Rétablissement de Jérusalem", start: "-454-01-01 00:00:00", end: "-454-01-01 00:00:00", associatedLocationIds: ["jerusalem"] },

  // Christian Era & Jesus
  { text: "Naissance de Jésus", category: "Événements Marquants", start: "-1-01-10 00:00:00", end: "-1-01-10 00:00:00", fuzzy_start: true, associatedLocationIds: ["bethlehem", "nazareth"] },
  { text: "Jésus bébé présenté au Temple", category: "Événements Marquants", start: "-1-10-11 00:00:00", end: "-1-10-11 00:00:00", associatedLocationIds: ["jerusalem"] },
  { text: "Jésus (en tant qu'humain)", category: "Personnage", start: "-1-01-10 00:00:00", end: "33-04-03 00:00:00", associatedLocationIds: ["bethlehem", "nazareth", "capernaum", "jerusalem"] },
  { text: "Jean le Baptiseur", category: "Personnage", start: "-2-01-01 00:00:00", end: "32-01-01 00:00:00", associatedLocationIds: ["jordan_river"] },
  { text: "Paul arrive à Jérusalem (Chrétien)", category: "Événements Marquants", start: "36-06-01 00:00:00", end: "36-06-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["jerusalem", "damascus"] },
  { text: "Vision du troisième ciel", category: "Événements Marquants", start: "41-06-01 00:00:00", end: "41-06-01 00:00:00", fuzzy_start: true },
  { text: "Pierre Libéré de prison par un ange", category: "Événements Marquants", start: "44-03-25 00:00:00", end: "44-03-25 00:00:00", fuzzy_start: true, associatedLocationIds: ["jerusalem"] },
  { text: "Mort de Hérode Agrippa 1er", category: "Événements Marquants", start: "44-06-01 00:00:00", end: "44-06-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["caesarea"] },
  { text: "Famine annoncée par Agabus", category: "Événements Marquants", start: "46-06-01 00:00:00", end: "46-06-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["antioch_syria", "jerusalem"] },
  { text: "Question de la circoncision", category: "Événements Marquants", start: "49-04-01 00:00:00", end: "49-04-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["jerusalem", "antioch_syria"] },

  // Paul's Journeys
  { text: "1er Voyage missionnaire", category: "Voyages de Paul", start: "47-03-21 00:00:00", end: "48-09-21 00:00:00", fuzzy_start: true, fuzzy_end: true, description: "Voyage à Chypre, Lystre, Iconium, Antioche de Pisidie.", associatedLocationIds: ["antioch_syria", "paphos", "iconium", "lystra", "derbe"] },
  { text: "2e Voyage missionnaire", category: "Voyages de Paul", start: "49-06-01 00:00:00", end: "52-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["antioch_syria", "troas", "philippi", "thessalonica", "athens", "corinth"] },
  { text: "3e Voyage missionnaire", category: "Voyages de Paul", start: "52-01-01 00:00:00", end: "56-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["ephesus", "corinth", "miletus", "jerusalem"] },
  { text: "Prison à Césarée", category: "Voyages de Paul", start: "56-06-01 00:00:00", end: "58-06-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["caesarea"] },
  { text: "Paul est envoyé à Rome", category: "Voyages de Paul", start: "58-06-01 00:00:00", end: "58-06-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["caesarea", "malta", "rome"] },
  { text: "Détention dans une maison louée", category: "Voyages de Paul", start: "59-01-01 00:00:00", end: "61-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["rome"] },
  { text: "Deuxième emprisonnement à Rome", category: "Voyages de Paul", start: "65-01-01 00:00:00", end: "66-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["rome"] },

  // Epistles Writing
  { text: "1ère Lettre aux Thessaloniciens", category: "Rédaction livre biblique", start: "50-01-02 00:00:00", end: "50-01-02 00:00:00", fuzzy_start: true, associatedLocationIds: ["corinth"] },
  { text: "2nde Lettre aux Thessaloniciens", category: "Rédaction livre biblique", start: "51-01-01 00:00:00", end: "51-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["corinth"] },
  { text: "Lettre aux Galates", category: "Rédaction livre biblique", start: "51-01-01 00:00:00", end: "51-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["antioch_syria"] },
  { text: "1ère Lettre aux Corinthiens", category: "Rédaction livre biblique", start: "55-01-02 00:00:00", end: "55-01-02 00:00:00", fuzzy_start: true, associatedLocationIds: ["ephesus"] },
  { text: "2nde Lettre aux Corinthiens", category: "Rédaction livre biblique", start: "55-06-03 00:00:00", end: "55-06-03 00:00:00", fuzzy_start: true, associatedLocationIds: ["philippi"] },
  { text: "Lettre aux Romains", category: "Rédaction livre biblique", start: "56-01-01 00:00:00", end: "56-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["corinth"] },
  { text: "Lettre aux Éphésiens", category: "Rédaction livre biblique", start: "60-06-02 00:00:00", end: "60-06-02 00:00:00", fuzzy_start: true, associatedLocationIds: ["rome"] },
  { text: "Lettre aux Colossiens", category: "Rédaction livre biblique", start: "60-06-03 00:00:00", end: "60-06-03 00:00:00", fuzzy_start: true, associatedLocationIds: ["rome"] },
  { text: "Lettre à Philémon", category: "Rédaction livre biblique", start: "60-06-03 00:00:00", end: "60-06-03 00:00:00", fuzzy_start: true, associatedLocationIds: ["rome"] },
  { text: "Lettre aux Hébreux", category: "Rédaction livre biblique", start: "61-01-01 00:00:00", end: "61-01-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["rome"] },
  { text: "1ère Lettre à Timothée", category: "Rédaction livre biblique", start: "62-06-02 00:00:00", end: "62-06-02 00:00:00", fuzzy_start: true, associatedLocationIds: ["macedonia"] },
  { text: "Lettre à Tite", category: "Rédaction livre biblique", start: "63-01-01 00:00:00", end: "63-01-01 00:00:00", associatedLocationIds: ["macedonia"] },
  { text: "2ème Lettre à Timothée", category: "Rédaction livre biblique", start: "65-06-01 00:00:00", end: "65-06-01 00:00:00", fuzzy_start: true, associatedLocationIds: ["rome"] },

  { text: "Grand incendie de Rome", category: "Événements Marquants", start: "64-07-01 00:00:00", end: "64-07-01 00:00:00", associatedLocationIds: ["rome"] },
  { text: "Domitien", category: "Règnes", start: "81-01-01 00:00:00", end: "96-01-01 00:00:00", associatedLocationIds: ["rome"] },
  { text: "Jean", category: "Personnage", start: "0-01-01 00:00:00", end: "99-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["jerusalem", "patmos", "ephesus"] },
  { text: "Timothée", category: "Personnage", start: "30-01-01 00:00:00", end: "110-01-01 00:00:00", fuzzy_start: true, fuzzy_end: true, associatedLocationIds: ["lystra", "ephesus"] },
  { text: "Jésus est établi Roi et Berger", category: "Événements Marquants", start: "1914-10-01 00:00:00", end: "1914-10-01 00:00:00" },
  { text: "Nomination de l'esclave fidèle et avisé", category: "Événements Marquants", start: "1919-01-01 00:00:00", end: "1919-01-01 00:00:00" }
];

export const EVENTS: EventData[] = rawEventsData.map(ev => {
  const pStart = parseTimelineDate(ev.start);
  const pEnd = parseTimelineDate(ev.end);
  const isPoint = Math.abs(pEnd.position - pStart.position) < 0.01;
  const category = normalizeCategoryName(ev.category);

  return {
    id: createEventId(ev.text, ev.start, category),
    text: ev.text,
    categoryId: createCategoryId(category),
    category,
    startRaw: ev.start,
    endRaw: ev.end,
    startYear: pStart.year,
    endYear: pEnd.year,
    startPos: pStart.position,
    endPos: pEnd.position,
    isPoint,
    fuzzyStart: !!ev.fuzzy_start,
    fuzzyEnd: !!ev.fuzzy_end,
    description: ev.description,
    icon: ev.icon,
    defaultColor: ev.default_color,
    associatedLocationIds: ev.associatedLocationIds || []
  };
});
