export type JwReferenceKind =
  | 'bible'
  | 'good-land'
  | 'insight'
  | 'appendix'
  | 'publication';

export interface JwReferenceTarget {
  kind: JwReferenceKind;
  finderUrl: string;
  wolUrl: string;
}

interface BibleBook {
  number: number;
  names: string[];
}

export interface ParsedBibleReference {
  bookNumber: number;
  chapter: number;
  startVerse?: number;
  endChapter?: number;
  endVerse?: number;
}

const BIBLE_BOOKS: BibleBook[] = [
  { number: 1, names: ['Genèse', 'Genese'] },
  { number: 2, names: ['Exode'] },
  { number: 3, names: ['Lévitique', 'Levitique'] },
  { number: 4, names: ['Nombres'] },
  { number: 5, names: ['Deutéronome', 'Deuteronome'] },
  { number: 6, names: ['Josué', 'Josue'] },
  { number: 7, names: ['Juges'] },
  { number: 8, names: ['Ruth'] },
  { number: 9, names: ['1 Samuel'] },
  { number: 10, names: ['2 Samuel'] },
  { number: 11, names: ['1 Rois'] },
  { number: 12, names: ['2 Rois'] },
  { number: 13, names: ['1 Chroniques'] },
  { number: 14, names: ['2 Chroniques'] },
  { number: 15, names: ['Esdras'] },
  { number: 16, names: ['Néhémie', 'Nehemie'] },
  { number: 17, names: ['Esther'] },
  { number: 18, names: ['Job'] },
  { number: 19, names: ['Psaume', 'Psaumes'] },
  { number: 20, names: ['Proverbes'] },
  { number: 21, names: ['Ecclésiaste', 'Ecclesiaste'] },
  {
    number: 22,
    names: ['Chant de Salomon', 'Cantique des cantiques', 'Cantique']
  },
  { number: 23, names: ['Isaïe', 'Isaie'] },
  { number: 24, names: ['Jérémie', 'Jeremie'] },
  { number: 25, names: ['Lamentations'] },
  { number: 26, names: ['Ézéchiel', 'Ezechiel'] },
  { number: 27, names: ['Daniel'] },
  { number: 28, names: ['Osée', 'Osee'] },
  { number: 29, names: ['Joël', 'Joel'] },
  { number: 30, names: ['Amos'] },
  { number: 31, names: ['Abdias'] },
  { number: 32, names: ['Jonas'] },
  { number: 33, names: ['Michée', 'Michee'] },
  { number: 34, names: ['Nahum'] },
  { number: 35, names: ['Habacuc'] },
  { number: 36, names: ['Sophonie'] },
  { number: 37, names: ['Aggée', 'Aggee'] },
  { number: 38, names: ['Zacharie'] },
  { number: 39, names: ['Malachie'] },
  { number: 40, names: ['Matthieu'] },
  { number: 41, names: ['Marc'] },
  { number: 42, names: ['Luc'] },
  { number: 43, names: ['Jean'] },
  { number: 44, names: ['Actes', 'Actes des apôtres'] },
  { number: 45, names: ['Romains'] },
  { number: 46, names: ['1 Corinthiens'] },
  { number: 47, names: ['2 Corinthiens'] },
  { number: 48, names: ['Galates'] },
  { number: 49, names: ['Éphésiens', 'Ephesiens'] },
  { number: 50, names: ['Philippiens'] },
  { number: 51, names: ['Colossiens'] },
  { number: 52, names: ['1 Thessaloniciens'] },
  { number: 53, names: ['2 Thessaloniciens'] },
  { number: 54, names: ['1 Timothée', '1 Timothee'] },
  { number: 55, names: ['2 Timothée', '2 Timothee'] },
  { number: 56, names: ['Tite'] },
  { number: 57, names: ['Philémon', 'Philemon'] },
  { number: 58, names: ['Hébreux', 'Hebreux'] },
  { number: 59, names: ['Jacques'] },
  { number: 60, names: ['1 Pierre'] },
  { number: 61, names: ['2 Pierre'] },
  { number: 62, names: ['1 Jean'] },
  { number: 63, names: ['2 Jean'] },
  { number: 64, names: ['3 Jean'] },
  { number: 65, names: ['Jude'] },
  { number: 66, names: ['Révélation', 'Revelation', 'Apocalypse'] }
];

const normalizeBookName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s]+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr');

const BOOK_NUMBER_BY_NAME = new Map(
  BIBLE_BOOKS.flatMap(book =>
    book.names.map(name => [normalizeBookName(name), book.number] as const)
  )
);

const pad = (value: number, length: number) =>
  String(value).padStart(length, '0');

