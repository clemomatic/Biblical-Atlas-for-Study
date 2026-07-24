import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const WOL_BASE = 'https://wol.jw.org';
const LIBRARY_BASE =
  `${WOL_BASE}/fr/wol/library/r30/lp-f/toutes-les-publications/` +
  '%C3%A9tude-perspicace';
const LETTERS = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'y',
  'z'
];

const PERSON_ARTICLE_TITLES = {
  'Abia (Abiyam)': ['Abiya'],
  'Athalie (reine)': ['Athalie'],
  Hénoch: ['Hénok'],
  Mathusalem: ['Methoushélah'],
  Téra: ['Térah'],
  Loth: ['Lot, II'],
  Issachar: ['Issakar'],
  Ochozias: ['Ahazia'],
  Amazia: ['Amatsia'],
  Jotam: ['Jotham'],
  Joachim: ['Yehoïaqim'],
  Joachin: ['Yehoïakîn'],
  Baasa: ['Baasha'],
  'Omri et Tibni': ['Omri', 'Tibni'],
  'Omri (seul)': ['Omri'],
  'Joachaz et Joas': ['Joachaz', 'Joas'],
  'Jéroboam II': ['Jéroboam'],
  Pekaya: ['Peqahia'],
  Péka: ['Péqah'],
  'Jésus (en tant qu’humain)': ['Jésus Christ'],
  'Jean le Baptiseur': ['Jean']
};

const PLACE_ARTICLE_TITLES = {
  antioch_syria: ['Antioche'],
  carmel: ['Carmel'],
  'carte-eauxdemerom-e3': ['Mérom (Eaux de)'],
  'carte-ouedarnon-g12': ['Arnôn (Ouadi d’)'],
  'obi-gadara': ['Gadaréniens'],
  'obi-gerasa': ['Géraséniens'],
  'obi-mount-ebal': ['Ébal (Mont)'],
  'obi-mount-gerizim': ['Guerizim (Mont)'],
  'obi-mount-gilboa': ['Guilboa'],
  'obi-pirathon': ['Pirathôn'],
  'obi-taanath-shiloh': ['Taanath-Shilo'],
  'obi-zarephath': ['Tsarphath'],
  'carte-ouedyarmouk-g5': ['Yarmouk'],
  plains_moab: ['Moab']
};

const PLACE_WOL_REFERENCE_OVERRIDES = {
  aleppo: [
    {
      id: 'wol-102003090-aleppo',
      work: 'wol',
      articleTitle: 'La Syrie, ou les échos d’un riche passé',
      url: `${WOL_BASE}/fr/wol/d/r30/lp-f/102003090`,
      linkedName: 'Alep',
      matchType: 'article-mention'
    }
  ],
  ebla: [
    {
      id: 'wol-2006923-ebla',
      work: 'wol',
      articleTitle: 'Ebla — Une cité ancienne sort de l’oubli',
      url: `${WOL_BASE}/fr/wol/d/r30/lp-f/2006923`,
      linkedName: 'Ebla',
      matchType: 'dedicated-article'
    }
  ]
};

const decodeHtml = value =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, codePoint) =>
      String.fromCodePoint(Number(codePoint))
    )
    .replace(/\s+/g, ' ')
    .trim();

const normalize = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`ʽ]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const phoneticKey = value =>
  normalize(value)
    .replace(/\b(mt|mont|oued|ouadi|source|lac|mer|plaines?|ville)\b/g, ' ')
    .replace(/\b(le|la|les|de|du|des|en)\b/g, ' ')
    .replace(/\s+/g, '')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/sh/g, 'ch')
    .replace(/kh/g, 'k')
    .replace(/ts/g, 'z')
    .replace(/[cq]/g, 'k')
    .replace(/[jy]/g, 'i')
    .replace(/w/g, 'ou')
    .replace(/v/g, 'b')
    .replace(/(.)\1+/g, '$1');

const editDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
};

const areNameVariants = (left, right) => {
  const leftKey = normalize(left).replace(/\s+/g, '');
  const rightKey = normalize(right).replace(/\s+/g, '');
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey || phoneticKey(left) === phoneticKey(right)) {
    return true;
  }

  const longestLength = Math.max(leftKey.length, rightKey.length);
  return (
    editDistance(leftKey, rightKey) <=
    Math.max(2, Math.floor(longestLength * 0.35))
  );
};

const expandCandidates = value => {
  const values = new Set([
    value,
    value.replace(/\?/g, ' '),
    value.replace(/\s*\([^)]*\)\s*/g, ' ')
  ]);

  for (const match of value.matchAll(/\(([^)]+)\)/g)) {
    values.add(match[1]);
  }

  value.split(/\s+\/\s+/).forEach(part => values.add(part));
  return [...values].map(item => item.trim()).filter(Boolean);
};

const fetchText = async url => {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Biblical-Atlas-for-Study reference generator' }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} — ${url}`);
  }
  return { response, text: await response.text() };
};

