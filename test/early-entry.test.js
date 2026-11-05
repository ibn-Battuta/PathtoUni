import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalogue, readiness } from '../engine/index.js';
import early from '../data/early-entry.json' with { type: 'json' };
import {
  displayableSchemes, usesEnglish, staleNote, isDisplayableScheme, TRUE_REWARD_CAVEAT
} from '../ui/early-entry.js';
import { YEAR11, YEAR12_EXT2, STANDARD_MATHS } from './fixtures.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { courses, gates } = loadCatalogue();

test('a scheme is displayable only with a verbatim quote (wsu-srs earned one on 24 Oct 2026)', () => {
  const srs = early.schemes.find(s => s.id === 'wsu-srs');
  assert.equal(srs.verification, 'verified');
  // UAC reworded this between 24 Oct and 5 Nov 2026 ("domestic and international" added);
  // re-verified by code in the desktop browser on 5 Nov 2026.
  assert.match(srs.quote, /Schools Recommendation Scheme allows current domestic and international Year 12 students/);
  assert.equal(isDisplayableScheme(srs), true);
  assert.equal(isDisplayableScheme({ ...srs, quote: null }), false, 'no quote, not shown');
  assert.equal(isDisplayableScheme({ ...srs, verification: 'unverified' }), false);
});

test('uses values render as written English, never as casual_work', () => {
  const labels = usesEnglish(['casual_work', 'hsc_subject_bands']);
  assert.deepEqual(labels, ['casual work', 'HSC subject band outcomes']);
  assert.equal(labels.some(l => /_/.test(l)), false);
});

test('a scheme older than stalenessDays degrades to confirm-the-current-round wording', () => {
  const s = { capturedOn: '2025-01-01', stalenessDays: 180 };
  const note = staleNote(s, early, new Date('2026-08-29T00:00:00Z'));
  assert.match(note, /as at 1 January 2025/);
  assert.match(note, /confirm the current round/);
  const fresh = staleNote({ capturedOn: '2026-08-27' }, early, new Date('2026-08-29T00:00:00Z'));
  assert.equal(fresh, null);
});

test('True Reward caveat does not claim the student qualifies', () => {
  assert.match(TRUE_REWARD_CAVEAT, /we have not captured that table/);
  assert.doesNotMatch(TRUE_REWARD_CAVEAT, /you qualify|you are eligible|your bands qualify/i);
});

test('adding early entry changes no course band for five profiles', () => {
  const profiles = [
    YEAR11,
    YEAR12_EXT2,
    STANDARD_MATHS,
    { ...YEAR11, sciences: ['biology'] },
    { ...YEAR12_EXT2, technology: [], sciences: [] }
  ];
  const sample = courses.slice(0, 40);
  for (const p of profiles) {
    for (const c of sample) {
      const without = readiness(p, c, { gates });
      const withEe = readiness(p, c, { gates, earlyEntry: early });
      assert.equal(withEe.band, without.band, c.id);
      assert.equal(withEe.bandName, without.bandName, c.id);
    }
  }
});

test('displayable schemes never include a score, likelihood, or band colour field', () => {
  for (const s of displayableSchemes(early)) {
    assert.equal(s.score, undefined);
    assert.equal(s.likelihood, undefined);
    assert.equal(s.band, undefined);
    assert.ok(s.quote);
    assert.ok(s.capturedOn);
    assert.ok(s.source);
    assert.ok(s.kind === 'holistic' || s.kind === 'subject_bands');
  }
});

test('the built page bundle carries the early-entry schemes', () => {
  const dist = path.join(ROOT, 'dist/app.js');
  if (!fs.existsSync(dist)) return;
  const js = fs.readFileSync(dist, 'utf8');
  assert.match(js, /EARLY_ENTRY/);
  assert.match(js, /wsu-hsc-true-reward/);
  assert.match(js, /wsu-srs/);
});
