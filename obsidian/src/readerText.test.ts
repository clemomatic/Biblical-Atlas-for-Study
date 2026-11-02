import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanReadingText} from './readerText.ts';

test('Normalize NBSP, narrow spaces and invisible separators in Biblical text',()=>{
 const input='Deux\u00a0moineaux\u202fne\u200b tombent\u2060 pas\u00a0.';
 assert.equal(cleanReadingText(input),'Deux moineaux ne tombent pas .');
});
test('Clean literal double-encoded space entities and backslash Unicode sequences',()=>{
 const input='Deux&nbsp;moineaux&#8239;ne&#x202f;tombent\\u00a0pas';
 assert.equal(cleanReadingText(input),'Deux moineaux ne tombent pas');
});
test('Preserve meaningful numerical references, symbols and French punctuation',()=>{
 const input='En 2 Corinthiens 4:16, “l’homme intérieur” est renouvelé.';
 assert.equal(cleanReadingText(input),input);
});

test('Decode literal and doubly encoded nbsp, including malformed colon suffix',()=>{
 assert.equal(cleanReadingText('Matthieu&nbsp;10:29'),'Matthieu 10:29');
 assert.equal(cleanReadingText('Matthieu&nbsp: 10:29'),'Matthieu 10:29');
 assert.equal(cleanReadingText('Matthieu&amp;nbsp;10:29'),'Matthieu 10:29');
 assert.equal(cleanReadingText('Matthieu&amp;amp;nbsp;10:29'),'Matthieu 10:29');
 assert.equal(cleanReadingText('Jean&amp;#160;7:24'),'Jean 7:24');
});
test('Convert quotation and punctuation entities without swallowing ordinary text',()=>{
 assert.equal(cleanReadingText('«&nbsp;Jésus&nbsp;» &amp; son père — &hellip;'),'« Jésus » & son père — …');
 assert.equal(cleanReadingText('A & B (x>y)'), 'A & B (x>y)');
});
