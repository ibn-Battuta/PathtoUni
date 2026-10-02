import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogue, readiness } from '../engine/index.js';
import { applyClassifier, fieldCounts, FIELDS } from '../ui/classify.js';
import { YEAR11 } from './fixtures.js';

const { courses, gates } = loadCatalogue();
const results = courses.map(c => {
  const r = readiness(YEAR11, c, { gates });
  return { ...r, course: c, university: c.university };
});

test('classifying by field does not change any course band', () => {
  const eng = applyClassifier(results, { field: 'engineering' });
  assert.ok(eng.length > 0);
  assert.ok(eng.length < results.length);
  for (const r of eng) {
    const full = results.find(x => x.courseId === r.courseId);
    assert.equal(r.band, full.band);
    assert.equal(r.course.field, 'engineering');
  }
});

test('every STEM field is present so the classifier is not a stub', () => {
  const counts = fieldCounts(results);
  for (const f of FIELDS) {
    assert.ok(counts[f.id] > 0, f.id + ' has no courses');
  }
  const sum = FIELDS.reduce((a, f) => a + counts[f.id], 0);
  assert.equal(sum, results.length);
});

test('clearing the filter restores the full list', () => {
  const subset = applyClassifier(results, { field: 'health', university: 'UNSW' });
  const all = applyClassifier(results, {});
  assert.ok(subset.length < all.length);
  assert.equal(all.length, results.length);
});
