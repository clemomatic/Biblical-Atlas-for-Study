import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { generateDerivedHistoricalRelations } from './contentGeneration.ts';
import { loadHistoricalDataset } from './contentIO.ts';
import {
  buildHistoricalIndex,
  findContemporariesForSubject,
  findDocumentedPresences,
  findEventsDuring,
  findPeopleActiveDuring,
  findPeopleAtPlace,
  findPeopleLivingDuring
} from './historicalIndex.ts';
import {
  HistoricalDataValidationError,
  validateGeneratedRelations,
  validateHistoricalDataset
} from './contentValidation.ts';
import type { HistoricalDataset } from './contentTypes.ts';
import type {
  HistoricalClaim,
  ReviewedPlaceRecord
} from './contentTypes.ts';
import type { TemporalSpan } from './types.ts';

const fixtureRoot = join(process.cwd(), 'content', 'test-fixtures');

const loadFixture = (): Promise<HistoricalDataset> =>
  loadHistoricalDataset(fixtureRoot);

const exactYearSpan = (year: number): TemporalSpan => ({
  start: {
    yearMin: year,
    yearMax: year,
    precision: 'year',
    certainty: 'certain'
  },
  end: {
    yearMin: year,
    yearMax: year,
    precision: 'year',
    certainty: 'certain'
  },
  displayLabel: `Année fictive ${year}`
});

const createDirectClaim = (
  dataset: HistoricalDataset,
  input: Pick<
    HistoricalClaim,
    'id' | 'subject' | 'predicate' | 'object' | 'eventId' | 'placeId' | 'period'
  >
): HistoricalClaim => ({
  id: input.id,
  workflowStatus: 'reviewed',
  origin: 'reviewed',
  subject: input.subject,
  predicate: input.predicate,
  object: input.object,
  eventId: input.eventId,
  placeId: input.placeId,
  period: input.period,
  certainty: 'certain',
  evidence: [
    {
      sourceId: dataset.sources[0].id,
      shortReference: `Preuve directe fictive pour ${input.id}.`,
      method: 'direct',
      humanReviewStatus: 'reviewed'
    }
  ]
});

const addLifespanClaims = (dataset: HistoricalDataset): void => {
  dataset.people.forEach(record => {
    const claimId = `claim-test-lifespan-${record.person.id}`;
    dataset.claims.push(
      createDirectClaim(dataset, {
        id: claimId,
        subject: {
          entityType: 'person',
          entityId: record.person.id
        },
        predicate: 'birth',
        period: record.person.lifeSpan
      })
    );
    record.person.lifeSpanClaimIds = [claimId];
  });
};

const addDirectParticipations = (dataset: HistoricalDataset): void => {
  dataset.people.forEach(record => {
    dataset.claims.push(
      createDirectClaim(dataset, {
        id: `claim-test-participation-${record.person.id}`,
        subject: {
          entityType: 'person',
          entityId: record.person.id
        },
        predicate: 'participation',
        object: {
          entityType: 'event',
          entityId: 'event-test-rencontre'
        },
        eventId: 'event-test-rencontre'
      })
    );
  });
};

const addSharedActivities = (dataset: HistoricalDataset): void => {
  dataset.people.forEach(record => {
    const claimId = `claim-test-office-${record.person.id}`;
    const activityId = `activity-test-${record.person.id}`;
    dataset.claims.push(
      createDirectClaim(dataset, {
        id: claimId,
        subject: {
          entityType: 'person',
          entityId: record.person.id
        },
        predicate: 'office',
        period: exactYearSpan(-5)
      })
    );
    record.person.activityPeriods.push({
      id: activityId,
      type: 'office',
      label: 'Fonction fictive',
      span: exactYearSpan(-5),
      certainty: 'certain',
      supportingClaimIds: [claimId]
    });
  });
};

const addSecondPlace = (
  dataset: HistoricalDataset,
  regionIds: string[] = []
): ReviewedPlaceRecord => {
  const place: ReviewedPlaceRecord = {
    workflowStatus: 'reviewed',
    sourceIds: [dataset.sources[0].id],
    place: {
      id: 'place-test-beta',
      name: 'Lieu fictif Bêta',
      regionIds
    }
  };
  dataset.places.push(place);
  return place;
};

