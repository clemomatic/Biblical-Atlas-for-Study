import {
  CategoryData,
  CertaintyLevel,
  EraData,
  EventData,
  SourceReference
} from '../types';
import { parseTimelineDate, rgbToHex } from './dateUtils';
import {
  createCategoryId,
  createEventId,
  createStableId
} from './stableIds';

export interface ParsedTimelineData {
  eras: EraData[];
  categories: CategoryData[];
  events: EventData[];
}

export class TimelineImportError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      issues.length === 1
        ? issues[0]
        : `L’importation contient ${issues.length} erreurs :\n• ${issues.join('\n• ')}`
    );
    this.name = 'TimelineImportError';
  }
}

const directChildren = (node: Element): Element[] =>
  Array.from(node.children);

const getDirectText = (
  node: Element,
  names: string[]
): string | undefined => {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  const child = directChildren(node).find(element =>
    wanted.has(element.tagName.toLowerCase())
  );
  const value = child?.textContent?.trim();
  return value || undefined;
};

const getEntityId = (node: Element): string | undefined =>
  node.getAttribute('id')?.trim() ||
  getDirectText(node, ['id', 'uuid']);

const parseBoolean = (value: string | undefined): boolean =>
  ['true', '1', 'yes', 'oui'].includes(value?.toLowerCase() || '');

const parseDateOrIssue = (
  value: string | undefined,
  label: string,
  issues: string[]
): ReturnType<typeof parseTimelineDate> | null => {
  if (!value) {
    issues.push(`${label} : date obligatoire manquante.`);
    return null;
  }

  const match = value.match(
    /^(-?\d+)-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (!match) {
    issues.push(
      `${label} : « ${value} » n’est pas une date valide (format attendu : année-MM-JJ HH:mm:ss).`
    );
    return null;
  }

  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hour = Number(rawHour || 0);
  const minute = Number(rawMinute || 0);
  const second = Number(rawSecond || 0);
  const daysInMonth = new Date(
    Math.max(1, Math.abs(year)),
    month,
    0
  ).getDate();

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    issues.push(`${label} : « ${value} » contient une composante hors limites.`);
    return null;
  }

  return parseTimelineDate(value);
};

const splitIds = (value: string): string[] =>
  value
    .split(/[,;\s]+/)
    .map(id => id.trim())
    .filter(Boolean);

const readList = (
  node: Element,
  names: string[],
  splitPattern: RegExp = /[,;]+/
): string[] => {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  const values: string[] = [];

  directChildren(node).forEach(child => {
    if (!wanted.has(child.tagName.toLowerCase())) return;
    const nestedValues = directChildren(child)
      .map(element => element.textContent?.trim())
      .filter((value): value is string => Boolean(value));
    if (nestedValues.length) {
      values.push(...nestedValues);
    } else if (child.textContent?.trim()) {
      values.push(
        ...child.textContent
          .trim()
          .split(splitPattern)
          .map(value => value.trim())
          .filter(Boolean)
      );
    }
  });

  return [...new Set(values)];
};

const readSources = (node: Element): SourceReference[] => {
  const sourcesContainer = directChildren(node).find(element =>
    ['sources', 'source_references'].includes(element.tagName.toLowerCase())
  );
  if (!sourcesContainer) return [];

  const sourceNodes = directChildren(sourcesContainer);
  if (!sourceNodes.length && sourcesContainer.textContent?.trim()) {
    return splitIds(sourcesContainer.textContent).map(label => ({
      id: createStableId('source', label),
      label
    }));
  }

  return sourceNodes
    .map(source => {
      const label =
        getDirectText(source, ['label', 'title', 'name']) ||
        source.textContent?.trim();
      if (!label) return null;
      const parsedSource: SourceReference = {
        id: getEntityId(source) || createStableId('source', label),
        label,
        url: getDirectText(source, ['url', 'href']),
        citation: getDirectText(source, ['citation', 'reference'])
      };
      return parsedSource;
    })
    .filter((source): source is SourceReference => Boolean(source));
};

const readCertainty = (node: Element): CertaintyLevel | undefined => {
  const value = getDirectText(node, ['certainty', 'certitude'])?.toLowerCase();
  if (
    value === 'certain' ||
    value === 'probable' ||
    value === 'possible' ||
    value === 'unknown'
  ) {
    return value;
  }
  return value ? 'unknown' : undefined;
};

const validateLastVerified = (
  value: string | undefined,
  label: string,
  issues: string[]
): string | undefined => {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    issues.push(`${label} : lastVerified doit utiliser le format AAAA-MM-JJ.`);
    return undefined;
  }
  return value;
};

const readMetadata = (
  node: Element,
  label: string,
  issues: string[]
) => ({
  biblicalReferences: readList(node, [
    'biblicalReferences',
    'biblical_references',
    'biblicalReference',
    'biblical_reference'
  ]),
  documentaryReferences: readList(node, [
    'documentaryReferences',
    'documentary_references',
    'documentaryReference',
    'documentary_reference'
  ]),
  sources: readSources(node),
  certainty: readCertainty(node),
  notes: getDirectText(node, ['notes', 'note']),
  lastVerified: validateLastVerified(
    getDirectText(node, ['lastVerified', 'last_verified']),
    label,
    issues
  )
});

