import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeState, decodeState, isCompleteSelection, encodeCompare, decodeSetB } from '../ui/hash.js';

test('hash round-trip matches the documented results URL shape', () => {
  const state = {
    year: 12,
    mathsPathway: 'advanced_ext1_ext2',
    english: ['english_advanced'],
    sciences: ['physics', 'chemistry'],
    technology: ['engineering_studies'],
    otherCount: 1,
    bands: { 'Mathematics Extension 1': { band: 3, scale: 'extension' } }
  };
  const hash = encodeState(state);
  assert.match(hash, /y=12/);
  assert.match(hash, /m=ext12/);
  assert.match(hash, /e=adv/);
  assert.match(hash, /s=phy%2Cchem|s=phy,chem/);
  assert.match(hash, /t=engstud/);
  assert.match(hash, /o=1/);
  assert.match(hash, /b=ext1%3AE3|b=ext1:E3/);
  const back = decodeState(hash);
  assert.equal(back.year, 12);
  assert.equal(back.mathsPathway, 'advanced_ext1_ext2');
  assert.deepEqual(back.english, ['english_advanced']);
  assert.deepEqual(back.sciences, ['physics', 'chemistry']);
  assert.deepEqual(back.technology, ['engineering_studies']);
  assert.equal(back.otherCount, 1);
  assert.equal(back.bands['Mathematics Extension 1'].band, 3);
  assert.equal(back.bands['Mathematics Extension 1'].scale, 'extension');
  assert.equal(isCompleteSelection(back), true);
});

test('a field filter round-trips on the hash and an old link without f still means all areas', () => {
  const state = {
    year: 12, mathsPathway: 'advanced', english: ['english_advanced'],
    sciences: ['physics'], technology: [], otherCount: 0, bands: {},
    filterField: 'engineering', filterUni: 'UNSW'
  };
  const hash = encodeState(state);
  assert.match(hash, /f=eng/);
  assert.match(hash, /u=unsw/);
  const back = decodeState(hash);
  assert.equal(back.filterField, 'engineering');
  assert.equal(back.filterUni, 'UNSW');
  const old = decodeState('y=12&m=adv&e=adv');
  assert.equal(old.filterField, null);
  assert.equal(old.filterUni, null);
});

test('Year 11 cannot carry Extension 2 through the hash', () => {
  const s = decodeState('y=11&m=ext12&e=adv');
  assert.equal(s.year, 11);
  assert.equal(s.mathsPathway, 'advanced_ext1');
});

test('an empty hash is an incomplete selection, not a silent default profile', () => {
  const s = decodeState('');
  assert.equal(isCompleteSelection(s), false);
  assert.equal(s.year, null);
  assert.equal(s.mathsPathway, null);
});

test('an old single-set hash still resolves to a normal result when b* keys are absent', () => {
  const hash = encodeState({
    year: 12, mathsPathway: 'advanced', english: ['english_advanced'],
    sciences: ['biology'], technology: [], otherCount: 2, bands: {}
  });
  assert.equal(decodeSetB(hash), null);
  const a = decodeState(hash);
  assert.equal(a.mathsPathway, 'advanced');
  assert.deepEqual(a.sciences, ['biology']);
});

test('compare hash keeps set A keys and prefixes set B', () => {
  const a = {
    year: 12, mathsPathway: 'advanced_ext1_ext2', english: ['english_advanced'],
    sciences: ['physics', 'chemistry'], technology: [], otherCount: 1, bands: {}
  };
  const b = {
    year: 12, mathsPathway: 'advanced', english: ['english_advanced'],
    sciences: ['biology'], technology: [], otherCount: 2, bands: {}
  };
  const hash = encodeCompare(a, b);
  assert.match(hash, /y=12/);
  assert.match(hash, /m=ext12/);
  assert.match(hash, /bm=adv/);
  const backA = decodeState(hash);
  const backB = decodeSetB(hash);
  assert.equal(backA.mathsPathway, 'advanced_ext1_ext2');
  assert.equal(backB.mathsPathway, 'advanced');
  assert.deepEqual(backB.sciences, ['biology']);
});
