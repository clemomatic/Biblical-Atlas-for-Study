import {
  JESUS_ID,
  PERSON_IDS,
  area,
  group,
  jesus,
  person,
  point,
  region,
  row,
  yearPeriod
} from './common.mjs';

const martha = person('Marthe', PERSON_IDS.martha);
const maryBethany = person('Marie', PERSON_IDS.maryBethany);
const afterPassover = yearPeriod(32, 'Après la Pâque 32 de n. è.', {
  approximate: true
});
const booths = yearPeriod(32, 'Fête des Tabernacles 32 de n. è.', {
  certainty: 'certain',
  approximate: true,
  season: 'autumn'
});
const dedication = yearPeriod(32, 'Fête de l’Inauguration 32 de n. è.', {
  certainty: 'certain',
  approximate: true,
  season: 'winter'
});
const jesusPresence = { participants: [jesus], presencePersonIds: [JESUS_ID] };

export const A7_E = {
  code: 'a7-e',
  sourceId: 'source-nwtsty-a7-e',
  title:
    'Principaux évènements de la vie terrestre de Jésus : ministère de Jésus en Galilée (3e partie) et en Judée',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/ministere-de-jesus-en-judee/',
  chapterOrAppendix: 'Appendice A7-E',
  stagingFile: 'a7-e-galilee-3-judee.json',
  events: [
    row(
      'levain-pharisiens-aveugle-bethsaide',
      afterPassover,
      [
        area('Mer de Galilée', 'obi-sea-of-galilee'),
        point('Bethsaïde', 'obi-bethsaida-2', 'probable')
      ],
      'Jésus met en garde contre le levain des pharisiens et guérit un aveugle',
      ['Matthieu 16:5-12', 'Marc 8:13-26'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'cles-royaume-premiere-prediction-mort',
      afterPassover,
      [area('Région de Césarée de Philippe', 'obi-caesarea-philippi')],
      'Jésus parle des clés du Royaume et annonce sa mort',
      ['Matthieu 16:13-28', 'Marc 8:27-9:1', 'Luc 9:18-27'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'transfiguration',
      afterPassover,
      [area('Probablement le mont Hermon', 'obi-mount-hermon', 'probable')],
      'Jésus est transfiguré',
      ['Matthieu 17:1-13', 'Marc 9:2-13', 'Luc 9:28-36'],
      {
        participants: [jesus, group('trois disciples'), group('Jéhovah')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'guerison-garcon-possede',
      afterPassover,
      [area('Région de Césarée de Philippe', 'obi-caesarea-philippi')],
      'Jésus guérit un garçon possédé',
      ['Matthieu 17:14-20', 'Marc 9:14-29', 'Luc 9:37-43'],
      jesusPresence
    ),
    row(
      'deuxieme-prediction-mort',
      afterPassover,
      [region('Galilée')],
      'Jésus annonce de nouveau sa mort',
      ['Matthieu 17:22-23', 'Marc 9:30-32', 'Luc 9:43-45'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'impot-piece-poisson',
      afterPassover,
      [point('Capharnaüm', 'capernaum')],
      'Jésus fait payer l’impôt avec une pièce trouvée dans un poisson',
      ['Matthieu 17:24-27'],
      jesusPresence
    ),
    row(
      'plus-grand-royaume-exemples',
      afterPassover,
      [point('Capharnaüm', 'capernaum')],
      'Jésus enseigne qui est le plus grand dans le Royaume',
      ['Matthieu 18:1-35', 'Marc 9:33-50', 'Luc 9:46-50'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'route-galilee-samarie-jerusalem',
      afterPassover,
      [region('Galilée'), region('Samarie')],
      'Jésus prend la direction de Jérusalem et parle du prix à payer pour le suivre',
      ['Matthieu 8:19-22', 'Luc 9:51-62', 'Jean 7:2-10'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: []
      }
    ),
    row(
      'enseignement-fete-tabernacles',
      booths,
      [point('Jérusalem', 'jerusalem')],
      'Jésus enseigne pendant la fête des Tabernacles',
      ['Jean 7:11-52'],
      jesusPresence
    ),
    row(
      'lumiere-monde-aveugle-naissance',
      booths,
      [point('Jérusalem', 'jerusalem')],
      'Jésus se présente comme la lumière du monde et guérit un aveugle de naissance',
      ['Jean 8:12-9:41'],
      jesusPresence
    ),
    row(
      'envoi-soixante-dix',
      booths,
      [region('Probablement en Judée', 'probable')],
      'Jésus envoie soixante-dix disciples',
      ['Luc 10:1-24'],
      {
        participants: [jesus, group('les 70 disciples')],
        presencePersonIds: []
      }
    ),
    row(
      'bon-samaritain-marie-marthe',
      booths,
      [region('Judée'), point('Béthanie', 'obi-bethany-1')],
      'Jésus donne l’exemple du bon Samaritain et rend visite à Marthe et Marie',
      ['Luc 10:25-42'],
      {
        participants: [jesus, martha, maryBethany],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.martha,
          PERSON_IDS.maryBethany
        ],
        interactions: [
          [JESUS_ID, PERSON_IDS.martha],
          [JESUS_ID, PERSON_IDS.maryBethany]
        ]
      }
    ),
    row(
      'priere-modele-ami-insistant',
      booths,
      [region('Probablement en Judée', 'probable')],
      'Jésus enseigne la prière et donne l’exemple de l’ami insistant',
      ['Luc 11:1-13'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'doigt-dieu-signe-jonas',
      booths,
      [region('Probablement en Judée', 'probable')],
      'Jésus expulse des démons et reparle du signe de Jonas',
      ['Luc 11:14-36'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'repas-pharisien-hypocrisie',
      booths,
      [region('Probablement en Judée', 'probable')],
      'Jésus condamne l’hypocrisie pendant un repas chez un pharisien',
      ['Luc 11:37-54'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'riche-insense-intendant-fidele',
      booths,
      [region('Probablement en Judée', 'probable')],
      'Jésus donne les exemples de l’homme riche et de l’intendant fidèle',
      ['Luc 12:1-59'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'infirme-sabbat-graine-levain',
      booths,
      [region('Probablement en Judée', 'probable')],
      'Jésus guérit une femme infirme pendant le sabbat',
      ['Luc 13:1-21'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'excellent-berger-depart-bethanie-jourdain',
      dedication,
      [
        point('Jérusalem', 'jerusalem'),
        area(
          'Béthanie de l’autre côté du Jourdain',
          'place-a7b-bethany-beyond-jordan',
          'possible'
        )
      ],
      'Jésus parle de l’excellent berger puis quitte Jérusalem',
      ['Jean 10:1-39'],
      jesusPresence
    )
  ]
};
