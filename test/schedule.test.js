// Key dates (/dates/). Every date is quoted; a written date must agree with its ISO date,
// weekday included; a later year never gets a date nobody has published. Each guard here
// was checked by breaking the thing it guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateSchedule, writtenDateErrors, truncatedPrice } from '../pipeline/schedule.js';
import { validateOpportunities } from '../pipeline/opportunities.js';
import { cohortView, byMonth, upcoming, shiftYear } from '../ui/schedule.js';
import { TOPIC_IDS } from '../ui/topics.js';

const data = JSON.parse(fs.readFileSync('data/schedule.json', 'utf8'));
const opps = JSON.parse(fs.readFileSync('data/opportunities.json', 'utf8'));
const ev = id => data.events.find(e => e.id === id);

test('the schedule file validates against itself and the Try it file', () => {
  assert.deepEqual(validateSchedule(data, opps), []);
  assert.ok(data.events.length >= 30);
});

test('a written date that disagrees with its ISO date, or names the wrong weekday, is refused', () => {
  assert.deepEqual(writtenDateErrors('Thu 23 Jul 2026, 11.59pm', '2026-07-23'), []);
  assert.match(writtenDateErrors('Wed 23 Jul 2026', '2026-07-23')[0], /is a Thu/);
  assert.match(writtenDateErrors('Thu 24 Jul 2026', '2026-07-23')[0], /is not 2026-07-23/);
  assert.deepEqual(writtenDateErrors('27 or 28 Apr 2026 (two UNSW pages differ)', '2026-04-27'), [], 'not a weekday form: not checked');
  const broken = structuredClone(data);
  broken.events.find(e => e.id === 'unsw-gateway-r2').dateText = 'Tue 9 Nov 2026';
  assert.ok(validateSchedule(broken, opps).some(e => /unsw-gateway-r2.*is a Mon/.test(e)));
  const broken2 = structuredClone(data);
  broken2.events.find(e => e.id === 'wsu-tr-r2').resultText = 'Fri 21 Nov 2026';
  assert.ok(validateSchedule(broken2, opps).some(e => /wsu-tr-r2 resultText/.test(e)));
});

test('error 25: a quote that stops in the middle of a price is refused, in both files', () => {
  assert.equal(truncatedPrice('COST AUD $25.'), true);
  assert.equal(truncatedPrice('COST AUD $25.90 per student'), false);
  assert.equal(truncatedPrice('SRS offers will be made on 12 November 2026.'), false, 'a date at a sentence end is fine');
  const s = structuredClone(data);
  s.events.find(e => e.id === 'aio-2027').quotes.push({ text: 'COST AUD $25.', url: 'https://amt.edu.au/aio' });
  assert.ok(validateSchedule(s, opps).some(e => /middle of a price/.test(e)));
  const o = structuredClone(opps);
  o.opportunities.find(x => x.id === 'aio').quotes.push({ text: 'COST AUD $25.', url: 'https://amt.edu.au/aio' });
  assert.ok(validateOpportunities(o, TOPIC_IDS).some(e => /middle of a price/.test(e)));
  assert.deepEqual(validateOpportunities(opps, TOPIC_IDS), []);
  assert.equal(opps.opportunities.find(x => x.id === 'aio').cost, '$25.90.');
});

test('a date without the page\'s own words, or from a non-https page, is refused', () => {
  const s = structuredClone(data);
  s.events[0].quotes = [];
  assert.ok(validateSchedule(s, opps).some(e => /no quotes/.test(e)));
  const s2 = structuredClone(data);
  s2.events[1].quotes[0].url = 'http://example.com';
  assert.ok(validateSchedule(s2, opps).some(e => /https/.test(e)));
  const s3 = structuredClone(data);
  delete s3.notes.find(n => n.id === 'usyd-none').basis;
  assert.ok(validateSchedule(s3, opps).some(e => /usyd-none/.test(e)));
});

test('only an earlier-year date can stand in as last year\'s date', () => {
  const s = structuredClone(data);
  s.events.find(e => e.id === 'scix-summer-school').repeats = true;
  assert.ok(validateSchedule(s, opps).some(e => /scix-summer-school: only a 2027 date/.test(e)));
});

test('the 2027 view is only published dates; the 2028 view never turns last year into a day', () => {
  const v27 = cohortView(data, '2027');
  assert.ok(v27.every(it => it.kind === 'confirmed'));
  const v28 = cohortView(data, '2028');
  const last = v28.filter(it => it.kind === 'last-year');
  assert.ok(last.length >= 20);
  for (const it of last) {
    assert.equal(it.sortDate, shiftYear(it.event.date, 1));
    assert.match(it.around.short, /^Around [A-Z][a-z]{2}$/);
    assert.ok(!it.event.cohorts.includes('2028'));
  }
  // Confirmed 2028 items are only those published for 2028 (or open to both years).
  for (const it of v28.filter(x => x.kind === 'confirmed')) assert.ok(it.event.cohorts.includes('2028'));
  // In order.
  const keys = v28.map(it => it.sortDate);
  assert.deepEqual(keys, [...keys].sort());
  assert.ok(byMonth(v28).every(g => g.items.every(it => it.sortDate.startsWith(g.key))));
});

