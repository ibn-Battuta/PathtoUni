#!/usr/bin/env node
// Builds the prototype and the production static site.
// Inlines the REAL engine source — not a reimplementation — so the site runs
// the same code the tests exercise.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseDescription, courseTitleText, prettyDate, SITE_NAME } from './meta.js';
import { schemesForUniversity, displayableSchemes } from './early-entry.js';
import { attachOfferCount, uncommonIds } from '../pipeline/familiarity.js';
import { validateDiscovery } from '../pipeline/discovery.js';
import { validateIndustries, evidenceByEconomy, economyList, checkedRange } from '../pipeline/industries.js';
import { TOPIC_IDS, TOPICS, QUIZ, coursesForIndustry, courseTopics, isBroad, topicLabel } from './topics.js';
import { icon } from './icons.js';
import { validateOpportunities, opportunitiesForTopics, isStale } from '../pipeline/opportunities.js';
import { validateSchedule } from '../pipeline/schedule.js';
import { cohortView, byMonth, upcoming } from './schedule.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function stripModule(src) {
  return src
    .replace(/^import .*$/gm, '')
    .replace(/^export /gm, '');
}

// A short fingerprint of the files the browser keeps a copy of. It goes on the end of their
// links (site.css?v=…), so a browser holding an old copy fetches the new one instead of mixing
// new pages with an old stylesheet — which once drew the icons the size of the screen.
const ASSET_V = crypto.createHash('sha1')
  .update(['ui/site.css', 'ui/site.js', 'ui/ask.js', 'ui/hash.js', 'ui/topics.js', 'engine/readiness.js', 'engine/units.js', 'data/subjects.json']
    .map(f => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', f), 'utf8')).join('\n'))
  .digest('hex').slice(0, 8);

const subjectsJson = read('data/subjects.json');
const units = stripModule(read('engine/units.js'));
const readiness = stripModule(read('engine/readiness.js'));
const hash = stripModule(read('ui/hash.js'));
const earlyEntryHelpers = stripModule(read('ui/early-entry.js'));
const compareHelpers = stripModule(read('ui/compare.js'));
const classifyHelpers = stripModule(read('ui/classify.js'));
const topicHelpers = stripModule(read('ui/topics.js'));
const earlyEntryFile = JSON.parse(read('data/early-entry.json'));

const courses = [];
const gates = {};
const uniMeta = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data/courses')).filter(x => x.endsWith('.json'))) {
  const uni = JSON.parse(read(path.join('data/courses', f)));
  uniMeta[uni.university] = {
    capturedOn: uni.capturedOn,
    institutionRule: uni.institutionRule,
    bridging: uni.bridging
  };
  if (uni._mathsGate) gates[uni._mathsGate.id] = uni._mathsGate;
  for (const c of uni.courses ?? []) {
    courses.push({
      id: c.id,
      name: c.name,
      university: uni.university,
      field: c.field ?? 'other',
      hardRules: c.hardRules ?? [],
      assumedKnowledge: c.assumedKnowledge ?? [],
      recommendedStudies: c.recommendedStudies ?? [],
      extraHurdles: c.extraHurdles ?? [],
      // Who may apply at all. This whitelist is itself an omission risk: a field the
      // engine reads but the build forgets to copy disappears silently, and the page
      // then shows the reassuring version. `restrictedTo` was dropped exactly this way.
      ...(c.restrictedTo ? { restrictedTo: c.restrictedTo } : {}),
      // Same omission risk, same fix: error 18's flag must survive the copy.
      ...(c.notEntryPoint ? { notEntryPoint: c.notEntryPoint } : {}),
      nameRecognition: c.nameRecognition === 'low' ? null : (c.nameRecognition ?? null),
      verification: c.verification ?? 'unverified',
      capturedOn: c.capturedOn ?? uni.capturedOn,
      source: c.source ?? uni.institutionRule?.source ?? null,
      _completeness: c._completeness,
      _bridging: uni.bridging
    });
  }
}

const coursesWithOffers = attachOfferCount(courses);

function loadReviewedDiscovery() {
  const dir = path.join(ROOT, 'data', 'discovery');
  if (!fs.existsSync(dir)) return [];
  const shipped = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const entry = JSON.parse(read(path.join('data', 'discovery', f)));
    const errors = validateDiscovery(entry, coursesWithOffers);
    if (errors.length) throw new Error(`discovery ${f}: ${errors.join('; ')}`);
    if (entry.reviewed === true) shipped.push(entry);
  }
  return shipped;
}

const discovery = loadReviewedDiscovery();

// Future industries. The build refuses a file whose industries claim more than their
// quotes say (pipeline/industries.js), the same way it refuses an unreviewed description.
const industriesFile = JSON.parse(read('data/industries.json'));
const opportunitiesFile = JSON.parse(read('data/opportunities.json'));
const scheduleFile = JSON.parse(read('data/schedule.json'));
// The Ask assistant. No endpoint, no button: nothing about it reaches the page.
const assistantFile = JSON.parse(read('data/assistant.json'));
const ASK_ENDPOINT = (process.env.ASSISTANT_ENDPOINT ?? assistantFile.endpoint ?? '').replace(/\/$/, '');
if (ASK_ENDPOINT && !/^(https:\/\/|http:\/\/localhost[:/])/.test(ASK_ENDPOINT)) throw new Error('data/assistant.json: endpoint must be https (or http://localhost for testing)');
const ASK_PROVIDER = assistantFile.providerName || 'an AI company';
const recheck = JSON.parse(read('data/recheck.json'));
// "Rules as at <capture>" alone undersold a re-check that found them unchanged.
const rulesAsAt = d => `${prettyDate(d)}${recheck.checkedOn && recheck.checkedOn > d ? `, re-checked ${prettyDate(recheck.checkedOn)}` : ''}`;
{
  const errs = validateOpportunities(opportunitiesFile, TOPIC_IDS);
  if (errs.length) { console.error('data/opportunities.json refused:\n  ' + errs.join('\n  ')); process.exit(1); }
}
{
  const errs = validateSchedule(scheduleFile, opportunitiesFile);
  if (errs.length) { console.error('data/schedule.json refused:\n  ' + errs.join('\n  ')); process.exit(1); }
}
// The build date decides what reads as out of date. Overridable so tests are repeatable.
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
{
  const errors = validateIndustries(industriesFile, TOPIC_IDS);
  if (errors.length) throw new Error('data/industries.json: ' + errors.join('; '));
}

const captured = (() => {
  const days = [];
  for (const u of Object.values(uniMeta)) if (u.capturedOn) days.push(u.capturedOn);
  const d = path.join(ROOT, 'captures');
  if (fs.existsSync(d)) {
    const walk = x => {
      for (const e of fs.readdirSync(x, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(e.name)) days.push(e.name);
          walk(path.join(x, e.name));
        }
      }
    };
    walk(d);
  }
  return days.sort().pop() ?? 'unknown';
})();

const enginePayload = `
const subjects = ${subjectsJson};
${units}
${readiness}
const CATALOGUE = ${JSON.stringify(coursesWithOffers)};
const DISCOVERY = ${JSON.stringify(discovery)};
const GATES = ${JSON.stringify(gates)};
const EARLY_ENTRY = ${JSON.stringify(earlyEntryFile)};
const CAPTURED_ON = ${JSON.stringify(captured)};
const RECHECKED_ON = ${JSON.stringify(recheck.checkedOn)};
const INDUSTRIES = ${JSON.stringify({ economies: industriesFile.economies, industries: industriesFile.industries.map(i => ({ id: i.id, name: i.name, topics: i.topics, broadFields: i.broadFields })) })};
`;

function siteOrigin() {
  const env = process.env.SITE_ORIGIN;
  if (env) return env.replace(/\/$/, '');
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const [owner, name] = repo.split('/');
    return `https://${owner}.github.io/${name}`;
  }
  // A local build used to fall back to '' — relative sitemap <loc>s and og:url "/". The
  // 2 Oct deploy branch was built locally that way and would have shipped both (error 21).
  // Default to the real address; a fork sets SITE_ORIGIN.
  return 'https://ibn-battuta.github.io/PathtoUni';
}

function absUrl(pagePath) {
  const origin = siteOrigin();
  const p = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  return origin ? origin + p : p;
}

function issuesUrl() {
  if (process.env.GITHUB_REPOSITORY)
    return `https://github.com/${process.env.GITHUB_REPOSITORY}/issues/new`;
  return 'https://github.com/ibn-Battuta/PathtoUni/issues/new';
}

function reportLine() {
  return `<p class="hint">Spotted a mistake? <a href="${esc(issuesUrl())}">Let us know</a>.</p>`;
}

