// "Try it before you choose". An entry ships only with the provider's own words, from one
// of its own sources; topics are the quiz's topics; out-of-date entries say so. Each guard
// here was checked by breaking the thing it guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TOPIC_IDS } from '../ui/topics.js';
import { validateOpportunities, opportunitiesForTopics, isStale } from '../pipeline/opportunities.js';

const data = JSON.parse(fs.readFileSync('data/opportunities.json', 'utf8'));

test('the opportunities file validates', () => {
  assert.deepEqual(validateOpportunities(data, TOPIC_IDS), []);
  assert.ok(data.opportunities.length >= 10);
});

test('an entry without the provider\'s own words, or quoting a page it does not cite, is refused', () => {
  const noQuote = structuredClone(data);
  noQuote.opportunities[0].quotes = [];
  assert.ok(validateOpportunities(noQuote, TOPIC_IDS).some(e => /no quotes/.test(e)));
  const wrongUrl = structuredClone(data);
  wrongUrl.opportunities[1].quotes[0].url = 'https://example.com/elsewhere';
  assert.ok(validateOpportunities(wrongUrl, TOPIC_IDS).some(e => /not one of its sources/.test(e)));
  const unv = structuredClone(data);
  unv.opportunities[2].verification = 'unverified';
  assert.ok(validateOpportunities(unv, TOPIC_IDS).some(e => /not verified/.test(e)));
  const badTopic = structuredClone(data);
  badTopic.opportunities.find(o => !o.anyTopic).topics.push('astrology');
  assert.ok(validateOpportunities(badTopic, TOPIC_IDS).some(e => /unknown topic astrology/.test(e)));
  const uni = structuredClone(data);
  uni.opportunities[0].years = [13];
  assert.ok(validateOpportunities(uni, TOPIC_IDS).some(e => /school years 7–12/.test(e)), 'a uni-only entry must not pass as a school one');
});

test('topic matching leaves out the fits-everyone entries, and every topic group has something or nothing honestly', () => {
  const robots = opportunitiesForTopics(data, ['robotics']).map(o => o.id);
  assert.ok(robots.includes('bae-whats-my-discipline'));
  assert.ok(!robots.includes('nsw-school-work-experience'), 'anyTopic entries say nothing about a course');
  assert.deepEqual(opportunitiesForTopics(data, []), []);
});

test('an entry checked more than a year ago reads as out of date', () => {
  const o = { checkedOn: '2026-10-23' };
  assert.equal(isStale(o, '2027-10-22', 365), false);
  assert.equal(isStale(o, '2027-10-25', 365), true);
});

test('the build writes the page, cites every source, and links it from course and industry pages', { skip: !fs.existsSync('dist/try-it/index.html') && 'run npm run build:site first' }, () => {
  const page = fs.readFileSync(path.join('dist', 'try-it', 'index.html'), 'utf8');
  for (const o of data.opportunities) {
    assert.ok(page.includes(`id="opp-${o.id}"`), o.id + ' missing from the page');
    for (const u of o.sources) assert.ok(page.includes(u.replace(/&/g, '&amp;')), o.id + ' source missing: ' + u);
  }
  assert.match(page, /These aren’t internships\./);
  assert.ok(!/googleapis|gstatic|cdn\./.test(page), 'no third-party asset');
  const home = fs.readFileSync(path.join('dist', 'index.html'), 'utf8');
  assert.match(home, /href="try-it\/">Try it out</);
  const mech = fs.readFileSync(path.join('dist', 'course', 'usyd-engineering-honours-mechatronic-engineering', 'index.html'), 'utf8');
  assert.match(mech, /try-it\/#opp-bae-whats-my-discipline/);
  const sci = fs.readFileSync(path.join('dist', 'course', 'usyd-science', 'index.html'), 'utf8');
  assert.match(sci, /work experience and other ways in/, 'a broad degree still points somewhere useful');
  const ind = fs.readFileSync(path.join('dist', 'industries', 'index.html'), 'utf8');
  assert.match(ind, /Try it at school:/);
  assert.match(fs.readFileSync(path.join('dist', 'sitemap.xml'), 'utf8'), /\/PathtoUni\/try-it\/</);
});

test('added 5 Nov 2026: PECAN+ (Years 10-12, free) and the GitHub Student Developer Pack (13+, high school allowed)', () => {
  const p = data.opportunities.find(o => o.id === 'pecan-ctf');
  assert.deepEqual(p.years, [10, 11, 12]);
  assert.ok(p.topics.includes('cyber'));
  assert.ok(p.quotes.some(q => q.text === 'Cost: FREE!'));
  const g = data.opportunities.find(o => o.id === 'github-student-pack');
  assert.ok(g.quotes.some(q => /such as a high school/.test(q.text)));
  assert.ok(g.quotes.some(q => /at least 13 years old/.test(q.text)));
});