test('on 5 Nov 2026 the next three dates for a Year 12 student are the right ones', () => {
  const next = upcoming(cohortView(data, '2027'), '2026-11-05', 3).map(it => it.event.id);
  assert.deepEqual(next, ['srs-preferences', 'unsw-gateway-r2', 'wsu-tr-r2']);
  const next28 = upcoming(cohortView(data, '2028'), '2026-11-05', 2).map(it => it.event.id);
  assert.deepEqual(next28, ['scix-fee-waiver', 'fda-jan-a'], 'closed programs are not "coming up"');
});

test('facts found on 5 Nov 2026 are held: UOW moved its offers, UNSW pages disagree, UTS retired early entry', () => {
  assert.equal(ev('uow-early-admission').result, '2026-09-17');
  assert.ok(ev('uow-early-admission').quotes.some(q => /moved from 1 September to 17 September/.test(q.text)));
  assert.match(ev('unsw-gateway-r1').opensText, /27 or 28 Apr/);
  assert.ok(ev('unsw-gateway-r1').quotes.some(q => /Monday, 27 April/.test(q.text)));
  assert.ok(ev('unsw-gateway-r1').quotes.some(q => /Tuesday, 28 April/.test(q.text)));
  assert.equal(ev('unsw-gateway-r2').date, '2026-11-09', 'UNSW’s own page, not UAC’s 10 Nov');
  assert.ok(data.notes.find(n => n.id === 'uts-retired').quotes[0].text.includes('retiring the Early Entry Program'));
  for (const id of ['unsw-gateway-r1', 'unsw-gateway-r2', 'unsw-gateway-firm', 'usyd-gadigal'])
    assert.ok((ev(id).flags ?? []).includes('equity'), `${id} is for some students only`);
  for (const id of ['fda-jan-a', 'fda-jan-b', 'fda-apr']) assert.ok(ev(id).flags.includes('private'));
});

const built = fs.existsSync('dist/dates/index.html');
test('the built page shows every quote, labels last year’s dates, and invents no 2027 day', { skip: !built && 'run npm run build:site first' }, () => {
  const html = fs.readFileSync('dist/dates/index.html', 'utf8');
  const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const text = unesc(html);
  for (const e of data.events) for (const q of e.quotes) assert.ok(text.includes(q.text), `${e.id}: quote missing`);
  const last = cohortView(data, '2028').filter(it => it.kind === 'last-year');
  assert.equal((html.match(/<span class="tag t-warn">Last year’s date<\/span>/g) || []).length, last.length);
  // A 2026 written date moved a year on would be a guess: "Thu 23 Jul 2026" must never appear as "… 2027".
  for (const it of last) {
    const m = /^(?:Week of )?(\w{3} \d{1,2} \w{3}) 2026/.exec(it.event.dateText);
    if (m) assert.ok(!text.includes(`${m[1]} 2027`), `${it.event.id}: a 2027 day was invented`);
  }
  assert.match(html, /aria-label="When do you start uni\?"/);
  assert.match(html, /data-cohort="2027"/);
  assert.match(html, /data-cohort="2028"/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/, 'no third-party script');
  assert.doesNotMatch(html, /<link[^>]+href="https?:/, 'no third-party stylesheet');
  assert.match(html, /What to do in Year 11/);
  assert.match(html, /Any time — work experience and internships/);
});

test('every page links to the dates page, and the results page links to it from early entry', { skip: !built && 'run npm run build:site first' }, () => {
  for (const p of ['dist/index.html', 'dist/try-it/index.html', 'dist/about/index.html'])
    assert.match(fs.readFileSync(p, 'utf8'), /href="[./]*dates\/">Key dates<\/a>/, p);
  assert.match(fs.readFileSync('dist/app.js', 'utf8'), /early-dates-link/);
  assert.match(fs.readFileSync('dist/sitemap.xml', 'utf8'), /\/dates\/<\/loc>/);
});

test('after Year 12: each paid pathway says whether it fits around full-time university', () => {
  const a = data.afterSchool;
  assert.ok(a.length >= 5);
  assert.ok(a.some(x => x.fitsUni) && a.some(x => !x.fitsUni));
  const broken = structuredClone(data);
  delete broken.afterSchool[0].fitsUni;
  assert.ok(validateSchedule(broken, opps).some(e => /fitsUni/.test(e)));
  const noQuote = structuredClone(data);
  noQuote.afterSchool[1].quotes = [];
  assert.ok(validateSchedule(noQuote, opps).some(e => /no quotes/.test(e)));
  // The ASD apprenticeship is a job (3–4 days a week), not something to fit around a degree.
  assert.equal(a.find(x => x.id === 'asd-apprenticeship').fitsUni, false);
  // Azure for Students is 18+ and university only — the list Ajay was given said "start now".
  assert.match(a.find(x => x.id === 'azure-for-students').who, /not high school/);
  // An approximate date ("Early 2027") is not weekday-checked, but still needs a quote.
  assert.equal(ev('asd-2028-applications').precision, 'approx');
});

test('the after-Year-12 section is built, in two groups, in the later year only', { skip: !built && 'run npm run build:site first' }, () => {
  const html = fs.readFileSync('dist/dates/index.html', 'utf8');
  assert.match(html, /id="after-school-2028"/);
  assert.doesNotMatch(html, /id="after-school-2027"/);
  assert.match(html, /Alongside uni — part-time and paid/);
  assert.match(html, /Instead of full-time uni — a job with training/);
  for (const x of data.afterSchool) assert.match(html, new RegExp(`id="after-${x.id}"`));
});
