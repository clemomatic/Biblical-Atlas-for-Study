import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPopoverPosition } from './popoverPosition.ts';

test('Drag coordinates are clamped to the visible screen',()=>{
 assert.deepEqual(clampPopoverPosition(-200,-50,400,300,1200,800),{left:12,top:12});
 assert.deepEqual(clampPopoverPosition(1150,750,400,300,1200,800),{left:788,top:488});
 assert.deepEqual(clampPopoverPosition(246.5,119.2,400,300,1200,800),{left:247,top:119});
});

test('A previously placed reader remains accessible after switching to mobile',()=>{
 assert.deepEqual(clampPopoverPosition(700,650,366,470,390,780),{left:12,top:298});
 assert.deepEqual(clampPopoverPosition(20,400,366,470,390,780),{left:12,top:298});
});
