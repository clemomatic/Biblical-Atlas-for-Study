import { spawn } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import {
  findActivitiesDuring,
  findDocumentedPresences,
  findEventEntriesDuring,
  findLifespansDuring
} from '../src/domain/history/historicalIndex.ts';
import {
  buildHistoricalSnapshot,
  createHistoricalSnapshotCatalog
} from '../src/domain/history/historicalSnapshot.ts';

const root = process.cwd();
const contentRoot = join(root, 'content');
const distRoot = join(root, 'dist');
const outputPath = join(contentRoot, 'generated', 'performance-report.json');
const verifyOnly = process.argv.includes('--verify-output');
const previewUrl = 'http://127.0.0.1:4174';
const thresholds = {
  pageLoadMs: 5000,
  snapshotAverageMs: 25,
  syntheticQueryAverageMs: 10,
  mainJavaScriptRawBytes: 5_000_000,
  mainJavaScriptGzipBytes: 1_500_000
};

const readJson = path => readFile(path, 'utf8').then(JSON.parse);
const round = value => Number(value.toFixed(3));
const exactPeriod = (startYear, endYear) => ({
  start: { yearMin: startYear, yearMax: startYear, precision: 'year', certainty: 'certain' },
  end: { yearMin: endYear, yearMax: endYear, precision: 'year', certainty: 'certain' },
  displayLabel: `${startYear}-${endYear}`
});

const listFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
};

const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const percentile = (values, value) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];
};

const repeatEntries = (entries, factor, rewrite) =>
  Array.from({ length: factor }, (_, batch) =>
    entries.map(entry => rewrite(entry, batch))
  ).flat().sort((left, right) =>
    (left.startIndex ?? Number.NEGATIVE_INFINITY) -
      (right.startIndex ?? Number.NEGATIVE_INFINITY) ||
    left.id.localeCompare(right.id)
  );

const waitForPreview = async () => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(previewUrl);
      if (response.ok) return;
    } catch {
      // Le serveur Vite d\u00e9marre encore.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Le serveur de pr\u00e9visualisation n\u2019a pas d\u00e9marr\u00e9 \u00e0 temps.');
};

const measurePageLoad = async () => {
  const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const preview = spawn(process.execPath, [
    viteCli,
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4174',
    '--strictPort'
  ], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    await waitForPreview();
    browser = await chromium.launch();
    const page = await browser.newPage();
    const startedAt = performance.now();
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Ouvrir la recherche globale/i }).waitFor();
    const interactiveMs = performance.now() - startedAt;
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      if (!(entry instanceof PerformanceNavigationTiming)) return null;
      return {
        domContentLoadedMs: entry.domContentLoadedEventEnd,
        loadEventMs: entry.loadEventEnd
      };
    });
    return {
      interactiveMs: round(interactiveMs),
      domContentLoadedMs: round(navigation?.domContentLoadedMs ?? interactiveMs),
      loadEventMs: round(navigation?.loadEventMs || interactiveMs)
    };
  } finally {
    await browser?.close();
    preview.kill();
  }
};

const [dataset, index, relations] = await Promise.all([
  loadHistoricalDataset(contentRoot),
  readJson(join(contentRoot, 'generated', 'historical-index.json')),
  readJson(join(contentRoot, 'generated', 'relations.json'))
]);
const catalog = createHistoricalSnapshotCatalog(dataset, index, relations);
const samplePeriods = [
  exactPeriod(-1000, -950),
  exactPeriod(-750, -700),
  exactPeriod(29, 30),
  exactPeriod(50, 55)
];
for (let iteration = 0; iteration < 20; iteration += 1) {
  buildHistoricalSnapshot(catalog, samplePeriods[iteration % samplePeriods.length]);
}
const snapshotTimes = [];
for (let iteration = 0; iteration < 200; iteration += 1) {
  const startedAt = performance.now();
  buildHistoricalSnapshot(catalog, samplePeriods[iteration % samplePeriods.length]);
  snapshotTimes.push(performance.now() - startedAt);
}