const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }
  );

  await Promise.all(runners);
  return results;
};

const loadInsightIndex = async () => {
  const pages = await mapWithConcurrency(LETTERS, 5, async letter => {
    const { text } = await fetchText(`${LIBRARY_BASE}/${letter}`);
    return text;
  });
  const articles = [];
  const entryPattern =
    /<a href="\/fr\/wol\/d\/r30\/lp-f\/(\d+)"[^>]*>[\s\S]*?<div class="\s*cardLine1[\s\S]*?">[\s\S]*?<span class="sectionIcon"><\/span>\s*([\s\S]*?)\s*<\/div>/g;

  pages.forEach(page => {
    for (const match of page.matchAll(entryPattern)) {
      articles.push({
        id: match[1],
        title: decodeHtml(match[2]),
        url: `${WOL_BASE}/fr/wol/d/r30/lp-f/${match[1]}`
      });
    }
  });

  return articles;
};

const buildLookup = (articles, keyFactory) => {
  const lookup = new Map();
  articles.forEach(article => {
    const key = keyFactory(article.title);
    if (!key) return;
    const existing = lookup.get(key) || [];
    lookup.set(key, [...existing, article]);
  });
  return lookup;
};

const chooseUniqueArticle = articles => {
  if (!articles?.length) return null;
  const uniqueTitles = new Set(articles.map(article => normalize(article.title)));
  if (uniqueTitles.size > 1) return null;
  return [...articles].sort((left, right) => Number(left.id) - Number(right.id))[0];
};

const resolveExactFromIndex = (candidates, exactLookup) => {
  for (const candidate of candidates.flatMap(expandCandidates)) {
    const exact = chooseUniqueArticle(exactLookup.get(normalize(candidate)));
    if (exact) return { ...exact, linkedName: candidate };
  }

  return null;
};

const resolveFromIndex = (candidates, exactLookup, phoneticLookup) => {
  const exact = resolveExactFromIndex(candidates, exactLookup);
  if (exact) return exact;

  for (const candidate of candidates.flatMap(expandCandidates)) {
    const phonetic = chooseUniqueArticle(
      phoneticLookup.get(phoneticKey(candidate))
    );
    if (phonetic) return { ...phonetic, linkedName: candidate };
  }

  return null;
};

