import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogue, readiness, validateAtarPattern } from '../engine/index.js';
import { compareResults } from '../ui/compare.js';
import { YEAR11, YEAR12_EXT2, STANDARD_MATHS } from './fixtures.js';

const { courses, gates } = loadCatalogue();
const run = (p) => courses.map(c => {
  const r = readiness(p, c, { gates });
  return { ...r, course: c, university: c.university };
});

test('two identical sets report every usable course as the same, with no difference list', () => {
  const r = compareResults(run(YEAR11), run(YEAR11));
  assert.equal(r.aOpens.length, 0);
  assert.equal(r.bOpens.length, 0);
  assert.equal(r.same.length, r.total);
  assert.ok(r.total > 0);
});

test('a swap that breaks the ATAR pattern is not comparable on courses', () => {
  const broken = { ...YEAR11, english: [], sciences: [], technology: [], other: [] };
  const pat = validateAtarPattern(broken);
  assert.equal(pat.valid, false);
});

test('restricted and incomplete courses are not counted as something either set opens', () => {
  const r = compareResults(run(YEAR11), run(YEAR12_EXT2));
  for (const p of [...r.aOpens, ...r.bOpens, ...r.same]) {
    assert.equal(p.a.restrictedTo, null);
    assert.equal(p.b.restrictedTo, null);
    assert.equal(p.a.complete, true);
    assert.equal(p.b.complete, true);
  }
});

test('where sets differ, each side has findings to show as reasons', () => {
  const r = compareResults(run(YEAR12_EXT2), run(STANDARD_MATHS));
  const diffs = [...r.aOpens, ...r.bOpens];
  assert.ok(diffs.length > 0);
  for (const p of diffs) {
    const worse = p.a.band > p.b.band ? p.a : p.b;
    assert.ok((worse.findings && worse.findings.length) || worse.bandName === 'GATED' || worse.gateStatus === 'unconfirmed',
      worse.courseId + ' ' + worse.bandName);
  }
});
