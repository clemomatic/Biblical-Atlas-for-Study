import {
  JESUS_ID,
  JOHN_BAPTIST_ID,
  PERSON_IDS,
  area,
  datePeriod,
  group,
  jesus,
  johnBaptist,
  person,
  point,
  rangePeriod,
  region,
  row,
  yearPeriod
} from './common.mjs';

const gabriel = person('Gabriel', PERSON_IDS.gabriel);
const zachariah = person('Zacharie', PERSON_IDS.zachariah);
const mary = person('Marie', PERSON_IDS.maryMother);
const elizabeth = person('Élisabeth', PERSON_IDS.elizabeth);
const joseph = person('Joseph', PERSON_IDS.joseph);
const herod = person('Hérode le Grand', PERSON_IDS.herodGreat);

export const A7_A = {
  code: 'a7-a',
  sourceId: 'source-nwtsty-a7-a',
  title:
    'Principaux évènements de la vie terrestre de Jésus : avant le ministère de Jésus',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/evenements-vie-terrestre-de-jesus/',
  chapterOrAppendix: 'Appendice A7-A',
  stagingFile: 'a7-a-avant-ministere.json',
  events: [
    row(
      'annonce-naissance-jean',
      yearPeriod(-3, '3 av. n. è.'),
      [area('Jérusalem, Temple', 'jerusalem')],
      'Gabriel annonce la naissance de Jean à Zacharie',
      ['Luc 1:5-25'],
      {
        participants: [gabriel, zachariah],
        presencePersonIds: [PERSON_IDS.gabriel, PERSON_IDS.zachariah],
        interactions: [[PERSON_IDS.gabriel, PERSON_IDS.zachariah]]
      }
    ),
    row(
      'annonce-naissance-jesus-visite-elisabeth',
      yearPeriod(-2, 'Vers 2 av. n. è.', {
        certainty: 'probable',
        approximate: true
      }),
      [point('Nazareth', 'nazareth'), region('Judée')],
      'Gabriel annonce la naissance de Jésus ; Marie visite Élisabeth',
      ['Luc 1:26-56'],
      {
        participants: [gabriel, mary, elizabeth],
        presencePersonIds: [PERSON_IDS.gabriel, PERSON_IDS.maryMother],
        interactions: [
          [PERSON_IDS.gabriel, PERSON_IDS.maryMother],
          [PERSON_IDS.maryMother, PERSON_IDS.elizabeth]
        ],
        unresolvedItems: [
          'La localité de Judée où Marie rejoint Élisabeth n’est pas précisée.'
        ]
      }
    ),
    row(
      'naissance-jean',
      yearPeriod(-2, '2 av. n. è.'),
      [region('Région montagneuse de Judée')],
      'Naissance de Jean le Baptiseur et prophétie de Zacharie',
      ['Luc 1:57-80'],
      {
        participants: [johnBaptist, zachariah, elizabeth],
        presencePersonIds: [],
        unresolvedItems: [
          'La source indique une région, sans localité ponctuelle.'
        ]
      }
    ),
    row(
      'naissance-jesus',
      datePeriod(-2, 10, 1, 'Vers le 1er octobre 2 av. n. è.'),
      [point('Bethléem', 'bethlehem')],
      'Naissance de Jésus à Bethléem',
      ['Matthieu 1:1-25', 'Luc 2:1-7', 'Jean 1:14'],
      {
        participants: [jesus, mary, joseph],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.maryMother,
          PERSON_IDS.joseph
        ],
        supersedesLegacyEventIds: [
          'event-naissance-de-jesus-1ydqjh'
        ]
      }
    ),
    row(
      'annonce-bergers',
      datePeriod(-2, 10, 1, 'Vers le 1er octobre 2 av. n. è.'),
      [
        area('Près de Bethléem', 'bethlehem'),
        point('Bethléem', 'bethlehem')
      ],
      'Des bergers apprennent la naissance de Jésus et lui rendent visite',
      ['Luc 2:8-20'],
      {
        participants: [
          jesus,
          mary,
          joseph,
          group('des bergers'),
          group('des anges')
        ],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.maryMother,
          PERSON_IDS.joseph
        ]
      }
    ),
    row(
      'circoncision-presentation-temple',
      yearPeriod(-2, 'Après la naissance de Jésus en 2 av. n. è.', {
        certainty: 'certain',
        approximate: true
      }),
      [point('Bethléem', 'bethlehem'), area('Jérusalem, Temple', 'jerusalem')],
      'Jésus est circoncis puis présenté au Temple',
      ['Luc 2:21-38'],
      {
        participants: [jesus, mary, joseph],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.maryMother,
          PERSON_IDS.joseph
        ],
        supersedesLegacyEventIds: [
          'event-jesus-bebe-presente-au-temple-1usjr0d'
        ]
      }
    ),
    row(
      'astrologues-fuite-egypte-retour',
      rangePeriod(
        -1,
        1,
        '1 av. n. è. ou 1 de n. è.',
        'probable'
      ),
      [
        point('Jérusalem', 'jerusalem'),
        point('Bethléem', 'bethlehem'),
        region('Égypte'),
        point('Nazareth', 'nazareth')
      ],
      'Visite des astrologues, fuite en Égypte et installation à Nazareth',
      ['Matthieu 2:1-23', 'Luc 2:39-40'],
      {
        participants: [
          jesus,
          mary,
          joseph,
          herod,
          group('des astrologues')
        ],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.maryMother,
          PERSON_IDS.joseph
        ],
        extraPresences: [
          {
            personId: PERSON_IDS.herodGreat,
            placeId: 'jerusalem',
            presenceType: 'reign-seat',
            certainty: 'certain'
          }
        ],
        unresolvedItems: [
          'Aucun point d’Égypte n’est attribué : le pays seul est indiqué.'
        ]
      }
    ),
    row(
      'jesus-douze-ans-temple',
      yearPeriod(12, 'Pâque 12 de n. è.', {
        season: 'spring'
      }),
      [area('Jérusalem, Temple', 'jerusalem')],
      'À douze ans, Jésus échange avec les enseignants au Temple',
      ['Luc 2:41-50'],
      {
        participants: [jesus, mary, joseph, group('des enseignants')],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.maryMother,
          PERSON_IDS.joseph
        ]
      }
    ),
    row(
      'vie-nazareth',
      rangePeriod(
        12,
        29,
        'De l’enfance au début du ministère',
        'certain'
      ),
      [point('Nazareth', 'nazareth')],
      'Jésus vit à Nazareth et exerce le métier de charpentier',
      ['Matthieu 13:55-56', 'Marc 6:3', 'Luc 2:51-52'],
      {
        participants: [jesus, mary, joseph, group('frères et sœurs de Jésus')],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.maryMother,
          PERSON_IDS.joseph
        ]
      }
    ),
    row(
      'debut-ministere-jean',
      yearPeriod(29, 'Printemps 29 de n. è.', {
        season: 'spring'
      }),
      [area('Désert'), area('Jourdain', 'jordan_river')],
      'Jean le Baptiseur commence son ministère',
      ['Matthieu 3:1-12', 'Marc 1:1-8', 'Luc 3:1-18', 'Jean 1:6-8'],
      {
        participants: [johnBaptist],
        presencePersonIds: [JOHN_BAPTIST_ID]
      }
    )
  ]
};