const biblePosition = (book: number, chapter: number, verse: number) =>
  `${pad(book, 2)}${pad(chapter, 3)}${pad(verse, 3)}`;

export const parseBibleReference = (
  reference: string
): ParsedBibleReference | null => {
  const match = reference
    .trim()
    .match(
      /^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–—]\s*(?:(\d+):)?(\d+))?)?$/
    );

  if (!match) return null;

  const bookNumber = BOOK_NUMBER_BY_NAME.get(normalizeBookName(match[1]));
  if (!bookNumber) return null;

  const chapter = Number(match[2]);
  const startVerse = match[3] ? Number(match[3]) : undefined;
  const endChapter = match[4] ? Number(match[4]) : undefined;
  const endVerse = match[5] ? Number(match[5]) : undefined;

  if (
    chapter < 1 ||
    chapter > 150 ||
    (startVerse !== undefined && startVerse < 1) ||
    (endChapter !== undefined && endChapter < chapter) ||
    (endVerse !== undefined && endVerse < 1) ||
    (endVerse !== undefined &&
      (endChapter === undefined || endChapter === chapter) &&
      startVerse !== undefined &&
      endVerse < startVerse)
  ) {
    return null;
  }

  return {
    bookNumber,
    chapter,
    startVerse,
    endChapter,
    endVerse
  };
};

const buildFinderUrl = (parameters: Record<string, string>) => {
  const query = new URLSearchParams({
    srcid: 'jwlshare',
    wtlocale: 'F',
    prefer: 'lang',
    ...parameters
  });
  return `https://www.jw.org/finder?${query.toString()}`;
};

export const buildDocumentFinderUrl = (documentId: string) =>
  buildFinderUrl({ docid: documentId });

export const getDocumentIdFromWolUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'wol.jw.org') return null;
    const match = parsed.pathname.match(/\/lp-f\/(\d+)(?:\/|$)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
};

export const getJwDocumentTarget = (
  wolUrl: string,
  kind: Exclude<JwReferenceKind, 'bible'> = 'publication'
): JwReferenceTarget | null => {
  const documentId = getDocumentIdFromWolUrl(wolUrl);
  if (!documentId) return null;
  return {
    kind,
    finderUrl: buildDocumentFinderUrl(documentId),
    wolUrl
  };
};

export const getBibleReferenceTarget = (
  reference: string
): JwReferenceTarget | null => {
  const parsed = parseBibleReference(reference);
  if (!parsed) return null;

  const {
    bookNumber,
    chapter,
    startVerse,
    endChapter = chapter,
    endVerse
  } = parsed;
  const firstVerse = startVerse ?? 1;
  const start = biblePosition(bookNumber, chapter, firstVerse);
  const bible =
    endVerse !== undefined
      ? `${start}-${biblePosition(bookNumber, endChapter, endVerse)}`
      : start;
  const fragment =
    startVerse === undefined
      ? ''
      : endVerse !== undefined
        ? `#v=${bookNumber}:${chapter}:${startVerse}-${bookNumber}:${endChapter}:${endVerse}`
        : `#v=${bookNumber}:${chapter}:${startVerse}`;

  return {
    kind: 'bible',
    finderUrl: buildFinderUrl({ bible, pub: 'nwtsty' }),
    wolUrl: `https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/${bookNumber}/${chapter}${fragment}`
  };
};

const DOCUMENTARY_REFERENCE_TARGETS: {
  matches: (reference: string) => boolean;
  documentId: string;
  kind: JwReferenceKind;
}[] = [
  {
    matches: reference =>
      /voyez le bon pays/i.test(reference) &&
      /monde des patriarches/i.test(reference),
    documentId: '1102003104',
    kind: 'good-land'
  },
  {
    matches: reference =>
      /(?:voyez le bon pays|carte)/i.test(reference) &&
      /terre promise/i.test(reference),
    documentId: '1102003103',
    kind: 'good-land'
  },
  {
    matches: reference => /appendice\s+B2\b/i.test(reference),
    documentId: '1001070222',
    kind: 'appendix'
  },
  {
    matches: reference => /appendice\s+B3\b/i.test(reference),
    documentId: '1001070223',
    kind: 'appendix'
  }
];

export const getDocumentaryReferenceTarget = (
  reference: string
): JwReferenceTarget | null => {
  const target = DOCUMENTARY_REFERENCE_TARGETS.find(item =>
    item.matches(reference)
  );
  if (!target) return null;

  return {
    kind: target.kind,
    finderUrl: buildDocumentFinderUrl(target.documentId),
    wolUrl: `https://wol.jw.org/fr/wol/d/r30/lp-f/${target.documentId}`
  };
};
