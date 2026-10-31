import test from 'node:test';
import assert from 'node:assert/strict';
import { dayLink, weekMonday, weekTitle } from './studyLive.ts';

test('WOL date URLs use local calendar components and handle leap days',()=>{
  assert.equal(dayLink(new Date(2024,1,29)),'https://wol.jw.org/fr/wol/dt/r30/lp-f/2024/2/29');
  assert.equal(dayLink(new Date(2026,9,31)),'https://wol.jw.org/fr/wol/dt/r30/lp-f/2026/10/31');
});
test('meeting Monday/week title handles month and year boundaries without ISO ambiguity',()=>{
  const saturday=new Date(2026,9,31);
  const monday=weekMonday(saturday);
  assert.equal(monday.getFullYear(),2026);
  assert.equal(monday.getMonth(),9);
  assert.equal(monday.getDate(),26);
  assert.match(weekTitle(saturday),/26 octobre.*1 novembre/i);
  const mondayYear=weekMonday(new Date(2027,0,1));
  assert.equal(mondayYear.getFullYear(),2026);
  assert.equal(mondayYear.getMonth(),11);
  assert.equal(mondayYear.getDate(),28);
});
