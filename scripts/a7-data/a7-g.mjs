import {
  JESUS_ID,
  PERSON_IDS,
  area,
  group,
  hebrewDayPeriod,
  jesus,
  person,
  point,
  row
} from './common.mjs';

const maryBethany = person('Marie', PERSON_IDS.maryBethany);
const judas = person('Judas Iscariote', PERSON_IDS.judas);
const nisan8 = hebrewDayPeriod(33, 'nisan', 8, '8 nisan 33 de n. è.');
const nisan9 = hebrewDayPeriod(33, 'nisan', 9, '9 nisan 33 de n. è.');
const nisan10 = hebrewDayPeriod(33, 'nisan', 10, '10 nisan 33 de n. è.');
const nisan11 = hebrewDayPeriod(33, 'nisan', 11, '11 nisan 33 de n. è.');
const nisan12 = hebrewDayPeriod(33, 'nisan', 12, '12 nisan 33 de n. è.');
const nisan13 = hebrewDayPeriod(33, 'nisan', 13, '13 nisan 33 de n. è.');
const nisan14 = hebrewDayPeriod(33, 'nisan', 14, '14 nisan 33 de n. è.');
const jesusPresence = { participants: [jesus], presencePersonIds: [JESUS_ID] };

export const A7_G = {
  code: 'a7-g',
  sourceId: 'source-nwtsty-a7-g',
  title:
    'Principaux évènements de la vie terrestre de Jésus : ministère final de Jésus à Jérusalem (1re partie)',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/ministere-final-jesus-la-cene/',
  chapterOrAppendix: 'Appendice A7-G',
  stagingFile: 'a7-g-ministere-final-1.json',
  events: [
    row(
      'arrivee-bethanie-six-jours',
      nisan8,
      [point('Béthanie', 'obi-bethany-1')],
      'Jésus arrive à Béthanie six jours avant la Pâque',
      ['Jean 11:55-12:1'],
      jesusPresence
    ),
    row(
      'marie-huile-jesus',
      nisan9,
      [point('Béthanie', 'obi-bethany-1')],
      'Marie verse une huile parfumée sur Jésus',
      ['Matthieu 26:6-13', 'Marc 14:3-9', 'Jean 12:2-11'],
      {
        participants: [jesus, maryBethany],
        presencePersonIds: [JESUS_ID, PERSON_IDS.maryBethany],
        interactions: [[PERSON_IDS.maryBethany, JESUS_ID]]
      }
    ),
    row(
      'entree-jerusalem',
      nisan9,
      [
        point('Béthanie', 'obi-bethany-1'),
        point('Bethphagé', 'obi-bethphage', 'probable'),
        point('Jérusalem', 'jerusalem')
      ],
      'Jésus entre à Jérusalem monté sur un âne',
      ['Matthieu 21:1-11', 'Matthieu 21:14-17', 'Marc 11:1-11', 'Luc 19:29-44', 'Jean 12:12-19'],
      jesusPresence
    ),
    row(
      'figuier-purification-temple',
      nisan10,
      [point('Béthanie', 'obi-bethany-1'), point('Jérusalem', 'jerusalem')],
      'Jésus maudit un figuier et purifie de nouveau le Temple',
      ['Matthieu 21:18-19', 'Matthieu 21:12-13', 'Marc 11:12-17', 'Luc 19:45-46'],
      jesusPresence
    ),
    row(
      'complot-pretres-scribes',
      nisan10,
      [point('Jérusalem', 'jerusalem')],
      'Les prêtres en chef et les scribes projettent de tuer Jésus',
      ['Marc 11:18-19', 'Luc 19:47-48'],
      {
        participants: [jesus, group('les prêtres en chef et les scribes')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'voix-divine-prediction-mort',
      nisan10,
      [point('Jérusalem', 'jerusalem')],
      'Une voix divine se fait entendre et Jésus annonce sa mort',
      ['Jean 12:20-50'],
      {
        participants: [jesus, group('Jéhovah')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'lecon-figuier-desseche',
      nisan11,
      [point('Béthanie', 'obi-bethany-1'), point('Jérusalem', 'jerusalem')],
      'Jésus tire une leçon du figuier desséché',
      ['Matthieu 21:19-22', 'Marc 11:20-25'],
      jesusPresence
    ),
    row(
      'autorite-contestee-deux-fils',
      nisan11,
      [area('Jérusalem, Temple', 'jerusalem')],
      'L’autorité de Jésus est contestée au Temple',
      ['Matthieu 21:23-32', 'Marc 11:27-33', 'Luc 20:1-8'],
      jesusPresence
    ),
    row(
      'cultivateurs-repas-mariage',
      nisan11,
      [area('Jérusalem, Temple', 'jerusalem')],
      'Jésus donne les exemples des cultivateurs et du repas de mariage',
      ['Matthieu 21:33-22:14', 'Marc 12:1-12', 'Luc 20:9-19'],
      jesusPresence
    ),
    row(
      'questions-cesar-resurrection-commandement',
      nisan11,
      [area('Jérusalem, Temple', 'jerusalem')],
      'Jésus répond à des questions sur César, la résurrection et le plus grand commandement',
      ['Matthieu 22:15-40', 'Marc 12:13-34', 'Luc 20:20-40'],
      jesusPresence
    ),
    row(
      'christ-fils-david',
      nisan11,
      [area('Jérusalem, Temple', 'jerusalem')],
      'Jésus interroge la foule sur le Christ et David',
      ['Matthieu 22:41-46', 'Marc 12:35-37', 'Luc 20:41-44'],
      jesusPresence
    ),
    row(
      'condamnation-scribes-pharisiens',
      nisan11,
      [area('Jérusalem, Temple', 'jerusalem')],
      'Jésus condamne l’attitude des scribes et des pharisiens',
      ['Matthieu 23:1-39', 'Marc 12:38-40', 'Luc 20:45-47'],
      jesusPresence
    ),
    row(
      'offrande-veuve',
      nisan11,
      [area('Jérusalem, Temple', 'jerusalem')],
      'Jésus remarque l’offrande d’une veuve',
      ['Marc 12:41-44', 'Luc 21:1-4'],
      jesusPresence
    ),
    row(
      'signe-presence-future',
      nisan11,
      [area('Mont des Oliviers', 'jerusalem')],
      'Jésus donne le signe de sa présence future',
      ['Matthieu 24:1-51', 'Marc 13:1-37', 'Luc 21:5-38'],
      jesusPresence
    ),
    row(
      'dix-vierges-talents-brebis-chevres',
      nisan11,
      [area('Mont des Oliviers', 'jerusalem')],
      'Jésus donne les exemples des vierges, des talents et des brebis',
      ['Matthieu 25:1-46'],
      jesusPresence
    ),
    row(
      'complot-chefs-juifs',
      nisan12,
      [point('Jérusalem', 'jerusalem')],
      'Des chefs juifs projettent de tuer Jésus',
      ['Matthieu 26:1-5', 'Marc 14:1-2', 'Luc 22:1-2'],
      {
        participants: [jesus, group('des chefs juifs')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'judas-negocie-livraison',
      nisan12,
      [point('Jérusalem', 'jerusalem')],
      'Judas négocie la livraison de Jésus',
      ['Matthieu 26:14-16', 'Marc 14:10-11', 'Luc 22:3-6'],
      {
        participants: [judas, group('les prêtres en chef')],
        presencePersonIds: [PERSON_IDS.judas]
      }
    ),
    row(
      'preparatifs-derniere-paque',
      nisan13,
      [area('Jérusalem et ses environs', 'jerusalem')],
      'Les disciples préparent la dernière Pâque',
      ['Matthieu 26:17-19', 'Marc 14:12-16', 'Luc 22:7-13'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'derniere-paque',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus mange la Pâque avec ses apôtres',
      ['Matthieu 26:20-21', 'Marc 14:17-18', 'Luc 22:14-18'],
      {
        participants: [jesus, group('les apôtres')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'lavement-pieds',
      nisan14,
      [point('Jérusalem', 'jerusalem')],
      'Jésus lave les pieds de ses apôtres',
      ['Jean 13:1-20'],
      {
        participants: [jesus, group('les apôtres')],
        presencePersonIds: [JESUS_ID]
      }
    )
  ]
};
