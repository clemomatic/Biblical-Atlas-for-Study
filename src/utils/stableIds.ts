const normalizeForId = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const hash = (value: string): string => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
};

export function createStableId(prefix: string, ...parts: string[]): string {
  const source = parts.join('|');
  const readable = normalizeForId(parts[0] || prefix) || prefix;
  return `${prefix}-${readable}-${hash(source)}`;
}

export const createCategoryId = (name: string): string =>
  createStableId('category', name);

export const createEventId = (
  text: string,
  startRaw: string,
  category: string
): string => createStableId('event', text, startRaw, category);
