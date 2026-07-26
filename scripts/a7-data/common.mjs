export const JESUS_ID = 'event-jesus-en-tant-qu-humain-1f4ceyz';
export const JOHN_BAPTIST_ID = 'event-jean-le-baptiseur-dvgl2c';

export const PERSON_IDS = {
  gabriel: 'person-a7-gabriel',
  zachariah: 'person-a7-zacharie-pretre',
  maryMother: 'person-a7-marie-mere-jesus',
  elizabeth: 'person-a7-elisabeth',
  joseph: 'person-a7-joseph-pere-adoptif',
  herodGreat: 'person-a7-herode-le-grand',
  peter: 'person-a7-pierre',
  andrew: 'person-a7-andre',
  jamesZebedee: 'person-a7-jacques-fils-zebedee',
  // Réutilise l’ID de la ligne Personnage existante pour éviter un doublon.
  johnApostle: 'event-jean-e4vx5j',
  matthew: 'person-a7-matthieu',
  jairus: 'person-a7-jaire',
  herodAntipas: 'person-a7-herode-antipas',
  lazarus: 'person-a7-lazare',
  martha: 'person-a7-marthe',
  maryBethany: 'person-a7-marie-bethanie',
  zacchaeus: 'person-a7-zachee',
  judas: 'person-a7-judas-iscariote',
  annas: 'person-a7-anne-grand-pretre',
  caiaphas: 'person-a7-caiphe',
  pilate: 'person-a7-ponce-pilate',
  barabbas: 'person-a7-barabbas'
};

export const PERSON_DEFINITIONS = {
  [PERSON_IDS.gabriel]: ['Gabriel', []],
  [PERSON_IDS.zachariah]: ['Zacharie', ['Père de Jean le Baptiseur']],
  [PERSON_IDS.maryMother]: ['Marie', ['Mère de Jésus']],
  [PERSON_IDS.elizabeth]: ['Élisabeth', []],
  [PERSON_IDS.joseph]: ['Joseph', ['Père adoptif de Jésus']],
  [PERSON_IDS.herodGreat]: ['Hérode le Grand', []],
  [PERSON_IDS.peter]: ['Pierre', ['Simon Pierre', 'Simon']],
  [PERSON_IDS.andrew]: ['André', []],
  [PERSON_IDS.jamesZebedee]: ['Jacques', ['Fils de Zébédée']],
  [PERSON_IDS.johnApostle]: ['Jean', ['Fils de Zébédée', 'Jean l’apôtre']],
  [PERSON_IDS.matthew]: ['Matthieu', ['Lévi']],
  [PERSON_IDS.jairus]: ['Jaïre', []],
  [PERSON_IDS.herodAntipas]: ['Hérode Antipas', []],
  [PERSON_IDS.lazarus]: ['Lazare', []],
  [PERSON_IDS.martha]: ['Marthe', []],
  [PERSON_IDS.maryBethany]: ['Marie de Béthanie', []],
  [PERSON_IDS.zacchaeus]: ['Zachée', []],
  [PERSON_IDS.judas]: ['Judas Iscariote', []],
  [PERSON_IDS.annas]: ['Anne', ['Hanne', 'ancien grand prêtre']],
  [PERSON_IDS.caiaphas]: ['Caïphe', []],
  [PERSON_IDS.pilate]: ['Ponce Pilate', ['Pilate']],
  [PERSON_IDS.barabbas]: ['Barabbas', []]
};

export const person = (
  label,
  personId,
  certainty = 'certain',
  notes
) => ({
  label,
  ...(personId ? { personId } : {}),
  certainty,
  ...(notes ? { notes } : {})
});

export const group = (label, notes) =>
  person(label, undefined, 'certain', notes);

export const point = (
  label,
  placeId,
  certainty = 'certain',
  notes
) => ({
  label,
  placeId,
  granularity: 'point',
  certainty,
  ...(notes ? { notes } : {})
});

export const area = (
  label,
  placeId,
  certainty = 'certain',
  notes
) => ({
  label,
  ...(placeId ? { placeId } : {}),
  granularity: 'area',
  certainty,
  ...(notes ? { notes } : {})
});

export const region = (label, certainty = 'certain', notes) => ({
  label,
  granularity: 'region',
  certainty,
  ...(notes ? { notes } : {})
});

const boundary = (
  yearMin,
  yearMax,
  precision,
  certainty,
  approximate,
  extra = {}
) => ({
  yearMin,
  yearMax,
  precision,
  certainty,
  ...(approximate ? { approximate: true } : {}),
  ...extra
});

export const yearPeriod = (
  year,
  displayLabel,
  {
    certainty = 'certain',
    approximate = false,
    season
  } = {}
) => {
  const precision = season ? 'season' : 'year';
  const value = boundary(
    year,
    year,
    precision,
    certainty,
    approximate,
    season ? { season } : {}
  );
  return {
    start: value,
    end: { ...value },
    displayLabel
  };
};

export const rangePeriod = (
  yearMin,
  yearMax,
  displayLabel,
  certainty = 'probable'
) => {
  const value = boundary(
    yearMin,
    yearMax,
    'range',
    certainty,
    true
  );
  return {
    start: value,
    end: { ...value },
    displayLabel
  };
};

export const datePeriod = (
  year,
  month,
  day,
  displayLabel,
  certainty = 'probable'
) => {
  const value = boundary(
    year,
    year,
    'day',
    certainty,
    certainty !== 'certain',
    { month, day }
  );
  return {
    start: value,
    end: { ...value },
    displayLabel
  };
};

export const hebrewDayPeriod = (
  year,
  calendarMonth,
  day,
  displayLabel
) => {
  const value = boundary(
    year,
    year,
    'day',
    'certain',
    false,
    {
      calendar: 'hebrew',
      calendarMonth,
      day
    }
  );
  return {
    start: value,
    end: { ...value },
    displayLabel
  };
};

export const row = (
  id,
  period,
  places,
  name,
  biblicalReferences,
  {
    participants = [],
    description = name,
    certainty = 'certain',
    presencePersonIds,
    extraPresences = [],
    interactions = [],
    unresolvedItems = [],
    supersedesLegacyEventIds = []
  } = {}
) => ({
  id,
  period,
  places,
  name,
  description,
  biblicalReferences,
  participants,
  certainty,
  presencePersonIds,
  extraPresences,
  interactions,
  unresolvedItems,
  supersedesLegacyEventIds
});

export const jesus = person('Jésus', JESUS_ID);
export const johnBaptist = person(
  'Jean le Baptiseur',
  JOHN_BAPTIST_ID
);