export function parseTimelineXML(xmlString: string): ParsedTimelineData {
  if (!xmlString.trim()) {
    throw new TimelineImportError(['Le fichier est vide.']);
  }

  const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    const detail = parserError.textContent?.replace(/\s+/g, ' ').trim();
    throw new TimelineImportError([
      `Le XML est mal formé${detail ? ` : ${detail}` : '.'}`
    ]);
  }

  const issues: string[] = [];
  const eras: EraData[] = [];
  const categories: CategoryData[] = [];
  const events: EventData[] = [];

  Array.from(xmlDoc.getElementsByTagName('era')).forEach((node, index) => {
    const label = `Ère ${index + 1}`;
    const name = getDirectText(node, ['name', 'nom']);
    const startRaw = getDirectText(node, ['start', 'date_start']);
    const endRaw = getDirectText(node, ['end', 'date_end']);
    const start = parseDateOrIssue(startRaw, `${label}, début`, issues);
    const end = parseDateOrIssue(endRaw, `${label}, fin`, issues);
    if (!name) issues.push(`${label} : nom obligatoire manquant.`);
    if (!name || !startRaw || !endRaw || !start || !end) return;
    if (end.position < start.position) {
      issues.push(`${label} « ${name} » : la fin précède le début.`);
      return;
    }
    const color = getDirectText(node, ['color', 'couleur']) || '196,205,219';
    eras.push({
      id: getEntityId(node) || createStableId('era', name, startRaw),
      name,
      startRaw,
      endRaw,
      startYear: start.year,
      endYear: end.year,
      startPos: start.position,
      endPos: end.position,
      color,
      hexColor: rgbToHex(color)
    });
  });

  const categoryNodes = Array.from(
    xmlDoc.getElementsByTagName('category')
  ).filter(node => directChildren(node).some(child =>
    ['name', 'nom', 'color', 'couleur'].includes(child.tagName.toLowerCase())
  ));

  categoryNodes.forEach((node, index) => {
    const name = getDirectText(node, ['name', 'nom']);
    if (!name) {
      issues.push(`Catégorie ${index + 1} : nom obligatoire manquant.`);
      return;
    }
    const color = getDirectText(node, ['color', 'couleur']) || '0,128,255';
    categories.push({
      id: getEntityId(node) || createCategoryId(name),
      name,
      color,
      hexColor: rgbToHex(color),
      parent: getDirectText(node, ['parent'])
    });
  });

  const usedEventIds = new Set<string>();
  Array.from(xmlDoc.getElementsByTagName('event')).forEach((node, index) => {
    const label = `Événement ${index + 1}`;
    const text = getDirectText(node, ['text', 'title', 'titre']);
    const category = getDirectText(node, ['category', 'categorie']);
    const startRaw = getDirectText(node, ['start', 'date_start']);
    const endRaw = getDirectText(node, ['end', 'date_end']) || startRaw;

    if (!text) issues.push(`${label} : titre obligatoire manquant.`);
    if (!category) issues.push(`${label} : catégorie obligatoire manquante.`);
    const start = parseDateOrIssue(startRaw, `${label}, début`, issues);
    const end = parseDateOrIssue(endRaw, `${label}, fin`, issues);
    if (!text || !category || !startRaw || !endRaw || !start || !end) return;
    if (end.position < start.position) {
      issues.push(`${label} « ${text} » : la fin précède le début.`);
      return;
    }

    const id = getEntityId(node) || createEventId(text, startRaw, category);
    if (usedEventIds.has(id)) {
      issues.push(`${label} « ${text} » : identifiant dupliqué « ${id} ».`);
      return;
    }
    usedEventIds.add(id);

    const metadata = readMetadata(node, `${label} « ${text} »`, issues);
    events.push({
      id,
      text,
      categoryId: createCategoryId(category),
      category,
      startRaw,
      endRaw,
      startYear: start.year,
      endYear: end.year,
      startPos: start.position,
      endPos: end.position,
      isPoint: Math.abs(end.position - start.position) < 0.01,
      fuzzyStart: parseBoolean(
        getDirectText(node, ['fuzzy_start', 'fuzzyStart'])
      ),
      fuzzyEnd: parseBoolean(
        getDirectText(node, ['fuzzy_end', 'fuzzyEnd'])
      ),
      description: getDirectText(node, ['description']),
      icon: getDirectText(node, ['icon']),
      defaultColor: getDirectText(node, ['default_color', 'defaultColor']),
      associatedLocationIds: readList(node, [
        'associatedLocationIds',
        'associated_location_ids',
        'associatedLocationId',
        'associated_location_id',
        'location_ids'
      ], /[,;\s]+/),
      associatedRouteIds: readList(node, [
        'associatedRouteIds',
        'associated_route_ids',
        'associatedRouteId',
        'associated_route_id'
      ], /[,;\s]+/),
      associatedCharacterIds: readList(node, [
        'associatedCharacterIds',
        'associated_character_ids',
        'associatedCharacterId',
        'associated_character_id'
      ], /[,;\s]+/),
      ...metadata
    });
  });

  if (!events.length && !issues.length) {
    issues.push("Aucun événement n’a été trouvé dans le fichier.");
  }

  const categoryNames = new Set(categories.map(category => category.name));
  events.forEach(event => {
    if (categoryNames.has(event.category)) return;
    categoryNames.add(event.category);
    categories.push({
      id: event.categoryId,
      name: event.category,
      color: '0,128,255',
      hexColor: rgbToHex('0,128,255')
    });
  });

  if (issues.length) throw new TimelineImportError(issues);
  return { eras, categories, events };
}
