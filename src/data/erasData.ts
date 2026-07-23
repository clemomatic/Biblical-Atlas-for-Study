import { EraData, CategoryData } from '../types';
import { parseTimelineDate, rgbToHex } from '../utils/dateUtils';

const rawEras = [
  { id: 'era_1', name: "De la création d'Adam au Déluge", start: "-4025-01-01 00:00:00", end: "-2369-01-01 00:00:00", color: "210,215,225" },
  { id: 'era_2', name: "Déluge jusqu'à l'alliance Abrahamique", start: "-2369-01-01 00:00:00", end: "-1942-01-01 00:00:00", color: "215,225,220" },
  { id: 'era_3', name: "De l'alliance Abrahamique à l'Exode", start: "-1942-01-01 00:00:00", end: "-1512-01-01 00:00:00", color: "205,222,210" },
  { id: 'era_4', name: "De l'Exode à la construction du Temple", start: "-1512-01-01 00:00:00", end: "-1033-01-01 00:00:00", color: "210,225,195" },
  { id: 'era_5', name: "De la construction du Temple à la scission du Royaume", start: "-1033-01-01 00:00:00", end: "-996-01-01 00:00:00", color: "225,220,195" },
  { id: 'era_6', name: "Des deux Royaumes à la déstruction de Jérusalem", start: "-996-01-01 00:00:00", end: "-606-01-01 00:00:00", color: "228,212,198" },
  { id: 'era_7', name: "De la Déstruction de Jérusalem au retour d'Exil", start: "-606-01-01 00:00:00", end: "-536-01-01 00:00:00", color: "230,202,202" },
  { id: 'era_8', name: "Du retour d'Exil à la reconstruction de la muraille", start: "-536-01-01 00:00:00", end: "-454-01-01 00:00:00", color: "232,208,220" },
  { id: 'era_9', name: "De la reconstruction de la muraille au baptème de Jésus", start: "-454-01-01 00:00:00", end: "29-01-01 00:00:00", color: "222,205,232" },
  { id: 'era_10', name: "De l'époque de Jésus à Aujourd'hui", start: "29-01-01 00:00:00", end: "2050-12-01 00:00:00", color: "202,212,238" }
];

export const ERAS: EraData[] = rawEras.map(e => {
  const pStart = parseTimelineDate(e.start);
  const pEnd = parseTimelineDate(e.end);
  return {
    id: e.id,
    name: e.name,
    startRaw: e.start,
    endRaw: e.end,
    startYear: pStart.year,
    endYear: pEnd.year,
    startPos: pStart.position,
    endPos: pEnd.position,
    color: e.color,
    hexColor: rgbToHex(e.color)
  };
});

const rawCategories = [
  { name: "Personnage", color: "37,99,235" },
  { name: "Prophètes (ou période de ministère)", color: "124,58,237", parent: "Personnage" },
  { name: "Règnes", color: "225,29,72", parent: "Personnage" },
  { name: "Roi de Juda", color: "190,18,60", parent: "Règnes" },
  { name: "Roi d'Israel", color: "234,88,12", parent: "Règnes" },
  { name: "Fils de Jacob", color: "109,40,217", parent: "Personnage" },
  { name: "Fils de Léa", color: "14,116,144", parent: "Fils de Jacob" },
  { name: "Fils de Bila", color: "147,51,234", parent: "Fils de Jacob" },
  { name: "Fils de Zilpa", color: "67,56,202", parent: "Fils de Jacob" },
  { name: "FIls de Rachel", color: "2,132,199", parent: "Fils de Jacob" },
  { name: "Événements Marquants", color: "168,85,247" },
  { name: "Rétablissement de Jérusalem", color: "16,185,129", parent: "Événements Marquants" },
  { name: "Voyages de Paul", color: "5,150,105", parent: "Événements Marquants" },
  { name: "Chronologie Bilique", color: "37,99,235" },
  { name: "Periode Livre Biblique", color: "99,102,241", parent: "Chronologie Bilique" },
  { name: "Rédaction livre biblique", color: "13,148,136", parent: "Chronologie Bilique" }
];

export const CATEGORIES: CategoryData[] = rawCategories.map(c => ({
  name: c.name,
  color: c.color,
  hexColor: rgbToHex(c.color),
  parent: c.parent
}));
