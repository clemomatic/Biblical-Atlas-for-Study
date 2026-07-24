const CATEGORY_ALIASES: Record<string, string> = {
  'Chronologie Bilique': 'Chronologie biblique',
  'Periode Livre Biblique': 'Période des livres bibliques',
  'Rédaction livre biblique': 'Rédaction d’un livre biblique',
  'Événements Marquants': 'Événements marquants',
  'FIls de Rachel': 'Fils de Rachel',
  "Roi d'Israel": 'Roi d’Israël'
};

export const normalizeCategoryName = (name: string): string =>
  CATEGORY_ALIASES[name] || name.trim();
