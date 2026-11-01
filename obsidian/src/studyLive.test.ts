import test from 'node:test';
import assert from 'node:assert/strict';
import { dayLink, weekMonday, weekTitle, meetingIssueLink, isMeetingWeek } from './studyLive.ts';

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

test('weekly meeting source is separate from Daily Text and follows the Monday issue date',()=>{
 const sunday=new Date(2026,10,1);
 assert.equal(meetingIssueLink(sunday),
  'https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-septembre-octobre-2026/');
 assert.equal(meetingIssueLink(new Date(2026,10,2)),
  'https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-novembre-decembre-2026/');
 assert.equal(meetingIssueLink(new Date(2027,0,1)),
  'https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-novembre-decembre-2026/');
});

test('Real WOL meeting week headings: same-month, cross-month and ordinal 1er',()=>{
 assert.equal(isMeetingWeek('2-8 NOVEMBRE',new Date(2026,10,2)),true);
 assert.equal(isMeetingWeek('2-8 novembre Cahier Vie et ministère',new Date(2026,10,4)),true);
 assert.equal(isMeetingWeek('26 OCTOBRE – 1er NOVEMBRE',new Date(2026,10,1)),true);
 assert.equal(isMeetingWeek('26 octobre – 1er novembre',new Date(2026,9,31)),true);
 assert.equal(isMeetingWeek('26 octobre – 1er novembre',new Date(2026,10,2)),false);
 assert.equal(isMeetingWeek('2-8 décembre',new Date(2026,10,2)),false);
});
