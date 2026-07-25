import {
  JESUS_ID,
  JOHN_BAPTIST_ID,
  PERSON_IDS,
  area,
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

const jairus = person('Jaïre', PERSON_IDS.jairus);
const herod = person('Hérode Antipas', PERSON_IDS.herodAntipas);
const years31or32 = rangePeriod(31, 32, '31 ou 32 de n. è.');
const nearPassover32 = yearPeriod(32, 'Vers la Pâque 32 de n. è.', {
  certainty: 'probable',
  approximate: true,
  season: 'spring'
});
const afterPassover32 = yearPeriod(32, 'Après la Pâque 32 de n. è.', {
  approximate: true
});
const jesusPresence = { participants: [jesus], presencePersonIds: [JESUS_ID] };

export const A7_D = {
  code: 'a7-d',
  sourceId: 'source-nwtsty-a7-d',
  title:
    'Principaux évènements de la vie terrestre de Jésus : ministère de Jésus en Galilée (2e partie)',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/jesus-mer-de-galilee/',
  chapterOrAppendix: 'Appendice A7-D',
  stagingFile: 'a7-d-ministere-galilee-2.json',
  events: [
    row(
      'exemples-royaume',
      years31or32,
      [area('Région de Capharnaüm', 'capernaum')],
      'Jésus enseigne par des exemples concernant le Royaume',
      ['Matthieu 13:1-53', 'Marc 4:1-34', 'Luc 8:4-18'],
      jesusPresence
    ),
    row(
      'tempete-calmee',
      years31or32,
      [area('Mer de Galilée', 'obi-sea-of-galilee')],
      'Jésus calme une tempête depuis un bateau',
      ['Matthieu 8:18', 'Matthieu 8:23-27', 'Marc 4:35-41', 'Luc 8:22-25'],
      jesusPresence
    ),
    row(
      'demons-porcs-gadara',
      years31or32,
      [area('Région de Gadara', 'obi-gadara')],
      'Jésus chasse des démons qui entrent dans des porcs',
      ['Matthieu 8:28-34', 'Marc 5:1-20', 'Luc 8:26-39'],
      jesusPresence
    ),
    row(
      'femme-pertes-sang-fille-jaire',
      years31or32,
      [point('Probablement Capharnaüm', 'capernaum', 'probable')],
      'Jésus guérit une femme et ressuscite la fille de Jaïre',
      ['Matthieu 9:18-26', 'Marc 5:21-43', 'Luc 8:40-56'],
      {
        participants: [jesus, jairus, group('une femme malade')],
        presencePersonIds: [JESUS_ID, PERSON_IDS.jairus],
        interactions: [[JESUS_ID, PERSON_IDS.jairus]]
      }
    ),
    row(
      'deux-aveugles-muet',
      years31or32,
      [point('Capharnaüm ?', 'capernaum', 'possible')],
      'Jésus guérit deux aveugles et un homme muet',
      ['Matthieu 9:27-34'],
      jesusPresence
    ),
    row(
      'nouveau-rejet-nazareth',
      years31or32,
      [point('Nazareth', 'nazareth')],
      'Jésus est de nouveau rejeté à Nazareth',
      ['Matthieu 13:54-58', 'Marc 6:1-5'],
      jesusPresence
    ),
    row(
      'troisieme-tournee-envoi-apotres',
      years31or32,
      [region('Galilée')],
      'Troisième tournée en Galilée et envoi des apôtres',
      ['Matthieu 9:35-11:1', 'Marc 6:6-13', 'Luc 9:1-6'],
      {
        participants: [jesus, group('les apôtres')],
        presencePersonIds: []
      }
    ),
    row(
      'mort-jean-herode',
      years31or32,
      [point('Tibériade', 'obi-tiberias')],
      'Hérode fait décapiter Jean le Baptiseur',
      ['Matthieu 14:1-12', 'Marc 6:14-29', 'Luc 9:7-9'],
      {
        participants: [herod, johnBaptist],
        presencePersonIds: [PERSON_IDS.herodAntipas, JOHN_BAPTIST_ID],
        interactions: [[PERSON_IDS.herodAntipas, JOHN_BAPTIST_ID]]
      }
    ),
    row(
      'retour-apotres-nourrit-cinq-mille',
      nearPassover32,
      [
        point('Capharnaüm ?', 'capernaum', 'possible'),
        area('Rive nord-est de la mer de Galilée', 'obi-sea-of-galilee')
      ],
      'Les apôtres reviennent et Jésus nourrit cinq mille hommes',
      ['Matthieu 14:13-21', 'Marc 6:30-44', 'Luc 9:10-17', 'Jean 6:1-13'],
      {
        participants: [jesus, group('les apôtres')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'marche-eau-guerisons-genesareth',
      nearPassover32,
      [
        area('Rive nord-est de la mer de Galilée', 'obi-sea-of-galilee'),
        area('Génésareth')
      ],
      'Jésus marche sur l’eau puis accomplit des guérisons',
      ['Matthieu 14:22-36', 'Marc 6:45-56', 'Jean 6:14-21'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID],
        unresolvedItems: [
          'Aucun point cartographique distinct et vérifié n’est attribué à Génésareth.'
        ]
      }
    ),
    row(
      'pain-de-vie',
      nearPassover32,
      [point('Capharnaüm', 'capernaum')],
      'Jésus se présente comme le pain de vie',
      ['Jean 6:22-71'],
      jesusPresence
    ),
    row(
      'traditions-humaines',
      afterPassover32,
      [point('Probablement Capharnaüm', 'capernaum', 'probable')],
      'Jésus dénonce des traditions humaines',
      ['Matthieu 15:1-20', 'Marc 7:1-23', 'Jean 7:1'],
      jesusPresence
    ),
    row(
      'syrophenicienne-quatre-mille',
      afterPassover32,
      [region('Phénicie'), region('Décapole')],
      'Jésus guérit la fille d’une Syro-Phénicienne et nourrit quatre mille hommes',
      ['Matthieu 15:21-38', 'Marc 7:24-8:9'],
      {
        participants: [jesus, group('une femme syro-phénicienne')],
        presencePersonIds: []
      }
    ),
    row(
      'signe-jonas-magadan',
      afterPassover32,
      [point('Magadân', 'obi-magadan', 'possible')],
      'À Magadân, Jésus refuse de donner un signe autre que celui de Jonas',
      ['Matthieu 15:39-16:4', 'Marc 8:10-12'],
      jesusPresence
    )
  ]
};

