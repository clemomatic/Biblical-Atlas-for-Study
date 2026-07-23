import { EraData, CategoryData } from '../types';
import { parseTimelineDate, rgbToHex } from '../utils/dateUtils';

const rawEras = [
  { id: 'era_1', name: "De la création d'Adam au Déluge", start: "-4025-01-01 00:00:00", end: "-2369-01-01 00:00:00", color: "196,205,219" },
  { id: 'era_2', name: "Déluge jusqu'à l'alliance Abrahamique", start: "-2369-01-01 00:00:00", end: "-1942-01-01 00:00:00", color: "206,227,217" },
  { id: 'era_3', name: "De l'alliance Abrahamique à l'Exode", start: "-1942-01-01 00:00:00", end: "-1512-01-01 00:00:00", color: "196,217,197" },
  { id: 'era_4', name: "De l'Exode à la construction du Temple", start: "-1512-01-01 00:00:00", end: "-1033-01-01 00:00:00", color: "188,208,168" },
  { id: 'era_5', name: "De la construction du Temple à la scission du Royaume", start: "-1033-01-01 00:00:00", end: "-996-01-01 00:00:00", color: "213,211,181" },
  { id: 'era_6', name: "Des deux Royaumes à la déstruction de Jérusalem", start: "-996-01-01 00:00:00", end: "-606-01-01 00:00:00", color: "216,200,184" },
  { id: 'era_7', name: "De la Déstruction de Jérusalem au retour d'Exil", start: "-606-01-01 00:00:00", end: "-536-01-01 00:00:00", color: "219,181,181" },
  { id: 'era_8', name: "Du retour d'Exil à la reconstruction de la muraille", start: "-536-01-01 00:00:00", end: "-454-01-01 00:00:00", color: "225,198,205" },
  { id: 'era_9', name: "De la reconstruction de la muraille au baptème de Jésus", start: "-454-01-01 00:00:00", end: "29-01-01 00:00:00", color: "216,180,220" },
  { id: 'era_10', name: "De l'époque de Jésus à Aujourd'hui", start: "29-01-01 00:00:00", end: "2050-12-01 00:00:00", color: "189,184,216" }
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
  { name: "Personnage", color: "0,128,255" },
  { name: "Prophètes (ou période de ministère)", color: "128,0,255", parent: "Personnage" },
  { name: "Règnes", color: "237,5,5", parent: "Personnage" },
  { name: "Roi de Juda", color: "189,4,55", parent: "Règnes" },
  { name: "Roi d'Israel", color: "255,64,0", parent: "Règnes" },
  { name: "Fils de Jacob", color: "128,0,255", parent: "Personnage" },
  { name: "Fils de Léa", color: "4,182,213", parent: "Fils de Jacob" },
  { name: "Fils de Bila", color: "171,134,249", parent: "Fils de Jacob" },
  { name: "Fils de Zilpa", color: "0,0,160", parent: "Fils de Jacob" },
  { name: "FIls de Rachel", color: "149,149,255", parent: "Fils de Jacob" },
  { name: "Événements Marquants", color: "128,0,128" },
  { name: "Rétablissement de Jérusalem", color: "15,181,85", parent: "Événements Marquants" },
  { name: "Voyages de Paul", color: "19,163,12", parent: "Événements Marquants" },
  { name: "Chronologie Bilique", color: "0,0,255" },
  { name: "Periode Livre Biblique", color: "128,128,255", parent: "Chronologie Bilique" },
  { name: "Rédaction livre biblique", color: "64,128,128", parent: "Chronologie Bilique" }
];

export const CATEGORIES: CategoryData[] = rawCategories.map(c => ({
  name: c.name,
  color: c.color,
  hexColor: rgbToHex(c.color),
  parent: c.parent
}));
