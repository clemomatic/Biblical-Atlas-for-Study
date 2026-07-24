import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const utilityPath = path.join(root, 'src', 'utils', 'jwLinks.ts');
const utilitySource = fs.readFileSync(utilityPath, 'utf8');
const compiled = ts.transpileModule(utilitySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;
const utility = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

const dataDirectory = path.join(root, 'src', 'data');
const dataFiles = fs
  .readdirSync(dataDirectory, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
  .map(entry => path.join(entry.parentPath, entry.name));

const references = new Set();
const arrayPattern = /biblicalReferences\s*:\s*\[([\s\S]*?)\]/g;
const stringPattern = /(['"])(.*?)\1/g;

for (const file of dataFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const arrayMatch of source.matchAll(arrayPattern)) {
    for (const stringMatch of arrayMatch[1].matchAll(stringPattern)) {
      references.add(stringMatch[2]);
    }
  }
}

const unresolved = [...references].filter(
  reference => !utility.getBibleReferenceTarget(reference)
);

if (unresolved.length) {
  console.error('Références bibliques sans lien JW Finder :');
  for (const reference of unresolved) console.error(`- ${reference}`);
  process.exitCode = 1;
} else {
  console.log(
    `${references.size} références bibliques validées pour JW Finder et WOL.`
  );
}

const requiredDocumentaryReferences = [
  'Voyez le bon pays, « Le monde des patriarches », p. 6-7',
  'Carte « La Terre promise », grille D10',
  'Bible d’étude, appendice B2 « La Genèse et les voyages des patriarches »',
  'Bible d’étude, appendice B3 « L’Exode »'
];

const unresolvedDocuments = requiredDocumentaryReferences.filter(
  reference => !utility.getDocumentaryReferenceTarget(reference)
);

if (unresolvedDocuments.length) {
  console.error('Références documentaires sans lien JW Finder :');
  for (const reference of unresolvedDocuments) console.error(`- ${reference}`);
  process.exitCode = 1;
} else {
  console.log(
    `${requiredDocumentaryReferences.length} familles de références documentaires validées.`
  );
}