const scaleFactor = Math.max(
  5,
  Math.ceil(600 / Math.max(index.lifespans.length, 1)),
  Math.ceil(600 / Math.max(index.events.length, 1))
);
const rewrite = (entry, batch) => {
  const suffix = `:load-${batch}`;
  return {
    ...entry,
    id: `${entry.id}${suffix}`,
    personId: entry.personId ? `${entry.personId}${suffix}` : entry.personId,
    eventId: entry.eventId ? `${entry.eventId}${suffix}` : entry.eventId,
    activityId: entry.activityId ? `${entry.activityId}${suffix}` : entry.activityId,
    relationId: entry.relationId ? `${entry.relationId}${suffix}` : entry.relationId
  };
};
const syntheticIndex = {
  ...index,
  lifespans: repeatEntries(index.lifespans, scaleFactor, rewrite),
  activities: repeatEntries(index.activities, scaleFactor, rewrite),
  events: repeatEntries(index.events, scaleFactor, rewrite),
  presences: repeatEntries(index.presences, scaleFactor, rewrite),
  relations: repeatEntries(index.relations ?? [], scaleFactor, rewrite)
};
const queryTimes = [];
for (let iteration = 0; iteration < 500; iteration += 1) {
  const period = samplePeriods[iteration % samplePeriods.length];
  const startedAt = performance.now();
  findLifespansDuring(syntheticIndex, period);
  findActivitiesDuring(syntheticIndex, period);
  findEventEntriesDuring(syntheticIndex, period);
  findDocumentedPresences(syntheticIndex, period);
  queryTimes.push(performance.now() - startedAt);
}

const distFiles = await listFiles(distRoot);
const distSizes = await Promise.all(distFiles.map(async path => ({
  path: relative(distRoot, path).replaceAll('\\', '/'),
  bytes: (await stat(path)).size
})));
const jsFiles = distFiles.filter(path => path.endsWith('.js'));
const jsDetails = await Promise.all(jsFiles.map(async path => {
  const content = await readFile(path);
  return {
    path: relative(distRoot, path).replaceAll('\\', '/'),
    rawBytes: content.byteLength,
    gzipBytes: gzipSync(content).byteLength
  };
}));
const mainJavaScript = [...jsDetails].sort((left, right) => right.rawBytes - left.rawBytes)[0];
const generatedFiles = (await listFiles(join(contentRoot, 'generated')))
  .filter(path => path.endsWith('.json'));
const generatedFileBytes = (await Promise.all(generatedFiles.map(path => stat(path))))
  .reduce((sum, item) => sum + item.size, 0);
const pageLoad = await measurePageLoad();

const report = {
  version: '1',
  corpus: {
    people: dataset.people.length,
    events: dataset.events.length,
    claims: dataset.claims.length,
    presences: dataset.presences.length,
    relations: relations.length
  },
  pageLoad,
  bundle: {
    totalBytes: distSizes.reduce((sum, file) => sum + file.bytes, 0),
    mainJavaScript,
    javascriptFiles: jsDetails.length
  },
  generatedData: {
    jsonFiles: generatedFiles.length,
    totalBytes: generatedFileBytes
  },
  snapshots: {
    iterations: snapshotTimes.length,
    averageMs: round(average(snapshotTimes)),
    p95Ms: round(percentile(snapshotTimes, 0.95))
  },
  severalHundredEntities: {
    scaleFactor,
    lifespans: syntheticIndex.lifespans.length,
    activities: syntheticIndex.activities.length,
    events: syntheticIndex.events.length,
    presences: syntheticIndex.presences.length,
    queryIterations: queryTimes.length,
    averageMs: round(average(queryTimes)),
    p95Ms: round(percentile(queryTimes, 0.95))
  },
  thresholds,
  passed: {
    pageLoad: pageLoad.interactiveMs <= thresholds.pageLoadMs,
    snapshots: average(snapshotTimes) <= thresholds.snapshotAverageMs,
    syntheticQueries: average(queryTimes) <= thresholds.syntheticQueryAverageMs,
    mainJavaScriptRaw: mainJavaScript.rawBytes <= thresholds.mainJavaScriptRawBytes,
    mainJavaScriptGzip: mainJavaScript.gzipBytes <= thresholds.mainJavaScriptGzipBytes
  }
};

const failures = Object.entries(report.passed).filter(([, passed]) => !passed);
if (failures.length > 0) {
  throw new Error(`Seuils de performance d\u00e9pass\u00e9s : ${failures.map(([name]) => name).join(', ')}.`);
}
if (!verifyOnly) {
  await mkdir(join(contentRoot, 'generated'), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
console.log([
  `Chargement interactif ${report.pageLoad.interactiveMs} ms`,
  `bundle principal ${mainJavaScript.rawBytes} o (${mainJavaScript.gzipBytes} o gzip)`,
  `snapshot moyen ${report.snapshots.averageMs} ms`,
  `index \u00e9largi ${report.severalHundredEntities.averageMs} ms/requ\u00eate`
].join(' \u00b7 '));