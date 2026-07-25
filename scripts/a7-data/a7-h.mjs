import {
  JESUS_ID,
  PERSON_IDS,
  area,
  group,
  hebrewDayPeriod,
  jesus,
  person,
  point,
  region,
  row,
  yearPeriod
} from './common.mjs';

const judas = person('Judas Iscariote', PERSON_IDS.judas);
const peter = person('Pierre', PERSON_IDS.peter);
const annas = person('Anne', PERSON_IDS.annas);
const caiaphas = person('Caïphe', PERSON_IDS.caiaphas);
const pilate = person('Ponce Pilate', PERSON_IDS.pilate);
const herod = person('Hérode Antipas', PERSON_IDS.herodAntipas);
const barabbas = person('Barabbas', PERSON_IDS.barabbas);
const nisan14 = hebrewDayPeriod(33, 'nisan', 14, '14 nisan 33 de n. è.');
const nisan15 = hebrewDayPeriod(33, 'nisan', 15, '15 nisan 33 de n. è.');
const nisan16 = hebrewDayPeriod(33, 'nisan', 16, '16 nisan 33 de n. è.');
const afterNisan16 = yearPeriod(33, 'Après le 16 nisan 33 de n. è.', {
  approximate: true
});
const iyar25 = hebrewDayPeriod(33, 'iyar', 25, '25 iyar 33 de n. è.');
const jesusPresence = { participants: [jesus], presencePersonIds: [JESUS_ID] };

export const A7_H = {
  code: 'a7-h',
  sourceId: 'source-nwtsty-a7-h',
  title:
    'Principaux évènements de la vie terrestre de Jésus : ministère final de Jésus à Jérusalem (2e partie)',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/mort-et-resurrection-de-jesus/',
  chapterOrAppendix: 'Appendice A7-H',
  stagingFile: 'a7-h-ministere-final-2.json',
  events: [
    row(
      'judas-identifie-congedie',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus désigne Judas comme traître et le congédie',
      ['Matthieu 26:21-25', 'Marc 14:18-21', 'Luc 22:21-23', 'Jean 13:21-30'],
      {
        participants: [jesus, judas],
        presencePersonIds: [JESUS_ID, PERSON_IDS.judas],
        interactions: [[JESUS_ID, PERSON_IDS.judas]]
      }
    ),
    row(
      'institution-repas-seigneur',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus institue le Repas du Seigneur',
      ['Matthieu 26:26-29', 'Marc 14:22-25', 'Luc 22:19-20', 'Luc 22:24-30', '1 Corinthiens 11:23-25'],
      {
        participants: [jesus, group('les apôtres')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'prediction-reniements-dispersion',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus annonce les reniements de Pierre et la dispersion des apôtres',
      ['Matthieu 26:31-35', 'Marc 14:27-31', 'Luc 22:31-38', 'Jean 13:31-38'],
      {
        participants: [jesus, peter, group('les apôtres')],
        presencePersonIds: [JESUS_ID, PERSON_IDS.peter],
        interactions: [[JESUS_ID, PERSON_IDS.peter]]
      }
    ),
    row(
      'assistant-vigne-amour-priere',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus promet un assistant et prie avec ses apôtres',
      ['Jean 14:1-17:26'],
      {
        participants: [jesus, group('les apôtres')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'gethsemani-arrestation',
      nisan14,
      [area('Gethsémani', 'jerusalem')],
      'Jésus prie à Gethsémani puis est livré et arrêté',
      ['Matthieu 26:30', 'Matthieu 26:36-56', 'Marc 14:26', 'Marc 14:32-52', 'Luc 22:39-53', 'Jean 18:1-12'],
      {
        participants: [jesus, judas, group('les disciples')],
        presencePersonIds: [JESUS_ID, PERSON_IDS.judas],
        interactions: [[PERSON_IDS.judas, JESUS_ID]]
      }
    ),
    row(
      'anne-caiphe-sanhedrin-reniement',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus est interrogé par Anne et jugé par Caïphe ; Pierre le renie',
      ['Matthieu 26:57-27:1', 'Marc 14:53-15:1', 'Luc 22:54-71', 'Jean 18:13-27'],
      {
        participants: [jesus, annas, caiaphas, peter],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.annas,
          PERSON_IDS.caiaphas,
          PERSON_IDS.peter
        ],
        interactions: [
          [PERSON_IDS.annas, JESUS_ID],
          [PERSON_IDS.caiaphas, JESUS_ID]
        ]
      }
    ),
    row(
      'mort-judas',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Judas met fin à ses jours',
      ['Matthieu 27:3-10', 'Actes 1:18-19'],
      {
        participants: [judas],
        presencePersonIds: [PERSON_IDS.judas]
      }
    ),
    row(
      'devant-pilate-herode-pilate',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus comparaît devant Pilate puis Hérode, et de nouveau devant Pilate',
      ['Matthieu 27:2', 'Matthieu 27:11-14', 'Marc 15:1-5', 'Luc 23:1-12', 'Jean 18:28-38'],
      {
        participants: [jesus, pilate, herod],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.pilate,
          PERSON_IDS.herodAntipas
        ],
        interactions: [
          [PERSON_IDS.pilate, JESUS_ID],
          [PERSON_IDS.herodAntipas, JESUS_ID]
        ]
      }
    ),
    row(
      'barabbas-condamnation',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Barabbas est réclamé et Jésus est condamné',
      ['Matthieu 27:15-30', 'Marc 15:6-19', 'Luc 23:13-25', 'Jean 18:39-19:16'],
      {
        participants: [jesus, pilate, barabbas],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.pilate,
          PERSON_IDS.barabbas
        ],
        interactions: [[PERSON_IDS.pilate, JESUS_ID]]
      }
    ),
    row(
      'mort-jesus-golgotha',
      nisan14,
      [area('Golgotha', 'jerusalem')],
      'Jésus meurt sur le poteau de supplice vers 15 heures',
      ['Matthieu 27:31-56', 'Marc 15:20-41', 'Luc 23:26-49', 'Jean 19:16-30'],
      jesusPresence
    ),
    row(
      'mise-au-tombeau',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Le corps de Jésus est placé dans une tombe',
      ['Matthieu 27:57-61', 'Marc 15:42-47', 'Luc 23:50-56', 'Jean 19:31-42'],
      jesusPresence
    ),
    row(
      'tombe-scellee-gardee',
      nisan15,
      [point('Jérusalem', 'jerusalem')],
      'La tombe de Jésus est scellée et gardée',
      ['Matthieu 27:62-66'],
      {
        participants: [group('des prêtres et des pharisiens')],
        presencePersonIds: []
      }
    ),
    row(
      'resurrection-apparitions',
      nisan16,
      [area('Jérusalem et ses environs', 'jerusalem'), point('Emmaüs', 'obi-emmaus', 'probable')],
      'Jésus est ressuscité et apparaît à ses disciples',
      ['Matthieu 28:1-15', 'Marc 16:1-8', 'Luc 24:1-49', 'Jean 20:1-25'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'autres-apparitions-mission',
      afterNisan16,
      [point('Jérusalem', 'jerusalem'), region('Galilée')],
      'Jésus apparaît encore aux disciples et leur confie une mission',
      ['Matthieu 28:16-20', 'Jean 20:26-21:25', '1 Corinthiens 15:5-7', 'Actes 1:3-8'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'ascension',
      iyar25,
      [area('Mont des Oliviers, près de Béthanie', 'obi-bethany-1')],
      'Jésus monte au ciel quarante jours après sa résurrection',
      ['Luc 24:50-53', 'Actes 1:9-12'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    )
  ]
};

