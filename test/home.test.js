// Home page sections added 5 Nov 2026 (after straia.io): who it is for, common questions,
// where the facts come from. Every number and name is computed from the data (decision 27).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const built = fs.existsSync('dist/index.html');
const skip = !built && 'run npm run build:site first';

test('the home page is short: hero, the ways in, dates coming up, why rely on it — no picker', { skip }, () => {
  const h = fs.readFileSync('dist/index.html', 'utf8');
  const at = id => h.indexOf(`id="${id}"`);
  assert.ok(at('hero-h') < at('doors-h') && at('doors-h') < at('soon-h') && at('soon-h') < at('trust-h'), 'in that order');
  assert.equal(at('picker'), -1, 'the picker has its own page');
  for (const id of ['who-h', 'faq-h', 'src-h']) assert.equal(at(id), -1, `${id} moved to About`);
  assert.match(h, /href="about\/">About Path to Uni, common questions/);
});

test('Check my subjects is its own page, and every page has Home in the menu and marks where you are', { skip }, () => {
  const sub = fs.readFileSync('dist/subjects/index.html', 'utf8');
  assert.match(sub, /<h1>Check my subjects<\/h1>/);
  assert.match(sub, /id="picker"/);
  assert.match(sub, /<a href="..\/subjects\/" aria-current="page">My subjects<\/a>/);
  for (const [f, rel] of [['dist/index.html', ''], ['dist/dates/index.html', '../'], ['dist/about/index.html', '../']])
    assert.ok(fs.readFileSync(f, 'utf8').includes(`<a href="${rel}"`) && /<nav class="topnav"[^]*?>Home<\/a>/.test(fs.readFileSync(f, 'utf8')), f);
  assert.match(fs.readFileSync('dist/index.html', 'utf8'), /<a href="" aria-current="page">Home<\/a>/);
  assert.match(fs.readFileSync('dist/index.html', 'utf8'), /<a class="door" href="subjects\/" data-door="subjects">/);
});

test('About carries who it is for, the common questions and the sources', { skip }, () => {
  const a = fs.readFileSync('dist/about/index.html', 'utf8');
  for (const id of ['who-h', 'faq-h', 'src-h', 'privacy', 'how']) assert.ok(a.includes(`id="${id}"`), id);
  assert.match(a, /<h3>Students<\/h3>[\s\S]*<h3>Parents<\/h3>[\s\S]*<h3>Careers advisers<\/h3>/);
  assert.match(a, /href="..\/subjects\/">Check my subjects</);
});

test('common questions are plain HTML (they open without JavaScript) and state counts from the data', { skip }, () => {
  const h = fs.readFileSync('dist/about/index.html', 'utf8');
  const faqs = h.match(/<details class="faq">/g) || [];
  assert.ok(faqs.length >= 6);
  const n = fs.readdirSync('data/courses').filter(f => f.endsWith('.json'))
    .reduce((s, f) => s + JSON.parse(fs.readFileSync(`data/courses/${f}`, 'utf8')).courses.length, 0);
  assert.match(fs.readFileSync('dist/index.html', 'utf8'), new RegExp(`${n} STEM courses`));
  assert.match(h, new RegExp(`${n} STEM courses`));
  const sch = JSON.parse(fs.readFileSync('data/schedule.json', 'utf8'));
  const atar = sch.events.find(e => e.id === 'atar-release');
  assert.ok(h.includes(atar.dateText), 'the ATAR date comes from Key dates');
  assert.match(h, /It doesn\u2019t predict ATARs or offers/);
  assert.doesNotMatch(h, /your ATAR will|chance of getting in is/i);
});

test('the sources strip names sources as text, with no logos', { skip }, () => {
  const h = fs.readFileSync('dist/about/index.html', 'utf8');
  const strip = h.slice(h.indexOf('class="src-strip"'), h.indexOf('</p>', h.indexOf('class="src-strip"')));
  for (const n of ['UAC', 'NESA']) assert.match(strip, new RegExp(`>${n}<`));
  assert.doesNotMatch(strip, /<img/);
  assert.match(h, /they don\u2019t endorse us/);
});

test('Coming up on the home page: at most three dates, in order, each linked to Key dates', { skip }, () => {
  const h = fs.readFileSync('dist/index.html', 'utf8');
  assert.match(h, /id="soon-h">[\s\S]*?<\/span> Dates coming up</);
  const items = [...h.matchAll(/<li( hidden)? data-end="(\d{4}-\d{2}-\d{2})"><a href="dates\/#ev-\d{4}-[\w-]+">/g)];
  assert.ok(items.length >= 3);
  assert.ok(items.filter(m => !m[1]).length <= 3, 'three shown before the script runs');
  const ends = items.map(m => m[2]);
  assert.deepEqual(ends, [...ends].sort(), 'soonest first');
  // The script hides anything already past on the reader's own date.
  assert.match(h, /li\.getAttribute\('data-end'\)>=t&&n<3/);
  // Equity schemes say so even in the short list.
  if (h.includes('unsw-gateway-r2')) assert.match(h, /unsw-gateway-r2">[^]*?<\/a> <span class="who-tag">[^<]*some students only<\/span>/);
});

test('plain language: option names say what they do, every card has an icon, and no icon is fetched from elsewhere', { skip }, () => {
  const h = fs.readFileSync('dist/index.html', 'utf8');
  for (const t of ['Check my subjects', 'Help me find what I enjoy', 'Explore jobs of the future']) assert.match(h, new RegExp(`class="door-t">${t}<`));
  const doors = h.match(/<a class="door"[\s\S]*?<\/a>/g) || [];
  assert.equal(doors.length, 3);
  for (const d of doors) assert.match(d, /class="ico" aria-hidden="true"><svg/);
  const about = fs.readFileSync('dist/about/index.html', 'utf8');
  assert.ok((about.match(/class="who">\s*<span class="ico"/g) || []).length === 3, 'each audience card has an icon');
  assert.doesNotMatch(h, /<img[^>]+src="https?:/);
  assert.doesNotMatch(h, /Three ways in/);
});
