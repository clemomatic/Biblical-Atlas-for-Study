import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const [workbookPath, outputPath] = process.argv.slice(2);
if (!workbookPath || !outputPath) {
  throw new Error('Usage: node scripts/extract-authoritative-research.mjs <workbook.xlsx> <output.json>');
}

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const requestedSheets = [
  'Chronologie globale',
  'Référentiel sources',
  'Index itinéraires',
  'Correspondance routes',
  'Synchronisation carte',
  'Guide intégration Atlas',
];

const result = {};
for (const sheetName of requestedSheets) {
  const sheet = workbook.worksheets.getItem(sheetName);
  result[sheetName] = sheet.getUsedRange(true).values;
}

await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
