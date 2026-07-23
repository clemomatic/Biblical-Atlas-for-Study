import { EventData, EraData, CategoryData } from '../types';
import { parseTimelineDate, rgbToHex } from './dateUtils';

export interface ParsedTimelineData {
  eras: EraData[];
  categories: CategoryData[];
  events: EventData[];
}

export function parseTimelineXML(xmlString: string): ParsedTimelineData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Parse Eras
  const eraNodes = xmlDoc.getElementsByTagName('era');
  const eras: EraData[] = [];
  for (let i = 0; i < eraNodes.length; i++) {
    const node = eraNodes[i];
    const name = node.getElementsByTagName('name')[0]?.textContent || `Ère ${i + 1}`;
    const start = node.getElementsByTagName('start')[0]?.textContent || '-4025-01-01 00:00:00';
    const end = node.getElementsByTagName('end')[0]?.textContent || '2050-12-01 00:00:00';
    const color = node.getElementsByTagName('color')[0]?.textContent || '196,205,219';

    const pStart = parseTimelineDate(start);
    const pEnd = parseTimelineDate(end);

    eras.push({
      id: `era_${i + 1}`,
      name,
      startRaw: start,
      endRaw: end,
      startYear: pStart.year,
      endYear: pEnd.year,
      startPos: pStart.position,
      endPos: pEnd.position,
      color,
      hexColor: rgbToHex(color)
    });
  }

  // Parse Categories
  const catNodes = xmlDoc.getElementsByTagName('category');
  const categories: CategoryData[] = [];
  for (let i = 0; i < catNodes.length; i++) {
    const node = catNodes[i];
    const name = node.getElementsByTagName('name')[0]?.textContent || '';
    const color = node.getElementsByTagName('color')[0]?.textContent || '0,128,255';
    const parent = node.getElementsByTagName('parent')[0]?.textContent || undefined;

    if (name) {
      categories.push({
        name,
        color,
        hexColor: rgbToHex(color),
        parent
      });
    }
  }

  // Parse Events
  const eventNodes = xmlDoc.getElementsByTagName('event');
  const events: EventData[] = [];
  for (let i = 0; i < eventNodes.length; i++) {
    const node = eventNodes[i];
    const text = node.getElementsByTagName('text')[0]?.textContent || 'Sans titre';
    const category = node.getElementsByTagName('category')[0]?.textContent || 'Événements Marquants';
    const start = node.getElementsByTagName('start')[0]?.textContent || '-1000-01-01 00:00:00';
    const end = node.getElementsByTagName('end')[0]?.textContent || start;
    const description = node.getElementsByTagName('description')[0]?.textContent || undefined;
    const icon = node.getElementsByTagName('icon')[0]?.textContent || undefined;
    const defaultColor = node.getElementsByTagName('default_color')[0]?.textContent || undefined;

    const fuzzyStart = node.getElementsByTagName('fuzzy_start')[0]?.textContent === 'True';
    const fuzzyEnd = node.getElementsByTagName('fuzzy_end')[0]?.textContent === 'True';

    const pStart = parseTimelineDate(start);
    const pEnd = parseTimelineDate(end);

    const isPoint = Math.abs(pEnd.position - pStart.position) < 0.01;

    events.push({
      id: `event_${i + 1}`,
      text,
      category,
      startRaw: start,
      endRaw: end,
      startYear: pStart.year,
      endYear: pEnd.year,
      startPos: pStart.position,
      endPos: pEnd.position,
      isPoint,
      fuzzyStart,
      fuzzyEnd,
      description,
      icon,
      defaultColor
    });
  }

  return { eras, categories, events };
}
