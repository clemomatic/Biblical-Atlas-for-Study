export interface ParsedDate {
  year: number;
  month: number;
  day: number;
  raw: string;
  position: number; // continuous linear timeline position in years
}

export function rgbToHex(rgbStr: string): string {
  if (!rgbStr) return '#1b2a4a';
  const parts = rgbStr.split(',').map(s => parseInt(s.trim(), 10));
  if (parts.length < 3 || parts.some(isNaN)) return '#1b2a4a';
  const [r, g, b] = parts;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function parseTimelineDate(raw: string): ParsedDate {
  if (!raw) return { year: 0, month: 1, day: 1, raw: '', position: 0 };
  
  const trimmed = raw.trim();
  const isNegative = trimmed.startsWith('-');
  const cleanStr = isNegative ? trimmed.slice(1) : trimmed;
  
  // Example strings:
  // "-4025-01-01 00:00:00" -> isNegative: true, cleanStr: "4025-01-01 00:00:00"
  // "29-01-01 00:00:00" -> isNegative: false, cleanStr: "29-01-01 00:00:00"
  // "-1-01-10 00:00:00" -> isNegative: true, cleanStr: "1-01-10 00:00:00"
  
  const parts = cleanStr.split(/[\s-:]+/);
  const yearNum = parseInt(parts[0], 10);
  const year = isNegative ? -yearNum : yearNum;
  const month = parts[1] ? parseInt(parts[1], 10) : 1;
  const day = parts[2] ? parseInt(parts[2], 10) : 1;
  
  const frac = (Math.max(1, Math.min(12, month)) - 1) / 12 + (Math.max(1, Math.min(31, day)) - 1) / 365;
  let position = 0;
  if (year < 0) {
    position = year + frac;
  } else {
    position = (year - 1) + frac; // shift CE years by -1 so there's no gap between -1 and 1
  }

  return { year, month, day, raw, position };
}

export function formatDateFrench(
  year: number,
  month?: number,
  day?: number,
  isFuzzy?: boolean
): string {
  const fuzzyPrefix = isFuzzy ? 'vers ' : '';
  const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  
  let datePart = '';
  if (month && month >= 1 && month <= 12 && day && day > 1) {
    datePart = `${day} ${monthNames[month - 1]} `;
  } else if (month && month >= 1 && month <= 12 && month !== 1) {
    datePart = `${monthNames[month - 1]} `;
  }

  if (year < 0) {
    return `${fuzzyPrefix}${datePart}${Math.abs(year)} av. n. è.`;
  } else {
    return `${fuzzyPrefix}${datePart}${year} de n. è.`;
  }
}

export function formatEventSpan(
  startYear: number,
  endYear: number,
  isPoint: boolean,
  fuzzyStart?: boolean,
  fuzzyEnd?: boolean
): string {
  if (isPoint || startYear === endYear) {
    return formatDateFrench(startYear, undefined, undefined, fuzzyStart);
  }
  return `De ${formatDateFrench(startYear, undefined, undefined, fuzzyStart)} à ${formatDateFrench(endYear, undefined, undefined, fuzzyEnd)}`;
}
