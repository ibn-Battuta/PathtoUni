import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitCount, validateAtarPattern, subjectsHeld, discardBuffer } from '../engine/units.js';
import { YEAR11, YEAR12_EXT2, YEAR12_DROP_BOTH, YEAR11_DROP_BOTH } from './fixtures.js';

test('Year 11 profile is 13 units', () => {
  assert.equal(unitCount(YEAR11), 13);
});

test('Extension 2 recount takes Year 12 to 14 units, not 13', () => {
  // NESA: "For students entered in Mathematics Extension 2, both Mathematics Extension 1
  // and Mathematics Extension 2 are counted as 2-unit courses."
  assert.equal(unitCount(YEAR12_EXT2), 14);
});

test('an Extension 2 student does NOT sit Mathematics Advanced', () => {
  const held = subjectsHeld(YEAR12_EXT2);
  assert.equal(held.has('Mathematics Advanced'), false);
  assert.equal(held.has('Mathematics Extension 1'), true);
  assert.equal(held.has('Mathematics Extension 2'), true);
});

test('WITH Extension 2, dropping both History and Engineering Studies lands on exactly 10 units and is valid', () => {
  assert.equal(unitCount(YEAR12_DROP_BOTH), 10);
  assert.equal(validateAtarPattern(YEAR12_DROP_BOTH).valid, true);
});

test('WITHOUT Extension 2, dropping both falls to 9 units and fails the ATAR floor', () => {
  assert.equal(unitCount(YEAR11_DROP_BOTH), 9);
  const r = validateAtarPattern(YEAR11_DROP_BOTH);
  assert.equal(r.valid, false);
  assert.match(r.violations.join(' '), /at least 10 units/);
});

test('discard buffer shrinks to zero at 10 units', () => {
  assert.equal(discardBuffer(YEAR12_DROP_BOTH).discardableUnits, 0);
  assert.equal(discardBuffer(YEAR12_EXT2).discardableUnits, 4);
});

test('dropping both sits on BOTH floors at once - 10 units and exactly 4 subject areas', () => {
  const r = validateAtarPattern(YEAR12_DROP_BOTH);
  assert.equal(r.units, 10);
  assert.equal(r.areas, 4);      // English, Mathematics, Physics, Chemistry
  assert.equal(r.valid, true);   // valid, but with zero margin on either rule
});
