import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalogue } from '../engine/index.js';
import { attachOfferCount, nameKey } from '../pipeline/familiarity.js';
import { validateDiscovery, REQUIREMENT_CLAIM, computeNeighbours } from '../pipeline/discovery.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { courses } = loadCatalogue();
const withOffers = attachOfferCount(courses);

test('extractors no longer hardcode nameRecognition as low', () => {
  for (const f of ['pipeline/usyd-table.js', 'pipeline/html-course.js', 'pipeline/diff.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(src, /nameRecognition:\s*'low'/, f);
  }
});

test('the unfamiliar cut is a minority of the catalogue, derived from offer counts', () => {
  const uncommon = withOffers.filter(c => c.offerCount === 1);
  assert.ok(uncommon.length < courses.length / 2, `uncommon ${uncommon.length} of ${courses.length}`);
  const science = withOffers.filter(c => nameKey(c.name) === nameKey('Bachelor of Science'));
  assert.ok(science.length >= 2, 'Bachelor of Science should not be a singleton');
  assert.ok(science.every(c => c.offerCount >= 2));
});

test('an entry containing a requirement claim fails validation — verified by adding one', () => {
  const id = courses[0].id;
  const errors = validateDiscovery({
    courseId: id,
    firstYear: 'students require a strong maths background',
    notThis: 'not medicine',
    neighbours: [],
    reviewed: true
  }, courses);
  assert.ok(errors.some(e => /requirement claim/.test(e)));
  assert.ok(REQUIREMENT_CLAIM.test('requires a strong maths background'));
});

test('an entry naming a non-existent neighbour fails validation — verified by adding one', () => {
  const errors = validateDiscovery({
    courseId: courses[0].id,
    firstYear: 'first year is mostly labs and a statistics unit',
    notThis: 'this is not a medical degree',
    neighbours: ['not-a-real-course'],
    reviewed: false
  }, courses);
  assert.ok(errors.some(e => /not-a-real-course/.test(e)));
});

test('computed neighbours exist in the catalogue', () => {
  const c = courses.find(x => (x.assumedKnowledge || []).length) || courses[0];
  for (const id of computeNeighbours(c, courses)) {
    assert.ok(courses.some(x => x.id === id), id);
  }
});

test('reviewed:false discovery entries appear nowhere in dist', () => {
  const dir = path.join(ROOT, 'data', 'discovery');
  if (!fs.existsSync(dir)) return;
  const unreviewed = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const e = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (e.reviewed !== true) unreviewed.push(e);
  }
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist) || !unreviewed.length) return;
  const app = fs.existsSync(path.join(dist, 'app.js')) ? fs.readFileSync(path.join(dist, 'app.js'), 'utf8') : '';
  for (const e of unreviewed) {
    if (e.firstYear) assert.ok(!app.includes(e.firstYear), 'unreviewed firstYear leaked into dist');
    if (e.notThis) assert.ok(!app.includes(e.notThis), 'unreviewed notThis leaked into dist');
  }
});
