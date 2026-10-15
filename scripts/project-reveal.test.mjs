import assert from 'node:assert/strict';
import test from 'node:test';
import { projectRevealDelays } from '../lib/projectRevealDelays.ts';

test('desktop wave follows rendered coordinates, including equal diagonal positions', () => {
 const delays=projectRevealDelays([{x:56,y:20},{x:956,y:20},{x:56,y:270},{x:956,y:270}],true);
 assert.equal(delays[0],0);
 assert.equal(delays[1],delays[2]);
 assert.ok(delays[3]>delays[2]);
});
test('mobile ignores columns and reveals strictly down the page', () => {
 assert.deepEqual(projectRevealDelays([{x:56,y:20},{x:956,y:20},{x:56,y:120}],false),[0,0,90]);
});
test('long projects keep relative order within an 800ms entrance window', () => {
 const delays=projectRevealDelays([{x:0,y:0},{x:0,y:2000},{x:0,y:4000}],false);
 assert.deepEqual(delays,[0,400,800]);
 assert.deepEqual(projectRevealDelays([],true),[]);
});
