// The 24 Oct 2026 re-check against the live university pages. Errors 22 and 23: each guard
// was checked by breaking the data it guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogue } from '../engine/index.js';
import { readiness, BAND_NAME } from '../engine/readiness.js';

const { courses, gates } = loadCatalogue();
const byId = id => courses.find(c => c.id === id);
const P = (mathsPathway, bands = {}) => ({ year: 12, mathsPathway, english: ['english_advanced'], sciences: ['physics', 'chemistry'], others: [], bands });
const band = (id, p) => BAND_NAME[readiness(p, byId(id), { gates }).band];

test('error 22: Wollongong Mathematics degrees carry their published maths prerequisite', () => {
  for (const id of ['uow-mathematics', 'uow-engineering-honours-mathematics']) {
    assert.deepEqual(byId(id).hardRules, ['uow-maths-std2'], id);
    assert.equal(band(id, P('standard2', { 'Mathematics Standard 2': { band: 1 } })), 'GATED', id + ': Standard 2 Band 1 is below the prerequisite');
    assert.notEqual(band(id, P('advanced', { 'Mathematics Advanced': { band: 4 } })), 'GATED', id + ': a harder maths course is not shut out');
  }
  assert.equal(band('uow-mathematics', P('standard2', { 'Mathematics Standard 2': { band: 3 } })), 'PREPARED');
  assert.match(gates['uow-maths-std2'].quote, /must have studied the equivalent of NSW HSC Mathematics Standard 2 \(minimum Band 2\)/);
});

test('error 23: "Mathematics Advanced or Mathematics Standard 2" is either, not both', () => {
  assert.equal(band('uow-computer-science', P('standard2', { 'Mathematics Standard 2': { band: 3 } })), 'PREPARED');
  assert.equal(byId('uow-computer-science').assumedKnowledge.filter(a => /^Mathematics/.test(a.subject)).length, 1);
});

test('Macquarie\'s Band 4 assumption is carried, so a lower band is not silence', () => {
  for (const id of ['mq-engineering-honours', 'mq-science']) {
    const a = byId(id).assumedKnowledge.find(x => x.subject === 'Mathematics Advanced');
    assert.equal(a.minBand, 4, id);
    assert.match(a.quote, /Band 4/);
  }
  assert.notEqual(band('mq-engineering-honours', P('advanced', { 'Mathematics Advanced': { band: 3 } })), 'PREPARED');
});

test('Wollongong pages that list assumed and recommended subjects are no longer empty on the site', () => {
  assert.ok(byId('uow-nursing').assumedKnowledge.some(a => a.subject === 'any two units of Science'));
  assert.ok((byId('uow-mathematics').recommendedStudies || []).some(r => r.subject === 'Mathematics Extension 1'));
  assert.ok((byId('uow-engineering-honours-mathematics').recommendedStudies || []).length >= 4);
});