const expectInvalid = (
  dataset: HistoricalDataset,
  expectedMessage: RegExp
): void => {
  assert.throws(
    () => validateHistoricalDataset(dataset),
    error =>
      error instanceof HistoricalDataValidationError &&
      error.issues.some(issue => expectedMessage.test(issue.message))
  );
};

test('valide le jeu fictif isolé et génère une relation déterministe', async () => {
  const dataset = await loadFixture();

  assert.doesNotThrow(() => validateHistoricalDataset(dataset));
  const relations = generateDerivedHistoricalRelations(dataset);
  assert.equal(relations.length, 1);
  assert.equal(relations[0].origin, 'generated');
  assert.equal(relations[0].relationLevel, 'same-place');
  assert.deepEqual(relations[0].generatedFromIds, [
    'presence-test-alpha',
    'presence-test-beta'
  ]);
  assert.equal(
    relations.some(relation => relation.id.includes('staging-test-record')),
    false,
    'staging ne doit jamais participer à la génération'
  );
  assert.doesNotThrow(() =>
    validateGeneratedRelations(relations, dataset)
  );
  assert.deepEqual(
    generateDerivedHistoricalRelations(dataset),
    relations,
    'deux générations du même corpus doivent être identiques'
  );
});

test('distingue des contemporains d’une rencontre attestée', async () => {
  const dataset = await loadFixture();
  dataset.presences = [];
  addLifespanClaims(dataset);
  validateHistoricalDataset(dataset);

  const relations = generateDerivedHistoricalRelations(dataset);
  assert.equal(
    relations.some(
      relation => relation.relationLevel === 'lifespan-overlap'
    ),
    true
  );
  assert.equal(
    relations.some(
      relation => relation.relationLevel === 'documented-interaction'
    ),
    false
  );
});

test('ne relie pas deux présences au même lieu à des périodes différentes', async () => {
  const dataset = await loadFixture();
  dataset.presences[1].period = exactYearSpan(5);

  assert.equal(generateDerivedHistoricalRelations(dataset).length, 0);
});

test('ne relie pas deux présences simultanées dans des lieux différents', async () => {
  const dataset = await loadFixture();
  addSecondPlace(dataset);
  dataset.presences[1].placeId = 'place-test-beta';

  assert.equal(generateDerivedHistoricalRelations(dataset).length, 0);
});

test('distingue la même région du même lieu', async () => {
  const dataset = await loadFixture();
  dataset.places[0].place.regionIds = ['region-test-alpha'];
  addSecondPlace(dataset, ['region-test-alpha']);
  dataset.presences[1].placeId = 'place-test-beta';

  const relations = generateDerivedHistoricalRelations(dataset);
  assert.deepEqual(
    relations.map(relation => relation.relationLevel),
    ['same-region']
  );
  assert.deepEqual(relations[0].placeIds, [
    'place-test-alpha',
    'place-test-beta'
  ]);
});

test('relie deux participations directes au même événement sans inventer une interaction', async () => {
  const dataset = await loadFixture();
  dataset.presences = [];
  addDirectParticipations(dataset);

  const relations = generateDerivedHistoricalRelations(dataset);
  assert.equal(
    relations.some(relation => relation.relationLevel === 'same-event'),
    true
  );
  assert.equal(
    relations.some(
      relation => relation.relationLevel === 'documented-interaction'
    ),
    false
  );
});

test('plafonne à possible une relation issue d’une date approximative', async () => {
  const dataset = await loadFixture();
  const approximateBoundary = dataset.presences[1].period.start;
  assert.ok(approximateBoundary);
  approximateBoundary.approximate = true;
  approximateBoundary.uncertaintyYears = 1;

  const relations = generateDerivedHistoricalRelations(dataset);
  assert.equal(relations[0].relationLevel, 'same-place');
  assert.equal(relations[0].certainty, 'possible');
});

test('ne produit aucun chevauchement avec une période inconnue', async () => {
  const dataset = await loadFixture();
  dataset.presences[1].period = {
    start: {
      precision: 'unknown',
      certainty: 'unknown'
    },
    displayLabel: 'Période fictive inconnue'
  };

  assert.equal(generateDerivedHistoricalRelations(dataset).length, 0);
});

test('génère séparément les activités simultanées', async () => {
  const dataset = await loadFixture();
  dataset.presences = [];
  addSharedActivities(dataset);
  validateHistoricalDataset(dataset);

  const relations = generateDerivedHistoricalRelations(dataset);
  assert.deepEqual(
    relations.map(relation => relation.relationLevel),
    ['activity-overlap']
  );
});

