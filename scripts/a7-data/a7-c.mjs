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

const peter = person('Simon Pierre', PERSON_IDS.peter);
const andrew = person('André', PERSON_IDS.andrew);
const james = person('Jacques', PERSON_IDS.jamesZebedee);
const john = person('Jean', PERSON_IDS.johnApostle);
const matthew = person('Matthieu', PERSON_IDS.matthew);
const mary = person('Marie, mère de Jésus', PERSON_IDS.maryMother);
const jesusPresence = { participants: [jesus], presencePersonIds: [JESUS_ID] };
const year30 = yearPeriod(30, '30 de n. è.');
const passover31 = yearPeriod(31, 'Pâque 31 de n. è.', {
  season: 'spring'
});

export const A7_C = {
  code: 'a7-c',
  sourceId: 'source-nwtsty-a7-c',
  title:
    'Principaux évènements de la vie terrestre de Jésus : ministère de Jésus en Galilée (1re partie)',
  url:
    'https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/ministere-jesus-galilee/',
  chapterOrAppendix: 'Appendice A7-C',
  stagingFile: 'a7-c-ministere-galilee-1.json',
  events: [
    row(
      'premiere-annonce-royaume-galilee',
      year30,
      [region('Galilée')],
      'Jésus commence à annoncer l’approche du Royaume en Galilée',
      ['Matthieu 4:17', 'Marc 1:14-15', 'Luc 4:14-15', 'Jean 4:44-45'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'guerison-fils-fonctionnaire-nazareth-capharnaum',
      year30,
      [
        point('Cana', 'obi-cana', 'probable'),
        point('Nazareth', 'nazareth'),
        point('Capharnaüm', 'capernaum')
      ],
      'Jésus guérit le fils d’un fonctionnaire, enseigne à Nazareth puis gagne Capharnaüm',
      ['Matthieu 4:13-16', 'Luc 4:16-31', 'Jean 4:46-54'],
      jesusPresence
    ),
    row(
      'appel-quatre-disciples',
      year30,
      [area('Mer de Galilée, près de Capharnaüm', 'obi-sea-of-galilee')],
      'Jésus appelle Simon, André, Jacques et Jean',
      ['Matthieu 4:18-22', 'Marc 1:16-20', 'Luc 5:1-11'],
      {
        participants: [jesus, peter, andrew, james, john],
        presencePersonIds: [
          JESUS_ID,
          PERSON_IDS.peter,
          PERSON_IDS.andrew,
          PERSON_IDS.jamesZebedee,
          PERSON_IDS.johnApostle
        ],
        interactions: [
          [JESUS_ID, PERSON_IDS.peter],
          [JESUS_ID, PERSON_IDS.andrew],
          [JESUS_ID, PERSON_IDS.jamesZebedee],
          [JESUS_ID, PERSON_IDS.johnApostle]
        ]
      }
    ),
    row(
      'guerisons-capharnaum-belle-mere-pierre',
      year30,
      [point('Capharnaüm', 'capernaum')],
      'Jésus guérit la belle-mère de Pierre et d’autres malades',
      ['Matthieu 8:14-17', 'Marc 1:21-34', 'Luc 4:31-41'],
      { ...jesusPresence, participants: [jesus, peter] }
    ),
    row(
      'premiere-tournee-galilee',
      year30,
      [region('Galilée')],
      'Première tournée de prédication de Jésus en Galilée',
      ['Matthieu 4:23-25', 'Marc 1:35-39', 'Luc 4:42-43'],
      {
        participants: [jesus, group('les quatre disciples')],
        presencePersonIds: []
      }
    ),
    row(
      'guerison-lepreux',
      year30,
      [region('Galilée')],
      'Jésus guérit un lépreux tandis que les foules le suivent',
      ['Matthieu 8:1-4', 'Marc 1:40-45', 'Luc 5:12-16'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'guerison-paralyse-capharnaum',
      year30,
      [point('Capharnaüm', 'capernaum')],
      'Jésus guérit un homme paralysé à Capharnaüm',
      ['Matthieu 9:1-8', 'Marc 2:1-12', 'Luc 5:17-26'],
      jesusPresence
    ),
    row(
      'appel-matthieu-question-jeune',
      year30,
      [point('Capharnaüm', 'capernaum')],
      'Jésus appelle Matthieu et répond à une question sur le jeûne',
      ['Matthieu 9:9-17', 'Marc 2:13-22', 'Luc 5:27-39'],
      {
        participants: [
          jesus,
          matthew,
          group('des collecteurs d’impôts')
        ],
        presencePersonIds: [JESUS_ID, PERSON_IDS.matthew],
        interactions: [[JESUS_ID, PERSON_IDS.matthew]]
      }
    ),
    row(
      'predication-synagogues-judee',
      year30,
      [region('Judée')],
      'Jésus prêche dans les synagogues de Judée',
      ['Luc 4:44'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'guerison-bethzata',
      passover31,
      [area('Jérusalem, Bethzata', 'jerusalem')],
      'Jésus guérit un malade à Bethzata',
      ['Jean 5:1-47'],
      jesusPresence
    ),
    row(
      'epis-sabbat',
      passover31,
      [area('En revenant de Jérusalem', undefined, 'possible')],
      'Les disciples arrachent des épis un jour de sabbat',
      ['Matthieu 12:1-8', 'Marc 2:23-28', 'Luc 6:1-5'],
      {
        participants: [jesus, group('les disciples')],
        presencePersonIds: [],
        unresolvedItems: [
          'Le tableau présente le lieu du trajet de retour avec un point d’interrogation.'
        ]
      }
    ),
    row(
      'main-guerie-sabbat',
      passover31,
      [region('Galilée'), area('Mer de Galilée', 'obi-sea-of-galilee')],
      'Jésus guérit une main pendant le sabbat et soigne de nombreuses personnes',
      ['Matthieu 12:9-21', 'Marc 3:1-12', 'Luc 6:6-11'],
      jesusPresence
    ),
    row(
      'choix-douze-apotres',
      passover31,
      [area('Mont près de Capharnaüm', 'capernaum')],
      'Jésus choisit les douze apôtres',
      ['Marc 3:13-19', 'Luc 6:12-16'],
      {
        participants: [jesus, group('les douze apôtres')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'sermon-montagne',
      passover31,
      [area('Près de Capharnaüm', 'capernaum')],
      'Jésus prononce le Sermon sur la montagne',
      ['Matthieu 5:1-7:29', 'Luc 6:17-49'],
      jesusPresence
    ),
    row(
      'guerison-serviteur-officier',
      passover31,
      [point('Capharnaüm', 'capernaum')],
      'Jésus guérit le serviteur d’un officier',
      ['Matthieu 8:5-13', 'Luc 7:1-10'],
      jesusPresence
    ),
    row(
      'resurrection-fils-veuve-nain',
      passover31,
      [point('Naïn', 'obi-nain')],
      'Jésus ressuscite le fils d’une veuve à Naïn',
      ['Luc 7:11-17'],
      jesusPresence
    ),
    row(
      'disciples-jean-interrogent-jesus',
      passover31,
      [
        point('Tibériade', 'obi-tiberias'),
        area('Galilée, Naïn ou environs', 'obi-nain', 'possible')
      ],
      'Jean envoie des disciples interroger Jésus',
      ['Matthieu 11:2-30', 'Luc 7:18-35'],
      {
        participants: [
          jesus,
          group('des disciples de Jean le Baptiseur')
        ],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'pecheresse-huile-pieds',
      passover31,
      [area('Galilée, Naïn ou environs', 'obi-nain', 'possible')],
      'Une femme verse de l’huile sur les pieds de Jésus',
      ['Luc 7:36-50'],
      {
        participants: [jesus, group('une femme')],
        presencePersonIds: [JESUS_ID]
      }
    ),
    row(
      'deuxieme-tournee-galilee',
      passover31,
      [region('Galilée')],
      'Deuxième tournée de Jésus en Galilée avec les Douze',
      ['Luc 8:1-3'],
      {
        participants: [jesus, group('les Douze')],
        presencePersonIds: []
      }
    ),
    row(
      'demons-expulses-peche-impardonnable',
      passover31,
      [region('Galilée')],
      'Jésus expulse des démons et parle du péché impardonnable',
      ['Matthieu 12:22-37', 'Marc 3:19-30'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'signe-jonas',
      passover31,
      [region('Galilée')],
      'Jésus annonce qu’il ne donnera que le signe de Jonas',
      ['Matthieu 12:38-45'],
      { ...jesusPresence, presencePersonIds: [] }
    ),
    row(
      'mere-freres-jesus',
      passover31,
      [region('Galilée')],
      'La mère et les frères de Jésus viennent le voir',
      ['Matthieu 12:46-50', 'Marc 3:31-35', 'Luc 8:19-21'],
      {
        participants: [jesus, mary, group('les frères de Jésus')],
        presencePersonIds: []
      }
    )
  ]
};

