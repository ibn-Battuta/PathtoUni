// Phase 25: three doors in — subjects, an interest quiz, and future industries.
// Interest and industry SORT; they never hide a course and never touch a band. The
// industries file may only say what its quotes say. Each guard here was checked by
// breaking the thing it guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalogue } from '../engine/index.js';
import { readiness } from '../engine/readiness.js';
import { encodeState, decodeState, emptyState } from '../ui/hash.js';
import {
  TOPICS, TOPIC_IDS, QUIZ, courseTopics, isBroad, scoreQuiz, sortByInterest,
  interestScore, coursesForIndustry, coursesForTopics, matchedTopics
} from '../ui/topics.js';
import { validateIndustries, evidenceByEconomy, termMatches } from '../pipeline/industries.js';
import { YEAR12_EXT2 } from './fixtures.js';

const { courses, gates } = loadCatalogue();
const industries = JSON.parse(fs.readFileSync('data/industries.json', 'utf8'));
const results = courses.map(c => ({ ...readiness(YEAR12_EXT2, c, { gates }), course: c, university: c.university }));
const byName = n => courses.find(c => c.name === n);

test('interests and industry survive the hash round trip; unknown ids are dropped', () => {
  const s = { ...emptyState(), year: 12, mathsPathway: 'advanced', english: ['english_advanced'], interests: ['space', 'data'], industry: 'quantum' };
  const back = decodeState('#' + encodeState(s));
  assert.deepEqual(back.interests, ['space', 'data']);
  assert.equal(back.industry, 'quantum');
  const bad = decodeState('#i=space,<script>,nope,space&x=crypto');
  assert.deepEqual(bad.interests, ['space']);
  assert.equal(bad.industry, null);
  assert.equal(decodeState('#i=ai,data,space,bio').interests.length, 3, 'capped at three');
});

test('the id lists in hash.js agree with topics.js and data/industries.json', () => {
  const src = fs.readFileSync('ui/hash.js', 'utf8');
  const list = name => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
  assert.deepEqual(list('INTEREST_IDS'), TOPIC_IDS);
  assert.deepEqual(list('INDUSTRY_IDS'), industries.industries.map(i => i.id));
});

test('sorting by interest keeps every course and changes no band', () => {
  const sorted = sortByInterest(results, ['space', 'robotics'], ['energy']);
  assert.equal(sorted.length, results.length);
  assert.deepEqual(new Set(sorted.map(r => r.courseId)), new Set(results.map(r => r.courseId)));
  for (const r of sorted) assert.equal(r.band, results.find(x => x.courseId === r.courseId).band);
  assert.ok(courseTopics(sorted[0].course).some(t => ['space', 'robotics', 'energy'].includes(t)), 'a match sorts first');
  assert.deepEqual(sortByInterest(results, [], []).map(r => r.courseId), results.map(r => r.courseId), 'no interests, no reorder');
});

test('topics come from the degree name, and broad degrees are told apart', () => {
  assert.deepEqual(courseTopics(byName('Bachelor of Engineering Honours (Aeronautical Engineering)')), ['space']);
  assert.ok(courseTopics(byName('Bachelor of Engineering (Honours) (Robotics and Mechatronics)')).includes('robotics'));
  assert.ok(courseTopics(courses.find(c => c.id === 'wsu-nursing')).includes('health'));
  assert.ok(isBroad(courses.find(c => c.id === 'usyd-science')));
  assert.equal(isBroad(byName('Bachelor of Project Management')), false, 'no topic and not science or engineering: not broad');
  assert.equal(interestScore(courses.find(c => c.id === 'usyd-science'), ['space']), 0, 'broad is never scored');
  for (const t of TOPICS) assert.ok(courses.some(c => courseTopics(c).includes(t.id)), t.id + ' matches no course in the catalogue');
});

test('the quiz is deterministic, needs answers, and every topic can be reached', () => {
  assert.deepEqual(scoreQuiz(Array(QUIZ.length).fill(null)), []);
  const a = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1];
  assert.deepEqual(scoreQuiz(a), scoreQuiz(a.slice()));
  assert.ok(scoreQuiz(a).length <= 3);
  const offered = new Set(QUIZ.flat().flatMap(o => o.topics));
  for (const t of TOPIC_IDS) assert.ok(offered.has(t), t + ' cannot be reached from the quiz');
});

test('error 18 courses are never offered by the interest or industry lists', () => {
  for (const ind of industries.industries) {
    const { specific, broad } = coursesForIndustry(ind, courses);
    for (const c of [...specific, ...broad]) assert.ok(!c.notEntryPoint, ind.id + ' lists ' + c.id);
  }
  const { specific } = coursesForTopics(['ai', 'data'], courses);
  assert.ok(!specific.some(c => c.notEntryPoint));
});

test('the industries file validates, and each industry names at least two economies', () => {
  assert.deepEqual(validateIndustries(industries, TOPIC_IDS), []);
  for (const ind of industries.industries) assert.ok(evidenceByEconomy(industries, ind).length >= 2, ind.id);
  // The page text names these six by hand; if the list changes, the text must too.
  assert.deepEqual(industries.economies.map(e => e.id), ['au', 'us', 'eu', 'uk', 'cn', 'in']);
});

test('an industry citing a quote that does not name it is refused', () => {
  const bad = structuredClone(industries);
  bad.industries.find(i => i.id === 'space').evidence.push(['in-ai', 'ai']);
  assert.ok(validateIndustries(bad, TOPIC_IDS).some(e => /space: quote in-ai\/ai does not name/.test(e)));
  const unv = structuredClone(industries);
  unv.sources[0].verification = 'unverified';
  assert.ok(validateIndustries(unv, TOPIC_IDS).some(e => /not verified/.test(e)));
  assert.equal(termMatches('the AI mission', '\\bAI\\b'), true);
  assert.equal(termMatches('said the chair', '\\bAI\\b'), false, '"AI" must not match inside a word');
});

test('the build carries industries and topics into the page, and writes both new pages', { skip: !fs.existsSync('dist/app.js') && 'run npm run build:site first' }, () => {
  const js = fs.readFileSync('dist/app.js', 'utf8');
  assert.match(js, /const INDUSTRIES = \{"economies"/);
  assert.match(js, /"topics":\["space"\]/, 'industry topics dropped by the build');
  assert.match(js, /function sortByInterest\(/);
  const ind = fs.readFileSync(path.join('dist', 'industries', 'index.html'), 'utf8');
  for (const s of industries.sources) {
    const cited = industries.industries.some(i => i.evidence.some(([sid]) => sid === s.id));
    if (cited) assert.ok(ind.includes(s.url.replace(/&/g, '&amp;')), s.id + ' source missing from the page');
  }
  assert.ok(!/third-party|googleapis|cdn\./.test(ind.replace(/https:\/\/[^"]+gov[^"]*|https:\/\/[^"]+europa\.eu[^"]*|https:\/\/[^"]+\.in\/[^"]*/g, '')), 'no third-party asset on the page');
  assert.ok(fs.existsSync(path.join('dist', 'quiz', 'index.html')));
});