const THEME_BOOT = `<script>try{var t=localStorage.getItem('oty-theme');if(t==='light'||t==='system')document.documentElement.setAttribute('data-theme',t);var c=localStorage.getItem('oty-accent');if(/^(blue|gold|amber|purple|red)$/.test(c))document.documentElement.setAttribute('data-accent',c)}catch(e){}</script>`;
// Dark colour choices, from Ajay's reference palette. [id, name, dot colour]. Green is the default.
const ACCENTS = [['green', 'Green', '#6CFF5A'], ['blue', 'Blue', '#7FB2FF'], ['gold', 'Gold', '#F2C94C'], ['amber', 'Amber', '#F2994A'], ['purple', 'Purple', '#C59BFF'], ['red', 'Red', '#FF6B6B']];
const THEME_UI = `<div class="theme" role="group" aria-label="Colour theme">
        <button type="button" data-theme-set="dark">Dark</button>
        <button type="button" data-theme-set="light">Light</button>
        <button type="button" data-theme-set="system">Match my device</button>
      </div>
      <div class="accents" role="group" aria-label="Dark theme colour">
        ${ACCENTS.map(([id, name, dot]) => `<button type="button" data-accent-set="${id}" style="--dot:${dot}" title="${name}" aria-label="${name}"></button>`).join('')}
      </div>`;
const THEME_BIND = `<script>
(function(){
  function apply(t){
    if(t!=='light'&&t!=='system') t='dark';
    try{
      if(t==='light'||t==='system') document.documentElement.setAttribute('data-theme',t);
      else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('oty-theme', t);
    }catch(e){}
    document.querySelectorAll('[data-theme-set]').forEach(function(b){
      b.setAttribute('aria-pressed', b.getAttribute('data-theme-set')===t ? 'true' : 'false');
    });
  }
  function accent(c){
    if(!/^(blue|gold|amber|purple|red)$/.test(c)) c='green';
    try{
      if(c==='green') document.documentElement.removeAttribute('data-accent');
      else document.documentElement.setAttribute('data-accent',c);
      localStorage.setItem('oty-accent', c);
    }catch(e){}
    document.querySelectorAll('[data-accent-set]').forEach(function(b){
      b.setAttribute('aria-pressed', b.getAttribute('data-accent-set')===c ? 'true' : 'false');
    });
  }
  var c='green';
  try{ c=localStorage.getItem('oty-accent')||'green'; }catch(e){}
  document.querySelectorAll('[data-accent-set]').forEach(function(b){
    b.addEventListener('click', function(){ accent(b.getAttribute('data-accent-set')); });
  });
  accent(c);
  var t='dark';
  try{ t=localStorage.getItem('oty-theme')||'dark'; }catch(e){}
  document.querySelectorAll('[data-theme-set]').forEach(function(b){
    b.addEventListener('click', function(){ apply(b.getAttribute('data-theme-set')); });
  });
  apply(t);
})();
</script>`;

function askPanel(rel) {
  return `<dialog id="ask" class="ask" aria-labelledby="ask-title">
  <form method="dialog" class="ask-close-row"><button class="ask-close" aria-label="Close">Close</button></form>
  <h2 id="ask-title">Ask a question</h2>
  <p class="ask-note">Answers come only from the facts on this site, with a link to each one. It can’t predict an ATAR or an offer, and it can get things wrong, so open the link before you rely on it.</p>
  <label class="ask-consent"><input type="checkbox" data-ask-consent> I understand my question goes to this site’s server and to ${esc(ASK_PROVIDER)} to write the answer. It isn’t stored. I won’t type my name or other personal details.</label>
  <label class="ask-q-label" for="ask-q">Your question</label>
  <textarea id="ask-q" data-ask-q maxlength="400" rows="3" placeholder="e.g. When does Macquarie early entry close? Do I need physics for engineering?"></textarea>
  <p class="ask-actions"><button type="button" class="ask-send" data-ask-send disabled>Send</button> <span class="ask-count" data-ask-count>0 / 400</span></p>
  <div class="ask-answer" data-ask-answer aria-live="polite"></div>
</dialog>
<script src="${rel}ask.js?v=${ASSET_V}" defer></script>`;
}

// The menu, in order: [link, label, the page it marks as current].
const NAV = [
  ['', 'Home', 'home'],
  ['subjects/', 'My subjects', 'subjects'],
  ['quiz/', 'Interest quiz', 'quiz'],
  ['industries/', 'Future jobs', 'industries'],
  ['try-it/', 'Try it out', 'try-it'],
  ['dates/', 'Key dates', 'dates'],
  ['results/', 'My results', 'results'],
  ['guides/assumed-knowledge/', 'Subject guides', 'guide'],
  ['about/', 'About', 'about']
];