const resolveCanonicalArticle = async article => {
  if (Number(article.id) < 1200005000) return article;

  const { text } = await fetchText(article.url);
  const redirectMatch = text.match(
    /href="(\/fr\/wol\/tc\/r30\/lp-f\/\d+\/0)"/
  );
  if (!redirectMatch) return article;

  const { response, text: canonicalText } = await fetchText(
    `${WOL_BASE}${redirectMatch[1]}`
  );
  const idMatch = response.url.match(/\/(\d+)(?:[/?#]|$)/);
  const titleMatch = canonicalText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);

  return {
    id: idMatch?.[1] || article.id,
    title: titleMatch ? decodeHtml(titleMatch[1]) : article.title,
    url: response.url.split('?')[0]
  };
};

const searchInsight = async candidates => {
  for (const candidate of candidates.flatMap(expandCandidates)) {
    const url =
      `${WOL_BASE}/fr/wol/s/r30/lp-f?q=${encodeURIComponent(candidate)}` +
      '&fc%5B%5D=it&p=par&r=occ&st=e';
    const { text } = await fetchText(url);
    const resultPattern =
      /<a class="lnk" href="(\/fr\/wol\/d\/r30\/lp-f\/(120000\d{4})[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    const resultMatch = resultPattern.exec(text);
    if (!resultMatch) continue;

    return {
      id: resultMatch[2],
      title: decodeHtml(resultMatch[3]),
      url: `${WOL_BASE}${resultMatch[1].replace(/&amp;/g, '&')}`,
      linkedName: candidate
    };
  }

  return null;
};

const makeReference = (article, linkedName, matchType, entityId) => ({
  id: `insight-${entityId}-${article.id}`,
  work: 'insight',
  articleTitle: article.title,
  url: article.url,
  ...(normalize(linkedName) === normalize(article.title)
    ? {}
    : { linkedName }),
  matchType
});

const resolveEntityReferences = async ({
  entity,
  candidates,
  requestedTitles,
  exactLookup,
  phoneticLookup
}) => {
  const titleGroups = requestedTitles?.length
    ? requestedTitles.map(title => [title])
    : [candidates];
  const references = [];

  for (const group of titleGroups) {
    // Une correspondance déclarée manuellement doit être exacte. Cela évite,
    // par exemple, de rapprocher « Pérée » de l’article « Père ».
    const direct = requestedTitles?.length
      ? resolveExactFromIndex(group, exactLookup)
      : resolveFromIndex(group, exactLookup, phoneticLookup);
    const matched =
      direct ||
      (await searchInsight(
        requestedTitles?.length ? group : candidates
      ));

    if (!matched) return [];

    const canonical = await resolveCanonicalArticle(matched);
    const linkedName =
      requestedTitles?.length && requestedTitles.length > 1
        ? group[0]
        : entity.name;
    const hasDedicatedTitle =
      Boolean(direct) ||
      group
        .flatMap(expandCandidates)
        .some(candidate =>
          canonical.title
            .split(',')
            .flatMap(expandCandidates)
            .some(articleTitle => areNameVariants(candidate, articleTitle))
        );
    const matchType = hasDedicatedTitle
      ? 'dedicated-article'
      : 'article-mention';
    references.push(
      makeReference(canonical, linkedName, matchType, entity.id)
    );
  }

  return references.filter(
    (reference, index, all) =>
      all.findIndex(candidate => candidate.url === reference.url) === index
  );
};

const serializeRecord = record => {
  const sorted = Object.fromEntries(
    Object.entries(record).sort(([left], [right]) =>
      left.localeCompare(right, 'fr')
    )
  );
  return JSON.stringify(sorted, null, 2);
};

const server = await createServer({
  root: '.',
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent'
});

const { EVENTS } = await server.ssrLoadModule('/src/data/timelineEvents.ts');
const { BIBLICAL_PLACES } = await server.ssrLoadModule('/src/data/mapData.ts');
const people = EVENTS.filter(event =>
  /^(Personnage|Roi|Proph|Fils)/.test(event.category)
);

console.log(
  `Références à traiter : ${people.length} personnages, ` +
    `${BIBLICAL_PLACES.length} lieux.`
);

const articles = await loadInsightIndex();
const exactLookup = buildLookup(articles, normalize);
const phoneticLookup = buildLookup(articles, phoneticKey);

const eventPairs = await mapWithConcurrency(people, 6, async event => {
  const references = await resolveEntityReferences({
    entity: { id: event.id, name: event.text },
    candidates: [event.text],
    requestedTitles: PERSON_ARTICLE_TITLES[event.text],
    exactLookup,
    phoneticLookup
  });
  return [event.id, references];
});

const placePairs = await mapWithConcurrency(
  BIBLICAL_PLACES,
  6,
  async place => {
    const references =
      PLACE_WOL_REFERENCE_OVERRIDES[place.id] ||
      (await resolveEntityReferences({
        entity: place,
        candidates: [place.name, ...(place.alternateNames || [])],
        requestedTitles: PLACE_ARTICLE_TITLES[place.id],
        exactLookup,
        phoneticLookup
      }));
    return [place.id, references];
  }
);

const eventReferences = Object.fromEntries(eventPairs);
const placeReferences = Object.fromEntries(placePairs);
const missingEvents = eventPairs.filter(([, references]) => !references.length);
const missingPlaces = placePairs.filter(([, references]) => !references.length);

if (missingEvents.length || missingPlaces.length) {
  console.error(
    JSON.stringify(
      {
        missingEvents: missingEvents.map(([id]) => id),
        missingPlaces: missingPlaces.map(([id]) => id)
      },
      null,
      2
    )
  );
  process.exit(1);
}

const output = `import { EncyclopediaReference } from '../types';

/**
 * Fichier généré depuis l’index officiel Étude perspicace sur WOL.
 * Exécuter \`pnpm run references:insight\` pour le régénérer.
 * Dernière vérification : ${new Date().toISOString().slice(0, 10)}.
 */
export const INSIGHT_EVENT_REFERENCES: Record<
  string,
  EncyclopediaReference[]
> = ${serializeRecord(eventReferences)};

export const INSIGHT_PLACE_REFERENCES: Record<
  string,
  EncyclopediaReference[]
> = ${serializeRecord(placeReferences)};
`;

await writeFile(
  resolve('src/data/insightReferences.generated.ts'),
  output,
  'utf8'
);

const articleMentions = [
  ...Object.values(eventReferences),
  ...Object.values(placeReferences)
]
  .flat()
  .filter(reference => reference.matchType === 'article-mention').length;

console.log(
  `Génération terminée : ${eventPairs.length} personnages, ` +
    `${placePairs.length} lieux, ${articleMentions} liens par mention.`
);
process.exit(0);
