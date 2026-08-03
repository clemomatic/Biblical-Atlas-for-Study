import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chronologyPath = path.join(repoRoot, 'src', 'data', 'generated', 'authoritative-chronology.generated.json');
const bundle = JSON.parse(fs.readFileSync(chronologyPath, 'utf8'));
const records = bundle.records ?? [];
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isPeriod = record => normalize(record.recordType) === 'periode';
const isLife = record => normalize(record.category) === 'vie' && normalize(record.layer) === 'personnages';
const activityLayers = new Set(['regnes', 'prophetes', 'juges', 'voyages', 'ministere chretien', 'sanctuaire']);
const byId = new Map(records.map(record => [record.id, record]));
const lifeRecords = records.filter(isLife);
const subjectGroups = new Map();
lifeRecords.forEach(record => {
  const key = normalize(record.subject);
  subjectGroups.set(key, [...(subjectGroups.get(key) ?? []), record.id]);
});

const report = {
  generatedAt: new Date().toISOString(),
  recordCount: records.length,
  lifeRecordCount: lifeRecords.length,
  recordsWithPersonId: records.filter(record => record.personId).length,
  childRecordCount: records.filter(record => record.visualParentId).length,
  relativeChildCount: records.filter(record => record.visualParentId && record.startYear === undefined).length,
  duplicateLifeSubjects: [...subjectGroups]
    .filter(([, ids]) => ids.length > 1)
    .map(([subject, ids]) => ({ subject, ids })),
  activityPeriodsWithoutPersonId: records
    .filter(record => isPeriod(record) && activityLayers.has(normalize(record.layer)) && !record.personId)
    .map(record => ({ id: record.id, subject: record.subject, title: record.title })),
  orphanBiographicalParents: records
    .filter(record => record.personId && record.visualParentId && !record.visualParentId.startsWith('BOOK::'))
    .filter(record => !byId.has(record.visualParentId))
    .map(record => ({ id: record.id, visualParentId: record.visualParentId })),
  criticalBiographyCoverage: {
    samuel: [
      'samuel-vie', 'samuel-enfance-rama', 'samuel-presentation-silo',
      'samuel-service-silo', 'samuel-appel', 'samuel-prophete',
      'samuel-juge', 'samuel-circuit', 'samuel-rama', 'samuel-mort'
    ].map(id => ({ id, present: byId.has(id) })),
    saul: ['atlas-0087', 'wcg-jonathan'].map(id => ({ id, present: byId.has(id) }))
  }
};

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--verify')) {
  const missingCritical = Object.values(report.criticalBiographyCoverage)
    .flat()
    .filter(item => !item.present);
  if (missingCritical.length > 0 || report.orphanBiographicalParents.length > 0) {
    console.error('Échec du contrôle de cohérence chronologique.');
    process.exitCode = 1;
  }
}