function shell({ title, description, rel, page, body, script, noindex = false, path: pagePath = '/' }) {
  const desc = description || 'See which NSW university STEM courses your HSC subjects prepare you for, and how to catch up on any gaps.';
  const url = absUrl(pagePath);
  const robots = noindex ? `<meta name="robots" content="noindex">\n` : '';
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" data-oty content="#0A1712">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0A1712">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#FBF3EC">
${robots}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
${THEME_BOOT}
<link rel="stylesheet" href="${rel}site.css?v=${ASSET_V}">
</head>
<body data-page="${esc(page)}" data-base="${esc(rel)}"${ASK_ENDPOINT ? ` data-ask="${esc(ASK_ENDPOINT)}"` : ''}>
<div class="shell">
  <header class="top">
    <div class="brandline">
      <div class="brand"><a href="${rel}"><h1>${esc(SITE_NAME)}</h1></a></div>
      <nav class="topnav" aria-label="Site">
        ${NAV.map(([href, label, pg]) => `<a href="${rel}${href}"${pg === page ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ')}
        ${ASK_ENDPOINT ? '<button type="button" class="ask-open" data-ask-open>Ask</button>' : ''}
        ${THEME_UI}
      </nav>
    </div>
  </header>
  ${body}
  <footer class="foot" id="foot">
    <p>We’re independent — not UAC or a university. Course rules from ${esc(rulesAsAt(captured))}. Always check UAC and the university’s website before you apply.</p>
  </footer>
</div>
${script ? `<script src="${rel}${script}?v=${ASSET_V}" defer></script>` : ''}
${ASK_ENDPOINT ? askPanel(rel) : ''}
${THEME_BIND}
</body>
</html>
`;
}

function writePrototype() {
  const tpl = read('ui/prototype.template.html');
  const out = tpl.replace('/*__ENGINE__*/', () => enginePayload);
  fs.writeFileSync(path.join(ROOT, 'ui/prototype.html'), out);
  return out.length;
}

// Home: the next few dates anyone can still act on, from Key dates. Built with the dates that
// are ahead on the build day; a small script re-picks with the reader's own date, so the strip
// never shows a date that has passed even if the site is not rebuilt.
function homeComingUp() {
  const year = Number(BUILD_DATE.slice(0, 4));
  const who = id => Number(id) === year + 1 ? 'Year 12 now' : Number(id) === year + 2 ? 'Year 11 now' : `Starting uni ${id}`;
  const seen = new Set();
  const cands = [];
  for (const e of [...scheduleFile.events].sort((a, b) => a.date.localeCompare(b.date))) {
    if (e.status || seen.has(e.id) || (e.end || e.date) < BUILD_DATE) continue;
    seen.add(e.id);
    const cohort = [...e.cohorts].sort().pop();
    const base = e.cohorts.length > 1 ? 'Years 11 and 12' : who(e.cohorts[0]);
    cands.push({ id: e.id, end: e.end || e.date, dateText: e.dateText, org: e.org,
      title: (e.opens || e.result) ? `${e.title} closes` : e.title,
      who: (e.flags ?? []).includes('equity') ? `${base} \u00b7 some students only` : base,
      href: `dates/#ev-${cohort}-${e.id}` });
    if (cands.length >= 12) break;
  }
  if (!cands.length) return '';
  const li = c => `<li data-end="${esc(c.end)}"><a href="${esc(c.href)}"><b>${esc(c.dateText)}</b> — ${esc(c.org)}: ${esc(c.title)}</a> <span class="who-tag">${esc(c.who)}</span></li>`;
  return `<section class="home-soon" aria-labelledby="soon-h">
      <h2 id="soon-h">${icon('calendar', 'ico ico-sm')} Dates coming up</h2>
      <ol class="soon-list">${cands.map((c, i) => li(c).replace('<li ', i < 3 ? '<li ' : '<li hidden ')).join('')}</ol>
      <p class="soon-more"><a href="dates/">All key dates →</a></p>
    </section>
    <script>(function(){var d=new Date(),t=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),n=0;
    document.querySelectorAll('.soon-list li').forEach(function(li){var show=li.getAttribute('data-end')>=t&&n<3;li.hidden=!show;if(show)n++;});
    if(!n){var s=document.querySelector('.home-soon');if(s)s.hidden=true;}})();</script>`;
}

// Why you can rely on it (home), and who it is for, common questions and where the facts come
// from (About). Every count and name here is computed from the data (decision 27), so the pages
// cannot drift from what the site holds. `rel` is the path back to the site root.
function infoSections(rel) {
  const uniNames = Object.keys(uniMeta).sort();
  const eeUnis = [...new Set(displayableSchemes(earlyEntryFile).map(s => s.university))].sort();
  const atar = scheduleFile.events.find(e => e.id === 'atar-release');
  const gated = coursesWithOffers.filter(c => (c.hardRules ?? []).length);
  const gatedUnis = [...new Set(gated.map(c => c.university))].sort();
  const andList = xs => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  const the = n => /^University of/.test(n) ? `the ${n}` : n;
  const econ = economyList(industriesFile);
  const gateway = scheduleFile.events.some(e => e.id === 'unsw-gateway-r1');
  const faq = [
    ['Will this tell me my ATAR, or whether I’ll get in?',
      `<p>No. It shows how well your subjects prepare you for each course and what you’d need to catch up on. It doesn’t predict ATARs or offers. Your ATAR comes from UAC${atar ? `, and this year’s Year 12s get theirs on ${esc(atar.dateText)}` : ''}.</p>`],
    ['Do I need certain subjects to get into a course?',
      `<p>Hardly ever. Of the ${uniNames.length} universities here, only ${andList(gatedUnis.map(n => esc(the(n))))} have a must-have subject rule, and only on ${gated.length} of the courses we list. For everything else the subjects are “assumed knowledge”. <a href="${rel}guides/prerequisites/">Read more about prerequisites</a>.</p>`],
    ['What does “assumed knowledge” mean?',
      `<p>It’s what a course expects you to know when you start. It doesn’t stop you applying, but if you haven’t studied it you’ll need to catch up, and some universities run short bridging courses for that. <a href="${rel}guides/assumed-knowledge/">Read more about assumed knowledge</a>.</p>`],
    ['Do Year 11 results matter?',
      `<p>Yes, for early offers. ${andList(eeUnis.map(esc))} can make you an offer before your ATAR comes out, based partly on your Year 11 results${gateway ? '. So can UNSW’s Gateway scheme, for students who meet certain equity criteria' : ''}. All the dates are on <a href="${rel}dates/">Key dates</a>.</p>`],
    ['Where does your information come from?',
      `<p>Straight from each university’s website and UAC. We quote their exact words, link to the page, and note the date we checked. We last re-checked the course rules on ${esc(prettyDate(recheck.checkedOn))} and the dates on ${esc(prettyDate(scheduleFile.checkedOn))}.</p>`],
    ['Do you store my details?',
      `<p>No. There’s no sign-up, and your subjects stay in your browser. They’re never sent to us. ${ASK_ENDPOINT ? 'The only exception is the Ask assistant, and only if you tick its box and press Send. ' : ''}<a href="${rel}about/#privacy">Read more about privacy</a>.</p>`],
    ['Which universities and courses are included?',
      `<p>${coursesWithOffers.length} STEM courses, including health, at ${andList(uniNames.map(esc))}.</p>`],
    ['Is this an official site?',
      '<p>No. We’re independent. We’re not UAC or a university, and no one pays to be listed. Always double-check on UAC and the university’s website before you apply.</p>']
  ];
  const card = (ic, title, text, links) => `<div class="who">
          ${icon(ic)}
          <h3>${title}</h3>
          <p>${text}</p>
          <ul>${links.map(l => `<li>${l}</li>`).join('')}</ul>
        </div>`;
  const reportLink = reportLine().replace(/<\/?p[^>]*>/g, '').replace(/^Spotted a mistake\? /, '');
  const trust = `<section class="home-trust" aria-labelledby="trust-h">
      <h2 id="trust-h">Why you can rely on it</h2>
      <div class="trust-grid">
        <div class="trust-item">${icon('shield')}<h3>Independent</h3><p>We’re not a university or UAC, and no one pays to be listed.</p></div>
        <div class="trust-item">${icon('quote')}<h3>Straight from the source</h3><p>Every rule is the university’s own words, with a link and the date we checked it.</p></div>
        <div class="trust-item">${icon('lock')}<h3>Private</h3><p>No sign-up. Your subjects stay on your device and are never sent to us.</p></div>
        <div class="trust-item">${icon('check')}<h3>Check before you apply</h3><p>Rules change, so confirm on UAC before you lock in your preferences.</p></div>
      </div>
    </section>`;
  const who = `<section class="home-who" aria-labelledby="who-h">
      <h2 id="who-h">Made for students, parents and careers advisers</h2>
      <div class="who-grid">
        ${card('cap', 'Students', 'Thinking about dropping a subject, or picking one up? See what it changes before you decide, find ways to try a field, and keep track of the dates for your year.',
          [`<a href="${rel}subjects/">Check my subjects</a>`, `<a href="${rel}try-it/">Try a field before you choose</a>`, `<a href="${rel}dates/">Key dates for your year</a>`])}
        ${card('parents', 'Parents', 'Get straight answers about which subjects really matter for which courses. Most subjects don’t close any doors, and we’ll show you the few that do.',
          [`<a href="${rel}guides/dropping-a-subject/">What dropping a subject really means</a>`, `<a href="${rel}dates/">Early offers and open days</a>`, `<a href="${rel}about/#how">How we get our facts</a>`])}
        ${card('clipboard', 'Careers advisers', 'Share a student’s results with one link, or print them for a meeting. Every rule shows the university’s exact wording, a link and the date we checked it.',
          ['Results links hold the subjects and nothing else', 'Print the results page for a meeting', `Spotted a wrong rule? ${reportLink}`])}
      </div>
    </section>`;
  const faqHtml = `<section class="home-faq" aria-labelledby="faq-h">
      <h2 id="faq-h">Common questions</h2>
      ${faq.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary>${a}</details>`).join('\n      ')}
    </section>`;
  const sources = `<section class="home-sources" aria-labelledby="src-h">
      <h2 id="src-h">Where our information comes from</h2>
      <p class="src-strip">${['UAC', 'NESA', ...uniNames].map(n => `<span>${esc(n)}</span>`).join('')}</p>
      <p class="hint">We also use official government investment plans from ${esc(econ)}, and each program’s own website. We quote these sources, but they don’t endorse us.</p>
    </section>`;
  return { trust, who, faq: faqHtml, sources };
}

function writeSite() {
  // Empty dist/ rather than delete it: on Ajay's Mac dist is a link to dist.nosync, which
  // iCloud does not sync (iCloud was re-creating files mid-build as "name 2").
  fs.mkdirSync(DIST, { recursive: true });
  for (const e of fs.readdirSync(DIST)) fs.rmSync(path.join(DIST, e), { recursive: true, force: true });
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
  fs.writeFileSync(path.join(DIST, 'site.css'), read('ui/site.css'));
  if (ASK_ENDPOINT) fs.writeFileSync(path.join(DIST, 'ask.js'), read('ui/ask.js'));
  // Self-hosted images (no third-party request on any page). Location data was stripped before
  // the photo was added to the repo.
  fs.mkdirSync(path.join(DIST, 'img'), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'ui/img')).filter(n => /\.(jpe?g|png|webp)$/i.test(n)))
    fs.copyFileSync(path.join(ROOT, 'ui/img', f), path.join(DIST, 'img', f));
  const fontSrc = path.join(ROOT, 'ui/fonts');
  const fontDst = path.join(DIST, 'fonts');
  fs.mkdirSync(fontDst, { recursive: true });
  for (const f of fs.readdirSync(fontSrc).filter(n => n.endsWith('.woff2')))
    fs.copyFileSync(path.join(fontSrc, f), path.join(fontDst, f));
  // Functions, not strings: a replacement string treats "$$" as "$", which turned the engine's
  // "~$${cost}" into "~${cost}" and dropped the dollar sign from bridging costs on the page.
  const app = read('ui/site.js')
    .replace('/*__HASH__*/', () => hash)
    .replace('/*__EARLY__*/', () => earlyEntryHelpers)
    .replace('/*__COMPARE__*/', () => compareHelpers)
    .replace('/*__CLASSIFY__*/', () => classifyHelpers)
    .replace('/*__TOPICS__*/', () => topicHelpers)
    .replace('/*__ENGINE__*/', () => enginePayload);
  fs.writeFileSync(path.join(DIST, 'app.js'), app);

  const someFields = industriesFile.industries.slice(0, 3).map(i => i.name.replace(/\s*\(.*?\)/g, '').replace(/\s+and\s.*$/, '').toLowerCase());
  const fieldList = `${someFields.slice(0, -1).join(', ')} and ${someFields.at(-1)}`;
  const homeBody = `
    <section class="hero" aria-labelledby="hero-h">
      <h2 id="hero-h" class="hero-h">See which uni courses your HSC subjects lead to</h2>
      <p class="hero-sub">${esc(SITE_NAME)} checks your subjects against ${coursesWithOffers.length} STEM courses at six NSW universities, using each university’s own rules. See which ones you’re ready for, and how to catch up on the rest.</p>
    </section>
    <section class="doors" aria-labelledby="doors-h">
      <h2 class="doors-h" id="doors-h">Where would you like to start?</h2>
      <p class="doors-sub">Pick whichever suits you. You can always try the others.</p>
      <div class="door-grid">
        <a class="door" href="subjects/" data-door="subjects">
          ${icon('book')}
          <span class="door-t">Check my subjects</span>
          <span class="door-d">Already chosen your subjects, or still deciding? See which courses they prepare you for and what you’d need to catch up on.</span>
        </a>
        <a class="door" href="quiz/" data-door="quiz">
          ${icon('compass')}
          <span class="door-t">Help me find what I enjoy</span>
          <span class="door-d">Answer ten quick either-or questions. We’ll list the courses that match your interests first, without hiding any others.</span>
        </a>
        <a class="door" href="industries/" data-door="industries">
          ${icon('globe')}
          <span class="door-t">Explore jobs of the future</span>
          <span class="door-d">Pick from ${industriesFile.industries.length} fields that governments are investing in, like ${esc(fieldList)}, and see which courses lead there.</span>
        </a>
      </div>
    </section>
    ${homeComingUp()}
    ${infoSections('').trust}
    <p class="home-more"><a href="about/">About ${esc(SITE_NAME)}, common questions and where our facts come from →</a></p>
  `;
  const homeDesc = 'Pick your HSC subjects and see which STEM courses at six NSW universities you’re ready for, what you’d need to catch up on, and courses you may not have heard of.';
  fs.writeFileSync(path.join(DIST, 'index.html'), shell({
    title: `${SITE_NAME} — see which uni courses your HSC subjects lead to`,
    description: homeDesc,
    rel: '',
    page: 'home',
    path: '/',
    body: homeBody,
    script: 'app.js'
  }));

  // Check my subjects: its own page, like the other ways in (Ajay, 6 Nov: the home page had
  // too much on it).
  fs.mkdirSync(path.join(DIST, 'subjects'));
  fs.writeFileSync(path.join(DIST, 'subjects/index.html'), shell({
    title: `Check my subjects — ${SITE_NAME}`,
    description: 'Pick your HSC subjects in about a minute and see which NSW university STEM courses you’re ready for. Nothing you enter leaves your device.',
    rel: '../',
    page: 'subjects',
    path: '/subjects/',
    body: `<main id="subjects" class="subjects">
      <h1>Check my subjects</h1>
      <p class="lede">Start with your year, maths and English, then add the rest. It takes about a minute, and nothing you enter leaves your device.</p>
      <p class="doors-now" id="doors-now" hidden></p>
      <form class="picker" id="picker" aria-label="Your subjects" data-mode="steps"></form>
      <noscript><p class="hint">Picking subjects needs JavaScript turned on.</p></noscript>
    </main>`,
    script: 'app.js'
  }));

  fs.mkdirSync(path.join(DIST, 'results'));
  fs.writeFileSync(path.join(DIST, 'results/index.html'), shell({
    title: `Your results — ${SITE_NAME}`,
    description: 'Your HSC subjects checked against NSW university STEM courses. Your subjects stay on your device.',
    rel: '../',
    page: 'results',
    path: '/results/',
    noindex: true,
    body: `<main id="results" aria-live="polite">
      <p class="lede">Pick your subjects first, and your results will show here.</p>
      <p><a class="btn" href="../subjects/" style="display:inline-block;text-decoration:none">Pick my subjects</a></p>
    </main>`,
    script: 'app.js'
  }));

  for (const c of coursesWithOffers) writeCoursePage(c);
  writeQuizPage();
  writeIndustriesPage();
  writeTryItPage();
  writeDatesPage();

  writeGuidePages();
  writeAbout();
  writeRobotsAndSitemap();
}

function writeRobotsAndSitemap() {
  const origin = siteOrigin();
  const sitemapLoc = origin ? `${origin}/sitemap.xml` : '/sitemap.xml';
  fs.writeFileSync(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /results\nDisallow: /results/\nSitemap: ${sitemapLoc}\n`);

  const urls = [
    { path: '/', lastmod: captured },
    { path: '/subjects/', lastmod: captured },
    { path: '/about/', lastmod: captured },
    { path: '/quiz/', lastmod: captured },
    { path: '/industries/', lastmod: industriesFile.capturedOn },
    { path: '/try-it/', lastmod: opportunitiesFile.opportunities.map(o => o.checkedOn).sort().pop() },
    { path: '/dates/', lastmod: scheduleFile.checkedOn },
    { path: '/guides/prerequisites/', lastmod: captured },
    { path: '/guides/assumed-knowledge/', lastmod: captured },
    { path: '/guides/dropping-a-subject/', lastmod: captured },
    ...courses.map(c => ({ path: `/course/${c.id}/`, lastmod: c.capturedOn || captured }))
  ];
  const body = urls.map(u => `  <url>\n    <loc>${esc(absUrl(u.path))}</loc>\n    <lastmod>${esc(u.lastmod)}</lastmod>\n  </url>`).join('\n');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}

