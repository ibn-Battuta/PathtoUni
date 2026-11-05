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
import { validateIndustries, evidenceByEconomy, termMatches, economyList } from '../pipeline/industries.js';
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

test('error 20: every topic is offered at least twice, so any topic can come out on top', () => {
  const count = {};
  QUIZ.flat().forEach(o => o.topics.forEach(t => { count[t] = (count[t] || 0) + 1; }));
  for (const t of TOPIC_IDS) assert.ok(count[t] >= 2, `${t} offered ${count[t] || 0} time(s)`);
  // And it actually can: for each topic, picking it whenever offered puts it first.
  for (const t of TOPIC_IDS) {
    const answers = QUIZ.map(pair => pair.findIndex(o => o.topics.includes(t))).map(i => i < 0 ? null : i);
    assert.equal(scoreQuiz(answers)[0], t, t + ' cannot come out on top');
  }
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
  assert.deepEqual(industries.economies.map(e => e.id), ['au', 'us', 'eu', 'uk', 'cn', 'in', 'jp', 'kr']);
  // Every economy in the list is actually cited somewhere, or the page names a country
  // it has no quote for.
  for (const e of industries.economies) {
    assert.ok(industries.industries.some(ind => evidenceByEconomy(industries, ind).some(b => b.economy.id === e.id)), e.id + ' is listed but cited nowhere');
  }
});

test('the page text is built from the economies list, not typed by hand', () => {
  assert.equal(economyList(industries), 'Australia, the US, the EU, the UK, China, India, Japan and South Korea');
  assert.equal(economyList(industries, 'long'), 'Australia, the United States, the European Union, the United Kingdom, China, India, Japan and South Korea');
  const noShort = structuredClone(industries);
  delete noShort.economies[6].short;
  assert.ok(validateIndustries(noShort, TOPIC_IDS).some(e => /jp: short and long names/.test(e)));
  const orphan = structuredClone(industries);
  orphan.economies = orphan.economies.filter(e => e.id !== 'kr');
  assert.ok(validateIndustries(orphan, TOPIC_IDS).some(e => /kr-msit-2027: economy kr is not in the economies list/.test(e)));
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
  for (const e of industries.economies) assert.ok(ind.includes(e.long), e.long + ' missing from the industries page text');
});

test('course pages show their interest areas, from the same rules as the quiz', { skip: !fs.existsSync('dist/app.js') && 'run npm run build:site first' }, () => {
  const page = id => fs.readFileSync(path.join('dist', 'course', id, 'index.html'), 'utf8');
  const mech = page('usyd-engineering-honours-mechatronic-engineering');
  assert.match(mech, /<h3>Interest areas<\/h3>/);
  assert.match(mech, /Robots and machines/);
  assert.match(mech, /industries\/#ind-robotics/, 'a robotics degree should link to the robotics industry');
  assert.match(mech, /Our best guess from the course name/);
  assert.match(page('usyd-science'), /A broad degree: you choose a major later/);
  assert.match(page('usyd-project-management'), /doesn’t fit one of our interest areas/);
  // A course nobody can start straight from school is in no list, so it gets no tags.
  assert.doesNotMatch(page('wsu-applied-data-science'), /Interest areas/);
});
