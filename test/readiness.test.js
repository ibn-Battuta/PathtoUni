import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogue, contextFor, readiness, subjectChangeImpact, crossUniversityContrasts, BAND } from '../engine/index.js';
import { YEAR11, YEAR12_EXT2, STANDARD_MATHS } from './fixtures.js';

const { courses, gates } = loadCatalogue();
const find = id => courses.find(c => c.id === id);
const run = (p, id, extra = {}) => {
  const c = find(id);
  return readiness(p, c, { ...contextFor(c, gates), ...extra });
};

test('UNSW Engineering is PREPARED - assumed knowledge is Extension 1 and Physics, both held', () => {
  const r = run(YEAR11, 'unsw-engineering-honours');
  assert.equal(r.bandName, 'PREPARED');
  assert.equal(r.gateStatus, 'none');
});

test('UNSW Medical Science is PREPARED - Biology is not assumed there', () => {
  assert.equal(run(YEAR11, 'unsw-medical-science').bandName, 'PREPARED');
});

test('USYD Medical Science is NOT prepared - Biology is assumed there. Same degree name, different answer.', () => {
  const r = run(YEAR11, 'usyd-medical-science');
  assert.notEqual(r.bandName, 'PREPARED');
  assert.ok(r.findings.some(f => f.subject === 'Biology'));
});

test('the cross-university contrast is detected automatically', () => {
  const c = crossUniversityContrasts(courses);
  assert.ok(c.some(g => g.degree.includes('medical science')));
});

test('a USYD gate with no band recorded is UNCONFIRMED, never silently passed', () => {
  const r = run(YEAR11, 'usyd-engineering-honours');
  assert.equal(r.gateStatus, 'unconfirmed');
  assert.ok(r.needsInput.includes('Expected mathematics band'));
});

test('recording a passing Extension 1 band satisfies the USYD gate', () => {
  const p = { ...YEAR11, bands: { 'Mathematics Extension 1': { band: 3, scale: 'extension' } } };
  assert.equal(run(p, 'usyd-engineering-honours').gateStatus, 'pass');
});

test('a weak Extension 1 result alone does NOT gate - Mathematics Advanced is still a live route', () => {
  // An advanced_ext1 student sits BOTH. A poor Ext 1 band can still be rescued by Band 4 in Advanced.
  const p = { ...YEAR11, bands: { 'Mathematics Extension 1': { band: 2, scale: 'extension' } } };
  assert.equal(run(p, 'usyd-engineering-honours').gateStatus, 'unconfirmed');
});

test('only when EVERY route fails is the course GATED - the sole block available to this profile', () => {
  const p = { ...YEAR11, bands: {
    'Mathematics Extension 1': { band: 2, scale: 'extension' },
    'Mathematics Advanced': { band: 3, scale: 'hsc' }
  } };
  const r = run(p, 'usyd-engineering-honours');
  assert.equal(r.gateStatus, 'fail');
  assert.equal(r.bandName, 'GATED');
});

test('Extension 2 makes a weak extension band fatal, because the Advanced safety net is gone', () => {
  const withAdvanced = { ...YEAR11, bands: {
    'Mathematics Extension 1': { band: 2, scale: 'extension' } } };
  const withExt2 = { ...YEAR12_EXT2, bands: {
    'Mathematics Extension 1': { band: 2, scale: 'extension' },
    'Mathematics Extension 2': { band: 2, scale: 'extension' } } };
  assert.equal(run(withAdvanced, 'usyd-engineering-honours').gateStatus, 'unconfirmed'); // rescuable
  assert.equal(run(withExt2, 'usyd-engineering-honours').gateStatus, 'fail');            // not rescuable
});

test('Extension 2 REMOVES the Mathematics Advanced route through the USYD gate', () => {
  const p = { ...YEAR12_EXT2, bands: { 'Mathematics Advanced': { band: 6, scale: 'hsc' } } };
  const r = run(p, 'usyd-engineering-honours');
  const advRoute = r.gate.routes.find(x => x.subject === 'Mathematics Advanced');
  assert.equal(advRoute.status, 'unavailable');   // he does not sit it
  assert.equal(r.gateStatus, 'unconfirmed');      // a band 6 in a subject he does not sit cannot save him
});

test('Tier C judgement can never produce HARD_GAP on its own', () => {
  const noPhysics = { ...YEAR11, sciences: ['chemistry'] };
  const r = run(noPhysics, 'unsw-engineering-honours');
  assert.equal(r.bandName, 'BRIDGE_IT');          // capped, not HARD_GAP
  assert.ok(r.findings.every(f => f.tier !== 'C' || f.band <= BAND.BRIDGE_IT));
});

test('Tier B maths evidence CAN produce HARD_GAP', () => {
  const r = run(STANDARD_MATHS, 'unsw-engineering-honours');
  assert.equal(r.bandName, 'HARD_GAP');
});

test('dropping Physics changes engineering but History was never load-bearing', () => {
  const noPhysics = { ...YEAR11, sciences: ['chemistry'] };
  const noHistory = { ...YEAR11, other: [] };
  assert.ok(subjectChangeImpact(YEAR11, noPhysics, courses, { gates }).length > 0);
  assert.equal(subjectChangeImpact(YEAR11, noHistory, courses, { gates }).length, 0);
});

test('hurdles are never folded into the band', () => {
  const r = run(YEAR11, 'unsw-engineering-honours');
  assert.ok(Array.isArray(r.hurdles));
});