function sourceLink(url, date) {
  if (!url) return date ? `<span class="item-meta">Checked ${esc(prettyDate(date))}</span>` : '';
  return `<p class="item-meta"><a href="${esc(url)}" rel="noopener">Source</a>${date ? ' · checked ' + esc(prettyDate(date)) : ''}</p>`;
}

// Interest areas on the course page. The same rules the quiz and the industries page use
// (ui/topics.js), so a course never shows one area here and sorts under another there.
// Labelled as our judgement: the tag comes from the degree's name, not the university.
function topicsSection(c) {
  if (c.notEntryPoint) return '';
  const ids = courseTopics(c);
  const inds = industriesFile.industries.filter(ind => coursesForIndustry(ind, [c]).specific.length);
  let inner;
  if (ids.length) {
    inner = `<p class="chips">${ids.map(t => `<span class="chip">${esc(topicLabel(t))}</span>`).join(' ')}</p>`;
  } else if (isBroad(c)) {
    inner = `<p>A broad degree: you choose a major later, so we don’t put it under one area. It can lead to many of them. Check the handbook for the majors it offers.</p>`;
  } else {
    inner = `<p>The name doesn’t fit one of our interest areas. That says nothing about the course itself, and it still shows in every results list.</p>`;
  }
  const indBlock = inds.length
    ? `<p>Can lead to jobs in: ${inds.map(i => `<a href="../../industries/#ind-${esc(i.id)}">${esc(i.name)}</a>`).join(' · ')}</p>`
    : '';
  const tries = opportunitiesForTopics(opportunitiesFile, ids);
  const tryBlock = tries.length
    ? `<p>Try it while you’re at school: ${tries.map(o => `<a href="../../try-it/#opp-${esc(o.id)}">${esc(o.name)}</a>`).join(' · ')}</p>`
    : `<p>Try it while you’re at school: <a href="../../try-it/">work experience and other ways in</a></p>`;
  return `<section class="topics"><h3>Interest areas</h3>
    <p class="lede">Our best guess from the course name, not the university’s. It only changes the order of your results. It never hides a course.</p>
    ${inner}
    ${indBlock}
    ${tryBlock}
  </section>`;
}

