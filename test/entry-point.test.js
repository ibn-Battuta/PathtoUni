// Error 18: two courses no school leaver can start — an honours year after a degree, and
// an add-on degree taken beside another one — were listed as courses a Year 12 student was
// "ready for". Same axis as error 16 (who may apply), different pattern. Each assertion
// here was checked by breaking the thing it guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isLiteralSubstring } from '../pipeline/quote.js';
import { extractCoursePage, notEntryPointFrom } from '../pipeline/html-course.js';
import { loadCatalogue } from '../engine/index.js';
import { readiness, shortlist, isEntryPoint } from '../engine/readiness.js';
import { validateDiscovery, computeNeighbours } from '../pipeline/discovery.js';
import { courseDescription } from '../ui/meta.js';
import { YEAR12_EXT2, STANDARD_MATHS } from './fixtures.js';

const { courses, gates } = loadCatalogue();
const KNOWN = {
  'unsw-computational-design-honours': 'captures/unsw-courses/2026-08-28/pages/bachelor-of-computational-design-honours',
  'wsu-applied-data-science': 'captures/wsu-courses/2026-08-27/pages/bachelor-of-applied-data-science'
};
const page = dir => ({
  html: fs.readFileSync(path.join(dir, 'source.html'), 'utf8'),
  text: fs.readFileSync(path.join(dir, 'text.txt'), 'utf8')
});

test('the two known non-entry courses are flagged, with a quote found verbatim in the capture', () => {
  for (const [id, dir] of Object.entries(KNOWN)) {
    const c = courses.find(x => x.id === id);
    assert.ok(c?.notEntryPoint, id + ': not flagged');
    const { html, text } = page(dir);
    assert.ok(isLiteralSubstring(`${html}\n${text}`, c.notEntryPoint.quote), id + ': quote not in capture');
  }
});

test('the extractor produces the flag from the saved page, so a refresh keeps it', () => {
  for (const [id, dir] of Object.entries(KNOWN)) {
    const r = extractCoursePage({ ...page(dir), url: 'u', source: { prefix: id.split('-')[0] }, capturedOn: 'x' });
    assert.equal(r.id, id);
    assert.ok(r.notEntryPoint, id + ': extractor lost the flag');
  }
});

test('a page without the sentence is not flagged, and an unverifiable sentence records nothing', () => {
  assert.equal(notEntryPointFrom('A three-year degree.', 'A three-year degree.', 'u'), null);
  const body = 'This program is not a stand-alone degree, but is an add-on.';
  assert.equal(notEntryPointFrom(body, 'something else entirely', 'u'), null);
});

test('only these courses are flagged — a pattern that catches ordinary degrees would hide them', () => {
  const flagged = courses.filter(c => c.notEntryPoint).map(c => c.id).sort();
  assert.deepEqual(flagged, Object.keys(KNOWN).sort());
});

test('shortlist never lists them; readiness still carries the flag out', () => {
  for (const p of [YEAR12_EXT2, STANDARD_MATHS]) {
  const ids = shortlist(p, courses, { gates }).map(r => r.courseId);
  assert.equal(ids.length, courses.length - Object.keys(KNOWN).length);
  for (const id of Object.keys(KNOWN)) {
    assert.ok(!ids.includes(id), id + ' listed');
    const c = courses.find(x => x.id === id);
    assert.ok(readiness(p, c, { gates }).notEntryPoint, id + ': flag lost in the engine');
    assert.equal(isEntryPoint(c), false);
  }
  }
});

test('no discovery entry may describe one, and none is anyone\'s neighbour', () => {
  for (const id of Object.keys(KNOWN)) {
    const errs = validateDiscovery({ courseId: id, firstYear: 'x', notThis: 'y', neighbours: [] }, courses);
    assert.ok(errs.some(e => /entry point/.test(e)), id + ': description allowed');
  }
  for (const c of courses) {
    for (const n of computeNeighbours(c, courses)) assert.ok(!(n in KNOWN), c.id + ' neighbours ' + n);
  }
});

test('neighbours need something in common — no alphabetical fill', () => {
  for (const c of courses) {
    const mine = new Set((c.assumedKnowledge ?? []).map(a => a.subject));
    for (const n of computeNeighbours(c, courses)) {
      const o = courses.find(x => x.id === n);
      assert.ok((o.assumedKnowledge ?? []).some(a => mine.has(a.subject)), c.id + ' -> ' + n + ' share nothing');
    }
  }
});

test('the search snippet leads with it', () => {
  for (const id of Object.keys(KNOWN)) {
    const c = courses.find(x => x.id === id);
    assert.match(courseDescription(c), /not entered straight from school/);
  }
});

test('the build keeps the flag, and the course page says it above the subjects', () => {
  const js = 'dist/app.js';
  if (!fs.existsSync(js)) return;
  const bundle = fs.readFileSync(js, 'utf8');
  for (const id of Object.keys(KNOWN)) {
    const i = bundle.indexOf('"' + id + '"');
    assert.ok(i > -1, id + ' missing from the bundle');
    assert.ok(/"notEntryPoint"\s*:/.test(bundle.slice(i, i + 2500)), id + ': flag dropped by the build');
    const html = fs.readFileSync(path.join('dist', 'course', id, 'index.html'), 'utf8');
    assert.ok(html.includes('Not a course you start straight from school'), id + ': page silent');
    assert.ok(!html.includes('Check my subjects against this course'), id + ': links to results it is not in');
    assert.ok(html.indexOf('Who can start this') < html.indexOf('Assumed knowledge</h3>'), id + ': below the subjects');
  }
});

test('the Co-op degree carries its separate application as a hurdle, quoted', () => {
  const c = courses.find(x => x.id === 'unsw-information-systems-co-op-honours');
  assert.equal(c.field, 'computing');
  const h = c.extraHurdles.find(x => x.type === 'interview');
  assert.ok(h, 'hurdle missing');
  const { html, text } = page('captures/unsw-courses/2026-08-28/pages/bachelor-of-information-systems-co-op-honours');
  assert.ok(isLiteralSubstring(`${html}\n${text}`, h.quote), 'hurdle quote not in capture');
});