test('exige un claim direct pour une interaction attestée', async () => {
  const dataset = await loadFixture();
  dataset.presences = [];
  dataset.claims.push(
    createDirectClaim(dataset, {
      id: 'claim-test-interaction-directe',
      subject: {
        entityType: 'person',
        entityId: 'person-test-alpha'
      },
      predicate: 'attested-interaction',
      object: {
        entityType: 'person',
        entityId: 'person-test-beta'
      },
      eventId: 'event-test-rencontre'
    })
  );

  const relations = generateDerivedHistoricalRelations(dataset);
  assert.deepEqual(
    relations.map(relation => relation.relationLevel),
    ['documented-interaction']
  );
});

test('construit des index compacts pour les requêtes historiques', async () => {
  const dataset = await loadFixture();
  addLifespanClaims(dataset);
  addSharedActivities(dataset);
  const relations = generateDerivedHistoricalRelations(dataset);
  const index = buildHistoricalIndex(dataset, relations);
  const period = exactYearSpan(-5);

  assert.deepEqual(findPeopleLivingDuring(index, period), [
    'person-test-alpha',
    'person-test-beta'
  ]);
  assert.deepEqual(findPeopleActiveDuring(index, period), [
    'person-test-alpha',
    'person-test-beta'
  ]);
  assert.deepEqual(findEventsDuring(index, period), [
    'event-test-rencontre'
  ]);
  assert.equal(findDocumentedPresences(index, period).length, 2);
  assert.deepEqual(findPeopleAtPlace(index, 'place-test-alpha', period), [
    'person-test-alpha',
    'person-test-beta'
  ]);
  assert.deepEqual(
    findContemporariesForSubject(
      index,
      relations,
      'person-test-alpha'
    ),
    ['person-test-beta']
  );
  assert.deepEqual(buildHistoricalIndex(dataset, relations), index);
});

test('refuse un identifiant dupliqué', async () => {
  const dataset = await loadFixture();
  dataset.people[1].person.id = dataset.people[0].person.id;
  expectInvalid(dataset, /Identifiant dupliqué/);
});

test('refuse une source inexistante', async () => {
  const dataset = await loadFixture();
  dataset.claims[0].evidence[0].sourceId = 'source-absente';
  expectInvalid(dataset, /Source inexistante/);
});

test('refuse un calcul sans affirmations d’entrée', async () => {
  const dataset = await loadFixture();
  const evidence = dataset.claims[2].evidence[0];
  evidence.inputClaimIds = [];
  expectInvalid(dataset, /affirmations d’entrée/);
});

test('refuse une donnée relue sans source', async () => {
  const dataset = await loadFixture();
  dataset.people[0].sourceIds = [];
  expectInvalid(dataset, /au moins une source/);
});

test('refuse une période impossible', async () => {
  const dataset = await loadFixture();
  const period = dataset.claims[0].period;
  assert.ok(period?.start && period.end);
  period.start.yearMin = -4;
  period.start.yearMax = -4;
  period.end.yearMin = -8;
  period.end.yearMax = -8;
  expectInvalid(dataset, /borne de début/);
});

test('refuse un personnage ou un lieu inexistant', async () => {
  const dataset = await loadFixture();
  dataset.presences[0].personId = 'personne-absente';
  dataset.presences[0].placeId = 'lieu-absent';
  expectInvalid(dataset, /Personnage inexistant/);
  expectInvalid(dataset, /Lieu inexistant/);
});

test('refuse un fichier staging présenté comme validé', async () => {
  const dataset = await loadFixture();
  dataset.staging[0].workflowStatus = 'reviewed';
  dataset.staging[0].presentedAsValidated = true;
  expectInvalid(dataset, /staging ne peut pas être présenté/);
});

test('refuse une affirmation générée déposée dans reviewed', async () => {
  const dataset = await loadFixture();
  dataset.claims[0].origin = 'generated';
  expectInvalid(dataset, /générée ne peut pas être enregistrée dans reviewed/);
});

test('refuse une longue reproduction à la place d’une référence courte', async () => {
  const dataset = await loadFixture();
  dataset.claims[0].evidence[0].shortReference = 'x'.repeat(281);
  expectInvalid(dataset, /dépasse 280 caractères/);
});