function writeCoursePage(c) {
  const dir = path.join(DIST, 'course', c.id);
  fs.mkdirSync(dir, { recursive: true });
  const date = c.capturedOn || captured;
  const gate = (c.hardRules || []).map(id => gates[id]).filter(Boolean);
  const ak = c.assumedKnowledge || [];
  const rec = c.recommendedStudies || [];
  const hurdles = c.extraHurdles || [];

  let body = `<article class="course-head">
    <p class="kicker">${esc(c.university)} · ${esc((c.field || '').replace(/^./, x => x.toUpperCase()))}</p>
    <h1>${esc(c.name)}</h1>
    <p class="lede">Rules from ${esc(rulesAsAt(date))}. Check the university handbook before you apply.</p>
    ${c.notEntryPoint ? '' : '<p><a id="prepared" href="../../results/">Check my subjects against this course</a></p>'}
    ${reportLine()}
  </article>`;

  // Who may apply at all, above everything about subjects. This page is the site's
  // indexed surface: a student arriving from a search engine reads it before they have
  // read anything else, and without this it said "no assumed knowledge listed" and
  // stopped — technically true, and the most misleading arrangement of the facts.
  if (c.restrictedTo) {
    body += `<section class="restricted"><h3>Who can apply</h3>
      <p class="restrict"><b>Only open to ${esc(c.restrictedTo.who)}.</b> This is the university’s admission rule, and your subjects don’t change it. Everything below is about subjects only.</p>
      ${c.restrictedTo.quote ? `<p class="item-quote">\u201c${esc(String(c.restrictedTo.quote).replace(/\s+/g, ' ').trim())}\u201d</p>` : ''}
      ${sourceLink(c.restrictedTo.source || c.source, date)}
    </section>`;
  }

  if (c.notEntryPoint) {
    body += `<section class="restricted"><h3>Who can start this</h3>
      <p class="restrict"><b>Not a course you start straight from school.</b> It’s for ${esc(c.notEntryPoint.who)}, so it doesn’t appear in anyone’s results. Everything below is about subjects only.</p>
      <p class="item-quote">\u201c${esc(String(c.notEntryPoint.quote).replace(/\s+/g, ' ').trim())}\u201d</p>
      ${sourceLink(c.notEntryPoint.source || c.source, date)}
    </section>`;
  }

  if (schemesForUniversity(c.university, earlyEntryFile).length) {
    body += `<p class="lede"><a id="early-entry-link" href="../../results/#early-entry">This university may offer you a place before your ATAR comes out.</a> That’s separate from the subjects below.</p>`;
  }

  body += `<section class="ak"><h3>Assumed knowledge</h3>
    <p class="lede">What the university expects you to know when you start. It won’t stop you applying, but if you haven’t studied it you’ll need to catch up.</p>`;
  if (!ak.length) body += `<p>The university doesn’t list any assumed knowledge for this course.</p>`;
  ak.forEach(a => {
    body += `<div>
      <p><b>${esc(a.subject)}</b>${a.minBand != null ? ` · at least Band ${esc(a.minBand)}` : ''}</p>
      ${a.quote ? `<p class="item-quote">“${esc(a.quote)}”</p>` : ''}
      ${sourceLink(a.source || c.source, date)}
    </div>`;
  });
  body += `</section>`;

  body += `<section class="rec"><h3>Recommended subjects — helpful, not expected</h3>
    <p class="lede">Subjects the university suggests. They’re optional, and they don’t change your result here.</p>`;
  if (!rec.length) body += `<p>None listed.</p>`;
  rec.forEach(a => {
    const sub = a.subject || a;
    body += `<div>
      <p><b>${esc(sub)}</b></p>
      ${a.quote ? `<p class="item-quote">“${esc(a.quote)}”</p>` : ''}
      ${sourceLink(a.source, date)}
    </div>`;
  });
  body += `</section>`;

  if (gate.length) {
    body += `<section class="gate"><h3>Entry rule: a maths mark you must reach</h3>
      <p class="lede">This course needs a certain maths result. It’s one of the few rules in NSW that can actually stop an offer.</p>`;
    gate.forEach(g => {
      body += `<p class="item-quote">“${esc(g.quote)}”</p>${sourceLink(g.source, date)}`;
    });
    body += `</section>`;
  }

  if (hurdles.length) {
    body += `<section class="hurdle"><h3>Extra requirements</h3>
      <p class="lede">Extra steps the university asks for. They don’t change whether your subjects are enough.</p><ul>`;
    hurdles.forEach(h => {
      // Written label, never the stored enum: `situational_judgement` reached a printed
      // card once already.
      const t = typeof h === 'string'
        ? h.replace(/_/g, ' ')
        : (h.label || String(h.type || 'extra requirement').replace(/_/g, ' '));
      const q = h && h.quote ? `<p class="item-quote">\u201c${esc(String(h.quote).replace(/\s+/g, ' ').trim())}\u201d</p>` : '';
      body += `<li>${esc(t)}${q}</li>`;
    });
    body += `</ul></section>`;
  }

  const disc = discovery.find(d => d.courseId === c.id);
  if (disc) {
    body += `<section class="discovery">
      <h3>What it’s like — in our words, not the university’s</h3>
      <p class="lede">A plain description to help you picture it. The university’s own words above are the official version.</p>
      <p>${esc(disc.firstYear)}</p>
      <p>${esc(disc.notThis)}</p>
      <p class="item-meta">Drafted ${esc(disc.draftedBy || '')}. Reviewed ${esc(disc.reviewedOn || '')}.</p>
    </section>`;
  }

  body += topicsSection(c);

  body += `<script>
    (function () {
      var a = document.getElementById('prepared');
      if (a && location.hash) a.href = '../../results/' + location.hash;
    })();
  </script>`;

  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: courseTitleText(c),
    description: courseDescription(c),
    rel: '../../',
    page: 'course',
    path: `/course/${c.id}/`,
    body
  }));
}

