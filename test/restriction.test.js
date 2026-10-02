// Who may apply at all is a different axis from readiness. These tests exist because the
// first version of the site listed two courses that are open only to Aboriginal and Torres
// Strait Islander students as bare links under "Everything else you are ready for": the
// parser read the special-entry cell for portfolios and interviews and dropped the sentence
// that decided eligibility. Omission failed toward the reassuring answer again — this time
// by opening a door that is closed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isLiteralSubstring } from '../pipeline/quote.js';
import { restrictionFrom } from '../pipeline/usyd-table.js';
import { readiness } from '../engine/readiness.js';

const CAPTURE = 'captures/usyd-table/2026-08-27/text.txt';
const usyd = JSON.parse(fs.readFileSync('data/courses/usyd.json', 'utf8'));
const restricted = usyd.courses.filter(c => c.restrictedTo);

test('the known restricted courses are still marked restricted', () => {
  const ids = restricted.map(c => c.id).sort();
  assert.deepEqual(ids, ['usyd-science-extended', 'usyd-science-extended-health']);
});

test('every restriction quote is literally in the capture', { skip: !fs.existsSync(CAPTURE) }, () => {
  const cap = fs.readFileSync(CAPTURE, 'utf8');
  for (const c of restricted) {
    const parts = c.restrictedTo.quoteParts;
    assert.ok(Array.isArray(parts) && parts.length, c.id + ' has no quote parts');
    for (const q of parts) {
      assert.ok(isLiteralSubstring(cap, q), c.id + ' quote not in capture: ' + JSON.stringify(q));
    }
    // The displayed sentence must be exactly the checked fragments, never a paraphrase
    // of them. This is the only reason a joined quote is allowed at all.
    assert.equal(c.restrictedTo.quote, parts.join(' '), c.id + ' display quote is not its parts');
  }
});

test('every extra hurdle carries a human label and a verbatim quote', { skip: !fs.existsSync(CAPTURE) }, () => {
  const cap = fs.readFileSync(CAPTURE, 'utf8');
  let seen = 0;
  for (const c of usyd.courses) {
    for (const h of c.extraHurdles ?? []) {
      seen++;
      assert.ok(h.label, c.id + ' hurdle ' + h.type + ' has no label');
      // A raw enum on the page is a defect: `situational_judgement` reached a printed card.
      assert.ok(!/_/.test(h.label), c.id + ' hurdle label is an enum: ' + h.label);
      assert.ok(h.quote && isLiteralSubstring(cap, h.quote), c.id + ' hurdle quote not in capture');
      assert.ok(h.source, c.id + ' hurdle has no source');
    }
  }
  assert.ok(seen > 0, 'no hurdles found to check');
});

test('the parser recovers the restriction from the special-entry cell', () => {
  const cap = 'noise (1) (1) Admission to this course is only open to Aboriginal and\n(Extended)   Torres Strait Islander students\nmore';
  const special = 'Admission to this course is only open to Aboriginal and Torres Strait Islander students; (b) a structured interview';
  const r = restrictionFrom(special, cap, 'http://x');
  assert.ok(r, 'restriction not detected');
  assert.equal(r.who, 'Aboriginal and Torres Strait Islander students');
  assert.equal(r.quote, r.quoteParts.join(' '));
});

test('the parser stores no restriction it cannot quote', () => {
  const special = 'Admission to this course is only open to Aboriginal and Torres Strait Islander students';
  assert.equal(restrictionFrom(special, 'a capture that says nothing of the kind', 'http://x'), null);
});

test('the engine carries the restriction through to the result', () => {
  const profile = { mathsPathway: 'advanced_ext1_ext2', english: ['English Advanced'], sciences: ['Physics', 'Chemistry'], bands: {} };
  for (const c of restricted) {
    const r = readiness(profile, c, { gates: {}, bridging: null });
    assert.ok(r.restrictedTo, c.id + ': restriction lost in the engine');
    assert.equal(r.restrictedTo.who, 'Aboriginal and Torres Strait Islander students');
  }
});

test('a restricted course never reads as an unqualified pass', () => {
  // The band may well be PREPARED — these courses state no assumed knowledge, and for the
  // students they are for that is the true answer. What must never happen is the band
  // arriving without the restriction beside it.
  const profile = { mathsPathway: 'advanced_ext1_ext2', english: ['English Advanced'], sciences: ['Physics', 'Chemistry'], bands: {} };
  for (const c of restricted) {
    const r = readiness(profile, c, { gates: {}, bridging: null });
    if (r.bandName === 'PREPARED') assert.ok(r.restrictedTo, c.id + ': PREPARED with no restriction attached');
  }
});

test('the site build does not drop the restriction on its way to the page', () => {
  // ui/build.js copies courses field by field. A field the engine reads but the build
  // forgets disappears without any error, and the page shows the reassuring version.
  // That is exactly what happened here, so the whitelist is checked rather than trusted.
  const dist = 'dist/app.js';
  if (!fs.existsSync(dist)) return;
  const js = fs.readFileSync(dist, 'utf8');
  for (const c of restricted) {
    const i = js.indexOf('"' + c.id + '"');
    assert.ok(i > -1, c.id + ' missing from the built catalogue');
    const window = js.slice(i, i + 2000);
    assert.ok(/"restrictedTo"\s*:/.test(window), c.id + ': restrictedTo dropped by the build');
  }
});

test('the pre-rendered course page states the restriction before anything about subjects', () => {
  // These pages are the site's indexed surface. Before this, the page for a course open
  // only to Aboriginal and Torres Strait Islander students said "No assumed knowledge
  // listed on the captured page" and stopped — true, and the most misleading arrangement
  // of the facts available.
  for (const c of restricted) {
    const f = path.join('dist', 'course', c.id, 'index.html');
    if (!fs.existsSync(f)) return;
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(/Only open to Aboriginal and Torres Strait Islander students/.test(html),
      c.id + ': course page does not state who can apply');
    // and it must come before the assumed-knowledge section, not after it
    assert.ok(html.indexOf('Who can apply') < html.indexOf('Assumed knowledge</h3>'),
      c.id + ': restriction appears below the subject sections');
    // the search-result snippet carries it too
    const m = /<meta name="description" content="([^"]*)"/.exec(html);
    assert.ok(m && /open only to/.test(m[1]), c.id + ': meta description omits the restriction');
  }
});

test('no course page prints a raw enum', () => {
  const dir = path.join('dist', 'course');
  if (!fs.existsSync(dir)) return;
  for (const id of fs.readdirSync(dir)) {
    const f = path.join(dir, id, 'index.html');
    if (!fs.existsSync(f)) continue;
    const html = fs.readFileSync(f, 'utf8');
    for (const enumish of ['situational_judgement', 'personal_statement', 'nameRecognition']) {
      assert.ok(!html.includes(enumish), id + ': raw value "' + enumish + '" on the page');
    }
  }
});
