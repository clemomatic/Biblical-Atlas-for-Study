import {
  JESUS_ID,
  PERSON_IDS,
  area,
  group,
  jesus,
  person,
  point,
  rangePeriod,
  region,
  row
} from './common.mjs';

const lazarus = person('Lazare', PERSON_IDS.lazarus);
const james = person('Jacques', PERSON_IDS.jamesZebedee);
const john = person('Jean', PERSON_IDS.johnApostle);
const zacchaeus = person('Zachée', PERSON_IDS.zacchaeus);
const period = rangePeriod(
  32,
  33,
  'Après la fête de l’Inauguration de 32 et avant la Pâque 33',
  'probable'
);
const jesusPresence = { participants: [jesus], presencePersonIds: [JESUS_ID] };

export const A7_F = {
  code: 'a7-f',
  sourceId: 'source-nwtsty-a7-f',
  title:
    'Principaux évènements de la vie terrestre de Jésus : ministère de Jésus à l’est du Jourdain',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/ministere-jesus-est-jourdain/',
  chapterOrAppendix: 'Appendice A7-F',
  stagingFile: 'a7-f-est-jourdain.json',
  events: [
    row(
      'retour-lieu-bapteme-jean',
      period,
      [
        area(
          'Béthanie de l’autre côté du Jourdain',
          'place-a7b-bethany-beyond-jordan',
          'possible'
        )
      ],
      'Jésus retourne à l’endroit où Jean baptisait',
      ['Jean 10:40-42'],
      jesusPresence
    ),
    row(
      'enseignement-villes-peree',
      period,
      [region('Pérée')],
      'Jésus enseigne dans les villes et les villages en allant vers Jérusalem',
      ['Luc 13:22'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'porte-etroite-lamentation-jerusalem',
      period,
      [region('Pérée')],
      'Jésus exhorte à entrer par la porte étroite et se lamente sur Jérusalem',
      ['Luc 13:23-35'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'humilite-invites',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jésus enseigne l’humilité à l’aide de deux exemples',
      ['Luc 14:1-24'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'cout-etre-disciple',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jésus invite à calculer ce qu’il en coûte d’être disciple',
      ['Luc 14:25-35'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'trois-exemples-choses-perdues',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jésus raconte trois exemples concernant ce qui était perdu',
      ['Luc 15:1-32'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'intendant-injuste-riche-lazare',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jésus donne les exemples de l’intendant injuste et de l’homme riche',
      ['Luc 16:1-31'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'trebuchement-pardon-foi',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jésus enseigne au sujet du pardon, de la foi et des causes de chute',
      ['Luc 17:1-10'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'mort-resurrection-lazare',
      period,
      [point('Béthanie', 'obi-bethany-1')],
      'Jésus ressuscite Lazare à Béthanie',
      ['Jean 11:1-46'],
      {
        participants: [jesus, lazarus, group('Marthe et Marie')],
        presencePersonIds: [JESUS_ID, PERSON_IDS.lazarus],
        interactions: [[JESUS_ID, PERSON_IDS.lazarus]]
      }
    ),
    row(
      'complot-depart-ephraim',
      period,
      [
        point('Jérusalem', 'jerusalem'),
        point('Éphraïm', 'obi-ephraim-2', 'possible')
      ],
      'Un complot vise Jésus, qui se retire à Éphraïm',
      ['Jean 11:47-54'],
      jesusPresence
    ),
    row(
      'dix-lepreux-venue-royaume',
      period,
      [region('Samarie'), region('Galilée')],
      'Jésus guérit dix lépreux et explique la venue du Royaume',
      ['Luc 17:11-37'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'veuve-pharisien-collecteur',
      period,
      [region('Samarie ou Galilée', 'possible')],
      'Jésus donne les exemples de la veuve et du collecteur d’impôts',
      ['Luc 18:1-14'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'mariage-divorce',
      period,
      [region('Pérée')],
      'Jésus enseigne au sujet du mariage et du divorce',
      ['Matthieu 19:1-12', 'Marc 10:1-12'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'benediction-enfants',
      period,
      [region('Pérée')],
      'Jésus bénit des enfants',
      ['Matthieu 19:13-15', 'Marc 10:13-16', 'Luc 18:15-17'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'homme-riche-ouvriers-vigne',
      period,
      [region('Pérée')],
      'Jésus répond à un homme riche et donne l’exemple des ouvriers',
      ['Matthieu 19:16-20:16', 'Marc 10:17-31', 'Luc 18:18-30'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'troisieme-prediction-mort',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jésus annonce sa mort pour la troisième fois',
      ['Matthieu 20:17-19', 'Marc 10:32-34', 'Luc 18:31-34'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'demande-jacques-jean',
      period,
      [region('Probablement en Pérée', 'probable')],
      'Jacques et Jean demandent des places dans le Royaume',
      ['Matthieu 20:20-28', 'Marc 10:35-45'],
      {
        participants: [jesus, james, john],
        presencePersonIds: [],
        interactions: [
          [JESUS_ID, PERSON_IDS.jamesZebedee],
          [JESUS_ID, PERSON_IDS.johnApostle]
        ]
      }
    ),
    row(
      'jericho-aveugles-zachee-mines',
      period,
      [point('Jéricho', 'obi-jericho-1')],
      'À Jéricho, Jésus guérit des aveugles et rend visite à Zachée',
      ['Matthieu 20:29-34', 'Marc 10:46-52', 'Luc 18:35-19:28'],
      {
        participants: [jesus, zacchaeus, group('deux aveugles')],
        presencePersonIds: [JESUS_ID, PERSON_IDS.zacchaeus],
        interactions: [[JESUS_ID, PERSON_IDS.zacchaeus]]
      }
    )
  ]
};
