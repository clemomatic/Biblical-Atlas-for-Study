import test from 'node:test';
import assert from 'node:assert/strict';
import { editFromMetadata, entityDataForNote, newEntity, parseEditBody, validateEntity } from './editable.ts';
import type { AtlasEntityType } from '../../src/atlasIntegration.ts';

test('customizations preserve IDs, descriptions in Markdown and arbitrary valid extra fields', () => {
  const p = { ...newEntity('place','p'), description: '## Ma recherche\n\n[[Ma note]]', custom: { field: true } };
  const data = validateEntity('place',p,'p');
  assert.equal(data.description,p.description); assert.throws(() => validateEntity('place',p,'other'));
  const stored = entityDataForNote(data); assert.equal(stored.description,undefined);
  const edit = editFromMetadata('P.md',{ atlas_entity:'place:p', atlas_data:stored, atlas_created:true })!;
  const raw = '---\natlas_entity: place:p\n---\n\n'+p.description;
  assert.equal(parseEditBody(edit,raw,true).data.description,p.description);
  assert.equal(parseEditBody(edit,raw,true).rawContent,raw);
});
test('all editable entity types reject invalid dates, nested values and malformed geography', () => {
  for (const type of ['person','place','route','event'] as AtlasEntityType[]) {
    const draft = newEntity(type,'id') as any;
    if (type === 'route') draft.points = [{name:'A',coordinates:[1,2]},{name:'B',coordinates:[3,4]}];
    assert.doesNotThrow(() => validateEntity(type,draft,'id'));
    assert.throws(() => validateEntity(type,{...draft,description:[]},'id'));
    assert.throws(() => validateEntity(type,{...draft,biblicalReferences:[42]},'id'));
    assert.throws(() => validateEntity(type,{...draft,...JSON.parse('{"__proto__":{}}')},'id'));
  }
  assert.throws(() => validateEntity('person',{...newEntity('person','p'),lifeSpan:{start:{yearMin:0,precision:'year'}}},'p'));
  assert.throws(() => validateEntity('place',{...newEntity('place','p'),coordinates:[91,35]},'p'));
  assert.throws(() => validateEntity('event',{...newEntity('event','e'),startYear:2,endYear:1},'e'));
  assert.throws(() => validateEntity('route',newEntity('route','r'),'r'));
  const event = validateEntity('event',{...newEntity('event','e'),startYear:-1,endYear:1},'e') as any;
  assert.equal(event.endPos-event.startPos,1);
});