function writeQuizPage() {
  const dir = path.join(DIST, 'quiz');
  fs.mkdirSync(dir, { recursive: true });
  // The questions are in the page so it reads without JavaScript; the buttons need it.
  const items = QUIZ.map((pair, i) => `<li>${esc(pair[0].text)} <em>or</em> ${esc(pair[1].text)}</li>`).join('');
  const body = `<main id="quiz" class="quiz">
    <h1>What do you enjoy?</h1>
    <p class="lede">Ten quick questions. In each pair, pick the one that sounds more fun. There’s no right answer, and you can skip any.</p>
    <p class="hint">Your answers only change the order of courses. They never hide a course or change whether you’re ready for it, and they stay on your device.</p>
    <ol class="quiz-static">${items}</ol>
    <noscript><p class="hint">These questions need JavaScript turned on. You can still see every course on your results page.</p></noscript>
  </main>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: `What do you enjoy? A ten-question interest quiz — ${SITE_NAME}`,
    description: 'Ten quick this-or-that questions that sort NSW university STEM courses by what you enjoy. Nothing is sent anywhere.',
    rel: '../',
    page: 'quiz',
    path: '/quiz/',
    body,
    script: 'app.js'
  }));
}

function checkedRangeText() {
  const { from, to } = checkedRange(industriesFile);
  return from === to ? prettyDate(from) : `between ${prettyDate(from)} and ${prettyDate(to)}`;
}

function tryItLine(topicIds, rel) {
  const tries = opportunitiesForTopics(opportunitiesFile, topicIds);
  if (!tries.length) return '';
  return `<p class="try-line"><b>Try it at school:</b> ${tries.map(o => `<a href="${rel}try-it/#opp-${esc(o.id)}">${esc(o.name)}</a>`).join(' · ')}</p>`;
}

function writeTryItPage() {
  const dir = path.join(DIST, 'try-it');
  fs.mkdirSync(dir, { recursive: true });
  const ops = opportunitiesFile.opportunities;
  const kinds = opportunitiesFile.kinds.filter(k => ops.some(o => o.kind === k.id));
  const jump = kinds.map(k => `<a class="chip" href="#kind-${esc(k.id)}">${esc(k.label)}</a>`).join(' ');
  const card = o => {
    const stale = isStale(o, BUILD_DATE, opportunitiesFile.stalenessDays);
    const chips = o.anyTopic
      ? '<span class="chip">Any area</span>'
      : o.topics.map(t => `<span class="chip">${esc(topicLabel(t))}</span>`).join(' ');
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
    return `<article class="opp" id="opp-${esc(o.id)}">
      <h3>${esc(o.name)}</h3>
      <p class="opp-by">${esc(o.provider)}${stale ? ' <span class="tag t-warn">checked over a year ago — may be out of date</span>' : ''}</p>
      <dl>${row('Who', o.who)}${row('When', o.when)}${row('Cost', o.cost)}${row('Where', o.where)}${row('How to apply', o.how)}${row('Right now', o.status)}</dl>
      <p class="chips">${chips}</p>
      <details class="fold"><summary>What their website says</summary>
        ${o.quotes.map(q => `<p class="quote">\u201c${esc(q.text)}\u201d</p>`).join('')}
        <p class="src">${o.sources.map((u, i) => `<a href="${esc(u)}" rel="noopener">Source${o.sources.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · ')} · checked ${esc(prettyDate(o.checkedOn))}</p>
      </details>
    </article>`;
  };
  const sections = kinds.map(k => `<section class="kind" id="kind-${esc(k.id)}">
      <div class="sh"><h2>${esc(k.label)}</h2></div>
      <div class="opp-grid">${ops.filter(o => o.kind === k.id).map(card).join('')}</div>
    </section>`).join('');
  const body = `<main id="try-it" class="try-it">
    <h1>Try it before you choose</h1>
    <p class="lede">Spend a week in a lab, a day at an engineering firm, or do a first-year uni subject from home. Trying a field is the best way to find out if you’d enjoy studying it for years. Every program here says on its own website that school students can take part.</p>
    <ul class="trust">
      <li><b>These aren’t internships.</b> Real internships for under-18s are rare in Australia. What you’ll find here is work experience, one-day events, live-in programs, uni subjects, competitions, free online courses and paid school-based traineeships.</li>
      <li><b>Dates change every year.</b> Each one shows when we checked it. Many open months ahead and fill up early, so check the program’s website.</li>
      <li><b>Not listed doesn’t mean no.</b> A lab or company without its own program may still take a student. Ask your school careers adviser to set it up as work experience, so you’re safe and insured.</li>
      <li><b>Year 12 gets busy.</b> The summer holidays before Year 12, and Term 1, are the easiest times.</li>
    </ul>
    <p class="chips jump">${jump}</p>
    ${sections}
    <p class="hint">Checked ${esc(prettyDate(ops.map(o => o.checkedOn).sort()[0]))}. We matched every quote word for word against the program’s own website. Which interest areas a program fits is our own judgement. ${reportLine().replace(/<\/?p[^>]*>/g, '')}</p>
  </main>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: `Try it before you choose: work experience and STEM programs for NSW high school students — ${SITE_NAME}`,
    description: `${ops.length} programs NSW high school students can actually do, from work experience to holiday programs and competitions. Each one checked against the program’s own website.`,
    rel: '../',
    page: 'try-it',
    path: '/try-it/',
    body
  }));
}

// Key dates. One timeline per starting year. Every date is quoted from the page that set it;
// a later year that has no published round yet shows last year's date, labelled as such,
// never a guessed day (ui/schedule.js).
const SECTION_LABEL = Object.fromEntries(scheduleFile.sections.map(s => [s.id, s.label]));
const SECTION_ICON = { early: 'rocket', uac: 'file', holidays: 'sun', 'open-days': 'building', experience: 'flask', 'after-school': 'briefcase' };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayShort(iso, precision) {
  const [y, m, d] = iso.split('-').map(Number);
  if (precision === 'month') return MO[m - 1];
  return `${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MO[m - 1]}`;
}

function datesEventHtml(it, cohortId) {
  const e = it.event;
  const last = it.kind === 'last-year';
  const year = (last ? it.sortDate : e.date).slice(0, 4);
  const when = last
    ? `<b>${esc(it.around.short)}</b><span>${esc(it.around.year)}</span>`
    : `<b>${esc(dayShort(e.date, e.precision))}</b><span>${esc(year)}</span>`;
  const row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : '';
  const isWindow = Boolean(e.opens || e.result);
  const p = last ? 'In 2026: ' : '';
  const rows = row('Who', e.for)
    + row(`${p}Applications open`, e.opensText)
    + (isWindow ? row(`${p}Applications close`, e.dateText)
      : e.end ? row(last ? 'In 2026' : 'Dates', `${e.dateText} to ${e.endText}`)
      : row(last ? 'In 2026' : 'Date', e.dateText))
    + row(`${p}Offers`, e.resultText);
  const passed = !last && it.endDate < BUILD_DATE;
  const tags = [
    last ? '<span class="tag t-warn">Last year’s date</span>' : '<span class="tag t-ok">Confirmed date</span>',
    !last && e.status ? `<span class="tag t-flag">${esc(e.status)}</span>` : '',
    (e.flags ?? []).includes('equity') ? '<span class="tag t-restrict">For some students only</span>' : '',
    (e.flags ?? []).includes('private') ? '<span class="tag t-warn">Private company — you pay</span>' : '',
    (e.flags ?? []).includes('interstate') ? '<span class="tag t-flag">Interstate</span>' : '',
    last ? '' : `<span class="tag t-flag" data-passed${passed ? '' : ' hidden'}>Date has passed</span>`
  ].filter(Boolean).join(' ');
  const urls = [...new Set(e.quotes.map(q => q.url))];
  const opp = e.opportunity ? ` · <a href="../try-it/#opp-${esc(e.opportunity)}">More about this program</a>` : '';
  return `<li class="ev${passed ? ' passed' : ''}" id="ev-${esc(cohortId)}-${esc(e.id)}" data-section="${esc(e.section)}" data-kind="${esc(it.kind)}" data-end="${esc(it.endDate)}" data-datetext="${esc(e.dateText)}" data-org="${esc(e.org)}"${!last && e.status ? ' data-closed' : ''}>
      <div class="ev-date">${when}</div>
      <div class="ev-body">
        <p class="ev-org">${esc(e.org)} · ${esc(SECTION_LABEL[e.section])}</p>
        <h4>${esc(e.title)}</h4>
        ${last ? `<p class="ly">The 2027 dates aren’t out yet. Here are last year’s, so you know roughly when to look: expect ${esc(it.around.long)}.</p>` : ''}
        <p class="ev-what">${esc(e.what)}</p>
        <dl>${rows}</dl>
        <p class="tags">${tags}</p>
        <details class="fold"><summary>What their website says</summary>
          ${e.quotes.map(q => `<p class="quote">“${esc(q.text)}”</p>`).join('')}
          <p class="src">${urls.map((u, i) => `<a href="${esc(u)}" rel="noopener">Source${urls.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · ')} · checked ${esc(prettyDate(scheduleFile.checkedOn))}${opp}</p>
        </details>
      </div>
    </li>`;
}

function writeDatesPage() {
  const dir = path.join(DIST, 'dates');
  fs.mkdirSync(dir, { recursive: true });
  const evById = Object.fromEntries(scheduleFile.events.map(e => [e.id, e]));
  const oppById = Object.fromEntries(opportunitiesFile.opportunities.map(o => [o.id, o]));
  const cohorts = [...scheduleFile.cohorts].sort((a, b) => a.id.localeCompare(b.id));
  const DEFAULT = cohorts[cohorts.length - 1].id;

  const switcher = `<div class="cohort-switch" role="group" aria-label="When do you start uni?">
      ${cohorts.map(c => `<button type="button" data-cohort="${esc(c.id)}" aria-pressed="${c.id === DEFAULT}"><b>${esc(c.label)}</b><span>${esc(c.who)}</span></button>`).join('')}
    </div>`;
  const filters = `<p class="filters-label">Tap a box to show or hide that kind of date:</p>
    <div class="chips filters" role="group" aria-label="Show or hide each kind of date">
      ${scheduleFile.sections.map(s => `<button type="button" class="chip filter-card" data-filter="${esc(s.id)}" aria-pressed="true">${icon(SECTION_ICON[s.id] || 'calendar', 'ico ico-sm')}<b>${esc(s.label)}</b>${s.hint ? `<span>${esc(s.hint)}</span>` : ''}</button>`).join(' ')}
    </div>`;

  const notes = `<section class="dates-notes">
      <h3>Not on this list</h3>
      ${scheduleFile.notes.map(n => `<div class="note"><p>${esc(n.text)}</p>
        <details class="fold"><summary>${n.quotes ? 'What their website says' : 'How we know'}</summary>
          ${(n.quotes ?? []).map(q => `<p class="quote">“${esc(q.text)}”</p>`).join('')}
          ${n.basis ? `<p class="quote-plain">${esc(n.basis)}</p>` : ''}
          <p class="src">${[...new Set([...(n.quotes ?? []).map(q => q.url), ...(n.source ? [n.source] : [])])].map(u => `<a href="${esc(u)}" rel="noopener">Source</a>`).join(' · ')}</p>
        </details></div>`).join('')}
    </section>`;

  const panels = cohorts.map(c => {
    const items = cohortView(scheduleFile, c.id);
    const soon = upcoming(items, BUILD_DATE, 3);
    const comingUp = `<div class="coming-up" data-coming-up>
        <h3>Coming up</h3>
        <ol>${soon.map(it => `<li><a href="#ev-${esc(c.id)}-${esc(it.event.id)}"><b>${esc(it.event.dateText)}</b> — ${esc(it.event.org)}: ${esc(it.event.title)}</a></li>`).join('') || '<li>No confirmed dates coming up.</li>'}</ol>
      </div>`;
    const isLater = c.id !== cohorts[0].id;
    const year11 = isLater && scheduleFile.year11?.length ? `<div class="year11">
        <h3>What to do in Year 11</h3>
        <ol>${scheduleFile.year11.map(y => `<li>${esc(y.text)}${y.refs.length ? ` <span class="see">See: ${y.refs.map(r => `<a href="#ev-${esc(c.id)}-${esc(r)}">${esc(evById[r].org)}</a>`).join(', ')}</span>` : ''}</li>`).join('')}</ol>
      </div>` : '';
    const anytime = isLater && scheduleFile.anytime?.length ? `<div class="anytime">
        <h3>Any time — work experience and internships</h3>
        <p class="lede">Real internships for under-18s are rare in Australia. These have no set date. Your school careers adviser can arrange work experience at almost any lab or company, and makes sure you’re safe and insured.</p>
        <ul>${scheduleFile.anytime.map(id => oppById[id]).map(o => `<li><a href="../try-it/#opp-${esc(o.id)}">${esc(o.name)}</a> — ${esc(o.provider)}. ${esc(o.how)}</li>`).join('')}</ul>
      </div>` : '';
    const afterCard = a => {
      const urls = [...new Set(a.quotes.map(q => q.url))];
      return `<li class="after-item" id="after-${esc(a.id)}">
          <h4>${esc(a.name)}</h4>
          <p class="ev-org">${esc(a.provider)}</p>
          <dl><dt>Who</dt><dd>${esc(a.who)}</dd><dt>What</dt><dd>${esc(a.what)}</dd><dt>When</dt><dd>${esc(a.when)}</dd></dl>
          <details class="fold"><summary>What their website says</summary>
            ${a.quotes.map(q => `<p class="quote">\u201c${esc(q.text)}\u201d</p>`).join('')}
            <p class="src">${urls.map((u, i) => `<a href="${esc(u)}" rel="noopener">Source${urls.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · ')} · checked ${esc(prettyDate(scheduleFile.checkedOn))}</p>
          </details>
        </li>`;
    };
    const after = isLater && scheduleFile.afterSchool?.length ? `<div class="after-school" id="after-school-${esc(c.id)}">
        <h3>After Year 12 — paid work, apprenticeships and cadetships</h3>
        <p class="lede">These pay you, and they’re for school leavers, not current students. Some fit around a uni degree; others are a job with training instead of full-time uni. Paid tech internships mostly start once you’re at uni.</p>
        <h4 class="after-h">Alongside uni — part-time and paid</h4>
        <ul class="after-list">${scheduleFile.afterSchool.filter(a => a.fitsUni).map(afterCard).join('')}</ul>
        <h4 class="after-h">Instead of full-time uni — a job with training</h4>
        <ul class="after-list">${scheduleFile.afterSchool.filter(a => !a.fitsUni).map(afterCard).join('')}</ul>
      </div>` : '';
    const groups = byMonth(items);
    const monthNav = `<nav class="month-nav" aria-label="Jump to a month">
        <h3>Jump to a month</h3>
        <ul>${groups.map(g => `<li><a href="#m-${esc(c.id)}-${esc(g.key)}">${esc(g.label)}</a> <span class="n">${g.items.length}</span></li>`).join('')}
          ${isLater && scheduleFile.afterSchool?.length ? `<li><a href="#after-school-${esc(c.id)}">After Year 12</a></li>` : ''}</ul>
      </nav>`;
    const months = groups.map(g => `<section class="month" id="m-${esc(c.id)}-${esc(g.key)}" data-month="${esc(g.key)}">
        <h3>${esc(g.label)}</h3>
        <ol class="tl">${g.items.map(it => datesEventHtml(it, c.id)).join('')}</ol>
      </section>`).join('');
    return `<section class="cohort" id="y${esc(c.id)}" data-cohort="${esc(c.id)}">
      <div class="sh"><h2>${esc(c.label)}</h2><span class="count">${esc(c.who)}</span></div>
      <div class="dates-layout">
        <aside class="dates-side" aria-label="Summary">
          ${comingUp}
          ${year11}
          ${monthNav}
        </aside>
        <div class="dates-main">
          ${months}
          ${anytime}
          ${after}
          ${notes}
        </div>
      </div>
    </section>`;
  }).join('');

  const script = `<script>
(function(){
  var today = new Date(); var t = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  document.querySelectorAll('.ev[data-kind="confirmed"]').forEach(function(li){
    var past = li.getAttribute('data-end') < t;
    li.classList.toggle('passed', past);
    var tag = li.querySelector('[data-passed]'); if (tag) tag.hidden = !past;
  });
  document.querySelectorAll('.cohort').forEach(function(sec){
    var box = sec.querySelector('[data-coming-up] ol'); if (!box) return;
    var next = Array.prototype.filter.call(sec.querySelectorAll('.ev[data-kind="confirmed"]'), function(li){ return li.getAttribute('data-end') >= t && !li.hasAttribute('data-closed'); }).slice(0,3);
    box.innerHTML = '';
    if (!next.length) { var li0 = document.createElement('li'); li0.textContent = 'No confirmed dates coming up.'; box.appendChild(li0); }
    next.forEach(function(li){
      var a = document.createElement('a'); a.href = '#' + li.id;
      var b = document.createElement('b'); b.textContent = li.getAttribute('data-datetext');
      a.appendChild(b); a.appendChild(document.createTextNode(' — ' + li.getAttribute('data-org') + ': ' + li.querySelector('h4').textContent));
      var item = document.createElement('li'); item.appendChild(a); box.appendChild(item);
    });
  });
  var buttons = document.querySelectorAll('[data-cohort]:not(section)');
  function show(id){
    document.querySelectorAll('section.cohort').forEach(function(s){ s.hidden = s.getAttribute('data-cohort') !== id; });
    buttons.forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-cohort') === id ? 'true' : 'false'); });
  }
  var start = (location.hash.match(/^#y(\\d{4})$/) || [])[1];
  if (!start || !document.getElementById('y' + start)) start = '${DEFAULT}';
  show(start);
  buttons.forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-cohort'); show(id); try { history.replaceState(null, '', '#y' + id); } catch(e){} }); });
  var active = {};
  var chips = document.querySelectorAll('[data-filter]');
  chips.forEach(function(c){ active[c.getAttribute('data-filter')] = true; });
  function filter(){
    document.querySelectorAll('.ev').forEach(function(li){ li.hidden = !active[li.getAttribute('data-section')]; });
    document.querySelectorAll('section.month').forEach(function(m){ m.hidden = !m.querySelector('.ev:not([hidden])'); });
  }
  chips.forEach(function(c){ c.addEventListener('click', function(){
    var k = c.getAttribute('data-filter'); active[k] = !active[k]; c.setAttribute('aria-pressed', active[k] ? 'true' : 'false'); filter();
  }); });
})();
</script>`;

  const body = `<main id="dates" class="dates">
    <h1>Key dates</h1>
    <p class="lede">Every date that matters on the way to uni, from early offers and open days to holiday programs, in one list. Choose the year you’ll start university.</p>
    ${switcher}
    <div class="dates-help">
      <h2 class="dates-help-h">How to read these dates</h2>
      <details class="faq"><summary>Where does each date come from?</summary><p>From the website that set it — the university, UAC or the program itself — quoted word for word. Open “What their website says” under any date to see the quote and the link. Checked ${esc(prettyDate(scheduleFile.checkedOn))}.</p></details>
      <details class="faq"><summary>What does “Last year’s date” mean?</summary><p>The new date isn’t out yet. No university had announced its 2027 rounds when we checked, so we show the 2026 date to give you a rough idea. We never guess a day.</p></details>
      <details class="faq"><summary>What does “For some students only” mean?</summary><p>The scheme is for students who meet certain equity criteria, such as living in a lower-income area or being Aboriginal or Torres Strait Islander.</p></details>
      <details class="faq"><summary>Does an early offer depend on my subjects?</summary><p>No, it’s separate from the subjects you choose. Most early offers look at your Year 11 results. We don’t predict who gets an offer.</p></details>
    </div>
    ${filters}
    ${panels}
    <p class="hint">Dates change and websites move. Check the source before you rely on a date. ${reportLine().replace(/<\/?p[^>]*>/g, '')}</p>
  </main>
  ${script}`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: `Key dates: early offers, open days and holiday programs for NSW students — ${SITE_NAME}`,
    description: 'Every early-offer, UAC, open-day and holiday-program date for NSW students starting uni in 2027 or 2028, each quoted from the university’s own website.',
    rel: '../',
    page: 'dates',
    path: '/dates/',
    body
  }));
}

function writeIndustriesPage() {
  const dir = path.join(DIST, 'industries');
  fs.mkdirSync(dir, { recursive: true });
  const shown = coursesWithOffers;
  const jump = industriesFile.industries.map(i => `<a class="chip" href="#ind-${esc(i.id)}">${esc(i.name)}</a>`).join(' ');
  const courseLink = c => `<li><a href="../course/${esc(c.id)}/">${esc(c.name)}</a> <span class="uni-s">${esc(c.university)}</span>${c.restrictedTo ? ' <span class="tag t-restrict">open to some students only</span>' : ''}</li>`;
  const sections = industriesFile.industries.map(ind => {
    const by = evidenceByEconomy(industriesFile, ind);
    const named = by.map(b => `<span class="chip on">${esc(b.economy.label)}</span>`).join(' ');
    const notNamed = industriesFile.economies.filter(e => !by.some(b => b.economy.id === e.id)).map(e => e.label);
    const quotes = by.map(b => `<div class="ev">
        <h3>${esc(b.economy.label)}</h3>
        ${b.items.map(x => `${x.source.lead ? `<p class="quote lead-q">\u201c${esc(x.source.lead)}\u201d</p><p class="quote">Listed: \u201c${esc(x.quote)}\u201d</p>` : `<p class="quote">\u201c${esc(x.quote)}\u201d</p>`}
        <p class="src">${esc(x.source.publisher)} — <a href="${esc(x.source.url)}" rel="noopener">${esc(x.source.title)}</a> · checked ${esc(x.source.checkedOn)}</p>`).join('')}
      </div>`).join('');
    const { specific, broad } = coursesForIndustry(ind, shown);
    const degrees = specific.length
      ? `<ul class="deglist">${specific.map(courseLink).join('')}</ul>`
      : `<p class="hint">No course here has this field in its name, but the broad degrees below can still lead here.</p>`;
    const broadBlock = broad.length ? `<details class="fold"><summary>Broad degrees that can lead here <span class="hint">${broad.length} courses</span></summary>
        <p class="hint">In these you pick a major later. Check the handbook has one in this field before you count on it.</p>
        <ul class="deglist">${broad.map(courseLink).join('')}</ul></details>` : '';
    return `<section class="ind" id="ind-${esc(ind.id)}">
      <div class="sh"><h2>${esc(ind.name)}</h2></div>
      <p class="named">In official plans from ${named}${notNamed.length ? ` <span class="hint">· we didn’t find it in what we read from ${esc(notNamed.join(', '))}</span>` : ''}</p>
      ${quotes}
      <h3 class="deg-h">Courses that lead here</h3>
      <p class="hint">Our best guess from each course name, not the university’s or the government’s.</p>
      ${degrees}
      ${broadBlock}
      ${tryItLine(ind.topics, '../')}
      <p><a class="btn" href="../results/#x=${esc(ind.id)}" data-industry="${esc(ind.id)}">Sort my results by this</a></p>
    </section>`;
  }).join('');
  const body = `<main id="industries" class="industries">
    <h1>Jobs of the future</h1>
    <p class="lede">These fields appear in official investment plans from ${economyList(industriesFile, 'long')}. Each quote below is the government’s own words, with a link and the date we checked it.</p>
    <ul class="trust">
      <li><b>A signal, not a promise.</b> Government money shows where jobs may grow. It doesn’t guarantee a job, and plans can change after an election.</li>
      <li><b>Missing doesn’t mean no.</b> If a country isn’t listed for a field, we didn’t find it in the documents we read. It may still be investing.</li>
      <li><b>Think long term.</b> A degree that starts in 2028 finishes around 2031 or later. Skills like maths, coding and lab work carry across all of these fields.</li>
    </ul>
    <p class="chips jump">${jump}</p>
    ${sections}
    <p class="hint">Sources checked ${esc(checkedRangeText())}. We matched every quote word for word against the original page or PDF. ${reportLine().replace(/<\/?p[^>]*>/g, '')}</p>
  </main>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: `Jobs of the future: growing fields and the courses that lead there — ${SITE_NAME}`,
    description: `${industriesFile.industries.length} growing fields that ${economyList(industriesFile)} are investing in, quoted from their official plans, and the NSW university courses that lead to each.`,
    rel: '../',
    page: 'industries',
    path: '/industries/',
    body,
    script: 'app.js'
  }));
}

function writeGuidePages() {
  const guides = [
    {
      slug: 'prerequisites',
      title: 'Do NSW degrees have subject prerequisites?',
      html: `<div class="prose">
        <h1>Do you need physics for engineering in NSW?</h1>
        <p>Almost never as a must-have. Of the six universities here, only two have a strict subject rule on the courses we list:</p>
        <ul>
          <li>The University of Sydney needs a certain <em>mark</em> in maths for Engineering (Honours), Advanced Computing and Pharmacy.</li>
          <li>Wollongong’s Bachelor of Mathematics, and its Engineering (Honours)/Mathematics double degree, need you to <em>have studied</em> Mathematics Standard 2 or equivalent, at Band 2 or higher.</li>
        </ul>
        <p>Everything else is assumed knowledge.</p>
        <div class="callout">Most NSW universities publish <b>assumed knowledge</b>. It doesn’t stop you applying. It tells you what first year will be like if you haven’t done the subject.</div>
        <p>From the 2025 intake, Sydney dropped its maths prerequisites for Commerce, Science, Medicine, Psychology, Veterinary Science and Economics. That made those courses easier to get into. It doesn’t mean maths stopped mattering.</p>
        <p>So when you’re choosing HSC subjects, don’t just ask whether a door is locked. Ask what a gap will <em>cost</em> you: a bridging course, or a harder first year.</p>
      </div>`
    },
    {
      slug: 'assumed-knowledge',
      title: 'Assumed knowledge vs prerequisites: what’s the difference?',
      html: `<div class="prose">
        <h1>Assumed knowledge vs prerequisites: what’s the difference?</h1>
        <p>Universities use three terms that sound alike but mean very different things.</p>
        <p><b>Prerequisite</b> (rare in NSW): a result you <em>must</em> reach before you can get an offer. Sydney’s maths mark for a handful of courses is one. So is Wollongong’s Mathematics Standard 2 rule for its two maths degrees.</p>
        <p><b>Assumed knowledge</b>: the university teaches as if you’ve already done that HSC subject. You can still get in, but first year may be harder, and there may be a bridging course to help you catch up.</p>
        <p><b>Recommended studies</b>: just a suggestion. It’s not assumed knowledge or a prerequisite, and we never count it as a gap.</p>
        <div class="callout">It’s easy to mix up assumed knowledge and recommended studies — we did once. Our course pages now keep them clearly apart.</div>
      </div>`
    },
    {
      slug: 'dropping-a-subject',
      title: 'What happens if you drop a subject?',
      html: `<div class="prose">
        <h1>What happens if you drop a subject?</h1>
        <p>For a typical STEM mix, dropping History changes nothing here, because engineering and science courses don’t assume it. Dropping Physics often does change things.</p>
        <p>There’s a second thing to check, which has nothing to do with universities: the rules for getting an ATAR. You need at least 10 units of Board Developed courses (the standard HSC courses), 2 units of English, three courses of 2 units or more, and subjects from four subject areas.</p>
        <p>If you take Extension 2, your Extension 1 counts as 2 units. So with Extension 2, dropping both History and Engineering Studies can still leave you with exactly 10 units and four areas. Without it, the same move can drop you to 9 units, and you wouldn’t get an ATAR.</p>
        <p>On your results page, <b>What if you dropped a subject?</b> checks every subject you’re taking, one at a time, and tells you either <em>nothing changes</em> or how many courses get harder.</p>
      </div>`
    }
  ];
  for (const g of guides) {
    const dir = path.join(DIST, 'guides', g.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), shell({
      title: g.title + ` — ${SITE_NAME}`,
      description: g.title + '. Plain-English help with HSC subject choices for NSW STEM courses.',
      rel: '../../',
      page: 'guide',
      path: `/guides/${g.slug}/`,
      body: g.html.replace(/<\/div>\s*$/, '') + `
        <p class="hint guide-more">More guides: ${guides.filter(o => o.slug !== g.slug).map(o => `<a href="../${o.slug}/">${esc(o.title)}</a>`).join(' · ')}</p>
      </div>`
    }));
  }
}

function writeAbout() {
  const info = infoSections('../');
  const dir = path.join(DIST, 'about');
  fs.mkdirSync(dir, { recursive: true });
  const unis = Object.entries(uniMeta).map(([name, m]) =>
    `<li><b>${esc(name)}</b> — rules read ${esc(prettyDate(m.capturedOn || captured))}${m.institutionRule?.source ? ` · <a href="${esc(m.institutionRule.source)}">university’s rules page</a>` : ''}</li>`
  ).join('');
  const body = `<div class="prose">
    <h1>About ${esc(SITE_NAME)}</h1>
    <p>${esc(SITE_NAME)} is a free website that helps NSW students and parents see which university STEM courses their HSC subjects prepare them for. Pick your subjects, and it shows which courses at six universities you’re ready for, what you’d need to catch up on, and some courses you may never have heard of.</p>
    <p>It’s not UAC or a university, and it doesn’t predict ATARs or offers. Always check UAC and the university’s website before you apply.</p>
    <h2>Who built this</h2>
    <div class="builder">
      <img class="builder-photo" src="../img/ajay-walia.jpg" width="240" height="240" alt="Ajay Walia, looking out over a misty Sydney suburb" loading="lazy">
      <div class="builder-text">
      <p>I’m <b>Ajay Walia</b>, a Sydney parent with more than 25 years in technology. I started as an educator, teaching software engineering, and today I work on technology transition and transformation.</p>
      <p>I built ${esc(SITE_NAME)} while helping my own child choose HSC subjects. The facts a family needs were scattered across six university websites, UAC and NESA, and most advice answered “can I get in?” when the real question was “what does this choice cost me?”. So every rule here is the university’s own wording, with a link and the date we checked it.</p>
      <p>This is a personal, independent project — not connected with my employer, UAC or any university. I write about technology and AI at <a href="https://curiousbit.netlify.app/" rel="noopener">CuriousBit</a>, and you can find me on <a href="https://www.linkedin.com/in/ajay-walia-8b066a1b/" rel="noopener">LinkedIn</a>.</p>
      </div>
    </div>
    <h2 id="privacy">Privacy</h2>
    <p>There’s no account, and nothing about you is stored on a server. Your subjects are kept in the part of the results link after the <span class="mono">#</span>, which browsers never send to a website. That’s why you can share the link (with a careers adviser, say) without us ever seeing your subjects.</p>
    <p>The only things the site saves on your device are your theme (dark or light) and, in dark, the colour you picked. They never leave your device, they aren’t in the shared link, and clearing your browser data removes them.</p>
    <h2 id="how">How your results are worked out</h2>
    <p>Your results are worked out on your own device by a fixed set of rules, the same ones our automated tests check. The same subjects always give the same result, and no AI is involved. The dates below show when we last read each university’s rules.</p>
    ${ASK_ENDPOINT ? `<h2>The Ask assistant</h2>
    <p>Ask is the only part of the site that uses AI, and the only exception to the privacy promise above. Nothing is sent until you open it, tick the box and press Send. Then your question (not your subjects) goes to our server. It finds the matching facts on this site and sends just those facts and your question to ${esc(ASK_PROVIDER)} to write a short answer. Neither this site nor its server keeps your question.</p>
    <p>The AI may only use those facts, and must link each one. If it doesn’t, or if it tries to predict an ATAR or an offer, you get links to the matching pages instead. It can still get things wrong, so open the link before you rely on an answer.</p>` : ''}
    <ul>${unis}</ul>
    <p>${courses.length} courses in all. We last read the rules on ${esc(prettyDate(captured))}, and re-checked every fact against the university’s live website on ${esc(prettyDate(recheck.checkedOn))}.</p>
    ${reportLine()}
  </div>
  <div class="about-more">
    ${info.who}
    ${info.faq}
    ${info.sources}
  </div>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: `About — ${SITE_NAME}`,
    description: `Who built ${SITE_NAME}, how it works, and how your privacy is protected: your subjects never leave your device.`,
    rel: '../',
    page: 'about',
    path: '/about/',
    body
  }));
}

const protoSize = writePrototype();
writeSite();
const distFiles = [];
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else distFiles.push(p);
  }
};
walk(DIST);
console.log('built ui/prototype.html  ' + (protoSize / 1024).toFixed(0) + ' KB');
console.log('built dist/  ' + distFiles.length + ' files');
console.log('  courses  ' + courses.length);
console.log('  uncommon names (1 of 6 universities): ' + uncommonIds(coursesWithOffers).length);
console.log('  discovery entries shipped (reviewed): ' + discovery.length);
console.log('  captured ' + captured);