test('UNSW renewable energy is page-verified, not inherited from the faculty statement', () => {
  const r = run(YEAR11, 'unsw-renewable-energy-engineering');
  assert.equal(r.verification, 'verified');
  assert.equal(r.bandName, 'PREPARED');
  assert.ok(r.sources.some(s => /renewable-energy/.test(s)));
});

test('a HIGHER course in the same subject is never a gap - English Advanced satisfies assumed English Standard', () => {
  // USYD Agricultural Science assumes "Mathematics Standard and English Standard".
  // A student doing English Advanced and Extension 2 maths is above both, not below.
  const ag = courses.find(c => c.name === 'Bachelor of Agricultural Science');
  if (!ag) return; // catalogue not yet populated
  const r = readiness(YEAR12_EXT2, ag, { gates });
  assert.equal(r.bandName, 'PREPARED');
  assert.equal(r.findings.length, 0);
});

test('an incomplete record never reads as a clean PREPARED', () => {
  // "we found no requirements" and "there are no requirements" are different claims.
  // Omission fails toward reassurance, so it must be surfaced, not swallowed.
  const partial = { id: 'x', name: 'Partial', hardRules: [], assumedKnowledge: [],
                    verification: 'incomplete', _completeness: ['source states "english"; not parsed'] };
  const r = readiness(YEAR11, partial, { gates });
  assert.equal(r.complete, false);
  assert.ok(r.needsInput.some(n => /not fully captured/.test(n)));
});

test('an assumed minBand with no recorded result is needsInput, not a silent pass', () => {
  const course = {
    id: 'wsu-engineering-honours', name: 'Bachelor of Engineering (Honours)',
    hardRules: [], verification: 'verified',
    assumedKnowledge: [
      { subject: 'Mathematics Advanced', minBand: 5, quote: 'Band 5', tier: 'A' },
      { subject: 'English Standard', quote: 'two subjects of English', tier: 'A' },
      { subject: 'any two units of Science', quote: 'Two subjects of Science', tier: 'A' }
    ]
  };
  const r = readiness(YEAR11, course, { gates });
  assert.ok(r.needsInput.some(n => /minimum 5/.test(n)));
  assert.equal(r.findings.some(f => f.subject === 'any two units of Science'), false);
});

test('a recorded Advanced band below the assumed minimum is a gap', () => {
  const course = {
    id: 'x', name: 'X', hardRules: [], verification: 'verified',
    assumedKnowledge: [{ subject: 'Mathematics Advanced', minBand: 5, quote: 'Band 5', tier: 'A' }]
  };
  const p = { ...YEAR11, bands: { 'Mathematics Advanced': { band: 4, scale: 'hsc' } } };
  const r = readiness(p, course, { gates });
  assert.ok(r.findings.some(f => f.subject === 'Mathematics Advanced' && /below the assumed minimum/.test(f.why)));
});

test('a fully verified record with no gaps is clean', () => {
  const r = run(YEAR11, 'unsw-engineering-honours');
  assert.equal(r.complete, true);
  assert.equal(r.needsInput.length, 0);
});

test('the tier cap applies to a band shortfall too - Tier C never alarms alone', () => {
  const course = { id: 't', name: 'Test', hardRules: [], verification: 'verified',
    assumedKnowledge: [{ subject: 'Chemistry', minBand: 5, quote: 'Chemistry at Band 5', tier: 'A' }] };
  const p = { ...YEAR11, bands: { Chemistry: { band: 3, scale: 'hsc' } } };
  const r = readiness(p, course, {});
  assert.equal(r.bandName, 'BRIDGE_IT');          // capped, not HARD_GAP
  assert.ok(r.findings.every(f => f.tier !== 'C' || f.band <= BAND.BRIDGE_IT));
});

test('a maths band shortfall CAN reach HARD_GAP - that claim is research-backed', () => {
  const course = { id: 't2', name: 'Test2', hardRules: [], verification: 'verified',
    assumedKnowledge: [{ subject: 'Mathematics Advanced', minBand: 5, quote: 'q', tier: 'A' }] };
  const p = { ...YEAR11, bands: { 'Mathematics Advanced': { band: 3, scale: 'hsc' } } };
  assert.equal(readiness(p, course, {}).bandName, 'HARD_GAP');
});

test('an Extension 2 student passes a Band 5 Advanced assumption by reasoning, not by silence', () => {
  const wsu = courses.find(c => c.id === 'wsu-engineering-honours');
  if (!wsu) return;
  const r = readiness(YEAR12_EXT2, wsu, { gates });
  assert.equal(r.bandName, 'PREPARED');
  const note = r.satisfiedBy.find(s => s.subject === 'Mathematics Advanced');
  assert.ok(note, 'the pass must be recorded, not inferred from an empty findings list');
  assert.match(note.why, /higher maths course/);
});

test('"Assumed knowledge: None." means none - recommended studies are not assumed', () => {
  // Macquarie states None and then lists Recommended studies. Reading past the "None."
  // invents a requirement, which for this product is the worst-shaped error there is.
  for (const id of ['mq-cyber-security', 'mq-information-technology', 'mq-medical-sciences']) {
    const c = courses.find(x => x.id === id);
    if (!c) continue;
    assert.deepEqual(c.assumedKnowledge, [], `${id} must assume nothing`);
    assert.ok((c.recommendedStudies ?? []).length > 0, `${id} keeps its recommended studies`);
    assert.equal(readiness(YEAR12_EXT2, c, { gates }).bandName, 'PREPARED');
  }
});
