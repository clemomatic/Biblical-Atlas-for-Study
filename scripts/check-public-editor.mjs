import { promises as fs } from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const forbiddenMarkers = [
  'atlas-local-editor',
  '/__atlas-editor/staging',
  'Éditeur historique'
];

const files = [];
const walk = async directory => {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(?:js|css|html|json)$/i.test(entry.name)) files.push(absolute);
  }
};

await walk(dist);
const leaks = [];
for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      leaks.push(`${path.relative(dist, file)} contient "${marker}"`);
    }
  }
}

if (leaks.length > 0) {
  console.error('L’éditeur local est présent dans le build public :');
  leaks.forEach(leak => console.error(`- ${leak}`));
  process.exitCode = 1;
} else {
  console.log(
    `Build public vérifié : aucun code ni endpoint de l’éditeur local dans ${files.length} fichier(s).`
  );
}
