#!/usr/bin/env node
// Builds the prototype and the production static site.
// Inlines the REAL engine source — not a reimplementation — so the site runs
// the same code the tests exercise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseDescription, courseTitleText, prettyDate } from './meta.js';
import { schemesForUniversity } from './early-entry.js';
import { attachOfferCount, uncommonIds } from '../pipeline/familiarity.js';
import { validateDiscovery } from '../pipeline/discovery.js';
import { validateIndustries, evidenceByEconomy } from '../pipeline/industries.js';
import { TOPIC_IDS, TOPICS, QUIZ, coursesForIndustry } from './topics.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function stripModule(src) {
  return src
    .replace(/^import .*$/gm, '')
    .replace(/^export /gm, '');
}

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
  return '';
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
  return `<p class="hint">Think a rule here is wrong? Tell us — <a href="${esc(issuesUrl())}">open an issue</a>.</p>`;
}

const THEME_BOOT = `<script>try{var t=localStorage.getItem('oty-theme');if(t==='light'||t==='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>`;
const THEME_UI = `<div class="theme" role="group" aria-label="Colour theme">
        <button type="button" data-theme-set="dark">Dark</button>
        <button type="button" data-theme-set="light">Light</button>
        <button type="button" data-theme-set="system">Match my system</button>
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
  var t='dark';
  try{ t=localStorage.getItem('oty-theme')||'dark'; }catch(e){}
  document.querySelectorAll('[data-theme-set]').forEach(function(b){
    b.addEventListener('click', function(){ apply(b.getAttribute('data-theme-set')); });
  });
  apply(t);
})();
</script>`;

function shell({ title, description, rel, page, body, script, noindex = false, path: pagePath = '/' }) {
  const desc = description || 'NSW STEM readiness planner. Enter HSC subjects; see which degrees you are prepared for, and what any gap costs.';
  const url = absUrl(pagePath);
  const robots = noindex ? `<meta name="robots" content="noindex">\n` : '';
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" data-oty content="#0C1119">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0C1119">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#EEF2F6">
${robots}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
${THEME_BOOT}
<link rel="stylesheet" href="${rel}site.css">
</head>
<body data-page="${esc(page)}" data-base="${esc(rel)}">
<div class="shell">
  <header class="top">
    <div class="brandline">
      <div class="brand"><a href="${rel}"><h1>Open To You</h1></a></div>
      <nav class="topnav" aria-label="Site">
        <a href="${rel}#picker">Subjects</a>
        <a href="${rel}quiz/">Quiz</a>
        <a href="${rel}industries/">Industries</a>
        <a href="${rel}results/">Results</a>
        <a href="${rel}guides/assumed-knowledge/">Assumed knowledge</a>
        <a href="${rel}about/">About</a>
        ${THEME_UI}
      </nav>
    </div>
  </header>
  ${body}
  <footer class="foot" id="foot">
    <p>Not UAC and not a university. Rules as at ${esc(captured)}. Confirm every preference on UAC and the university handbook before you apply.</p>
  </footer>
</div>
${script ? `<script src="${rel}${script}" defer></script>` : ''}
${THEME_BIND}
</body>
</html>
`;
}

function writePrototype() {
  const tpl = read('ui/prototype.template.html');
  const out = tpl.replace('/*__ENGINE__*/', enginePayload);
  fs.writeFileSync(path.join(ROOT, 'ui/prototype.html'), out);
  return out.length;
}

function writeSite() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
  fs.writeFileSync(path.join(DIST, 'site.css'), read('ui/site.css'));
  const fontSrc = path.join(ROOT, 'ui/fonts');
  const fontDst = path.join(DIST, 'fonts');
  fs.mkdirSync(fontDst, { recursive: true });
  for (const f of fs.readdirSync(fontSrc).filter(n => n.endsWith('.woff2')))
    fs.copyFileSync(path.join(fontSrc, f), path.join(fontDst, f));
  const app = read('ui/site.js')
    .replace('/*__HASH__*/', hash)
    .replace('/*__EARLY__*/', earlyEntryHelpers)
    .replace('/*__COMPARE__*/', compareHelpers)
    .replace('/*__CLASSIFY__*/', classifyHelpers)
    .replace('/*__TOPICS__*/', topicHelpers)
    .replace('/*__ENGINE__*/', enginePayload);
  fs.writeFileSync(path.join(DIST, 'app.js'), app);

  const homeBody = `
    <section class="doors" aria-label="Ways in">
      <h2 class="doors-h">Three ways in. Use one, or put them together.</h2>
      <div class="door-grid">
        <a class="door" href="#picker" data-door="subjects">
          <span class="door-n">1</span>
          <span class="door-t">Start with my subjects</span>
          <span class="door-d">Pick your HSC subjects. See which degrees you are ready for, and what a gap would cost.</span>
        </a>
        <a class="door" href="quiz/" data-door="quiz">
          <span class="door-n">2</span>
          <span class="door-t">What do I enjoy?</span>
          <span class="door-d">Ten quick this-or-that picks. They sort degrees by interest. They never hide one.</span>
        </a>
        <a class="door" href="industries/" data-door="industries">
          <span class="door-n">3</span>
          <span class="door-t">Where is the world investing?</span>
          <span class="door-d">${industriesFile.industries.length} areas named in official plans by Australia, the US, the EU, the UK, China and India — quoted word for word.</span>
        </a>
      </div>
      <p class="doors-now" id="doors-now" hidden></p>
    </section>
    <div class="home-intro" id="subjects-intro">
      <p class="lead">Tell us what you are studying. We check it against every STEM degree at six NSW universities and show you which ones you are ready for, which have a gap, and what closing that gap would take.</p>
      <ul class="trust">
        <li><b>Independent.</b> We are not UAC and not a university. Nobody pays to appear here.</li>
        <li><b>Quoted, not summarised.</b> Every requirement is the university’s own wording, with the date we read it.</li>
        <li><b>Private by design.</b> The calculation happens on your device. Your subjects stay in the address hash — they are never sent to a server, and there is no account.</li>
        <li><b>Not the last word.</b> Rules change. Check UAC before you submit preferences.</li>
      </ul>
    </div>
    <form class="picker" id="picker" aria-label="Your subjects" data-mode="steps"></form>
  `;
  const homeDesc = 'Enter HSC subjects and see which NSW STEM degrees you are prepared for, what any gap costs, and which ones you had never heard of.';
  fs.writeFileSync(path.join(DIST, 'index.html'), shell({
    title: 'Open To You — NSW STEM subject planner',
    description: homeDesc,
    rel: '',
    page: 'home',
    path: '/',
    body: homeBody,
    script: 'app.js'
  }));

  fs.mkdirSync(path.join(DIST, 'results'));
  fs.writeFileSync(path.join(DIST, 'results/index.html'), shell({
    title: 'Your results — Open To You',
    description: "Choose your HSC subjects to see which NSW STEM degrees are open to you. Results live in the URL hash and are never sent to a server.",
    rel: '../',
    page: 'results',
    path: '/results/',
    noindex: true,
    body: `<main id="results" aria-live="polite">
      <p class="lede">Choose your subjects to see what's open to you.</p>
      <p><a class="btn" href="../" style="display:inline-block;text-decoration:none">Choose your subjects</a></p>
    </main>`,
    script: 'app.js'
  }));

  for (const c of coursesWithOffers) writeCoursePage(c);
  writeQuizPage();
  writeIndustriesPage();

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
    { path: '/about/', lastmod: captured },
    { path: '/quiz/', lastmod: captured },
    { path: '/industries/', lastmod: industriesFile.capturedOn },
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
  if (!url) return date ? `<span class="item-meta">Captured ${esc(date)}</span>` : '';
  return `<p class="item-meta"><a href="${esc(url)}" rel="noopener">Source</a>${date ? ' · captured ' + esc(date) : ''}</p>`;
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
    <p class="kicker">${esc(c.university)} · ${esc(c.field || '')}</p>
    <h1>${esc(c.name)}</h1>
    <p class="lede">Not UAC and not a university. Rules as at ${esc(prettyDate(date))}. Confirm the handbook before you apply.</p>
    ${c.notEntryPoint ? '' : '<p><a id="prepared" href="../../results/">Am I prepared for this?</a></p>'}
    ${reportLine()}
  </article>`;

  // Who may apply at all, above everything about subjects. This page is the site's
  // indexed surface: a student arriving from a search engine reads it before they have
  // read anything else, and without this it said "no assumed knowledge listed" and
  // stopped — technically true, and the most misleading arrangement of the facts.
  if (c.restrictedTo) {
    body += `<section class="restricted"><h3>Who can apply</h3>
      <p class="restrict"><b>Only open to ${esc(c.restrictedTo.who)}.</b> This is decided by the university's admission rule, not by your subjects. Everything below describes the subject background only.</p>
      ${c.restrictedTo.quote ? `<p class="item-quote">\u201c${esc(String(c.restrictedTo.quote).replace(/\s+/g, ' ').trim())}\u201d</p>` : ''}
      ${sourceLink(c.restrictedTo.source || c.source, date)}
    </section>`;
  }

  if (c.notEntryPoint) {
    body += `<section class="restricted"><h3>Who can start this</h3>
      <p class="restrict"><b>Not a course you start straight from school.</b> It is for ${esc(c.notEntryPoint.who)}, so it is not listed in anyone's results. Everything below describes the subject background only.</p>
      <p class="item-quote">\u201c${esc(String(c.notEntryPoint.quote).replace(/\s+/g, ' ').trim())}\u201d</p>
      ${sourceLink(c.notEntryPoint.source || c.source, date)}
    </section>`;
  }

  if (schemesForUniversity(c.university, earlyEntryFile).length) {
    body += `<p class="lede"><a id="early-entry-link" href="../../results/#early-entry">This university may admit you before the ATAR.</a> That is a separate process from the subject background below.</p>`;
  }

  body += `<section class="ak"><h3>Assumed knowledge</h3>
    <p class="lede">Assumed knowledge does not block admission. It is what the university expects you to have already studied.</p>`;
  if (!ak.length) body += `<p>No assumed knowledge listed on the captured page.</p>`;
  ak.forEach(a => {
    body += `<div>
      <p><b>${esc(a.subject)}</b>${a.minBand != null ? ` · minimum band ${esc(a.minBand)}` : ''}</p>
      ${a.quote ? `<p class="item-quote">“${esc(a.quote)}”</p>` : ''}
      ${sourceLink(a.source || c.source, date)}
    </div>`;
  });
  body += `</section>`;

  body += `<section class="rec"><h3>Recommended studies — not assumed knowledge</h3>
    <p class="lede">Recommended studies are a suggestion. They are not a requirement and they do not change the ready / gap result.</p>`;
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
    body += `<section class="gate"><h3>Hard mark rule</h3>
      <p class="lede">This is a published mark requirement, not a subject ban. It is the rare NSW case that can actually block an offer.</p>`;
    gate.forEach(g => {
      body += `<p class="item-quote">“${esc(g.quote)}”</p>${sourceLink(g.source, date)}`;
    });
    body += `</section>`;
  }

  if (hurdles.length) {
    body += `<section class="hurdle"><h3>Extra requirements</h3>
      <p class="lede">These are flags, not readiness bands. They do not change whether the subject background is enough.</p><ul>`;
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
      <h3>What this is like — written by this site, not the university</h3>
      <p class="lede">This is a description, not a rule. The quoted assumed knowledge above is the verified version.</p>
      <p>${esc(disc.firstYear)}</p>
      <p>${esc(disc.notThis)}</p>
      <p class="item-meta">Drafted ${esc(disc.draftedBy || '')}. Reviewed ${esc(disc.reviewedOn || '')}.</p>
    </section>`;
  }

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
    <h1>What do I enjoy?</h1>
    <p class="lede">Ten quick picks. Choose the one that sounds more fun — there is no right answer, and you can skip any.</p>
    <p class="hint">This sorts degrees by interest. It never hides a degree and it never changes whether you are ready for one. Your answers stay on this page; only your top three areas go in the address, after the #, which is never sent to a server.</p>
    <ol class="quiz-static">${items}</ol>
    <noscript><p class="hint">The picks need JavaScript. Every degree is still listed on the results page.</p></noscript>
  </main>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: 'What do I enjoy? A ten-question interest quiz — Open To You',
    description: 'Ten this-or-that picks that sort NSW STEM degrees by what you enjoy. Sorts, never hides. Nothing is sent to a server.',
    rel: '../',
    page: 'quiz',
    path: '/quiz/',
    body,
    script: 'app.js'
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
      : `<p class="hint">No degree in this planner names this area. The broad degrees below can still lead here.</p>`;
    const broadBlock = broad.length ? `<details class="fold"><summary>Broad degrees that keep this open <span class="hint">${broad.length} courses</span></summary>
        <p class="hint">You choose a major later in these. Check the handbook offers one in this area before you count on it.</p>
        <ul class="deglist">${broad.map(courseLink).join('')}</ul></details>` : '';
    return `<section class="ind" id="ind-${esc(ind.id)}">
      <div class="sh"><h2>${esc(ind.name)}</h2></div>
      <p class="named">Named in official plans by ${named}${notNamed.length ? ` <span class="hint">· not found in what we read for ${esc(notNamed.join(', '))}</span>` : ''}</p>
      ${quotes}
      <h3 class="deg-h">Degrees that can lead here</h3>
      <p class="hint">Our judgement, from each degree’s name — not the university’s or the government’s.</p>
      ${degrees}
      ${broadBlock}
      <p><a class="btn" href="../results/#x=${esc(ind.id)}" data-industry="${esc(ind.id)}">Sort my results by this</a></p>
    </section>`;
  }).join('');
  const body = `<main id="industries" class="industries">
    <h1>Where is the world investing?</h1>
    <p class="lede">These areas are named in official plans by Australia, the United States, the European Union, the United Kingdom, China and India. Every quote below is the government’s own words, with a link and the date we checked it.</p>
    <ul class="trust">
      <li><b>A signal, not a promise.</b> Government money shows where jobs may grow. It does not guarantee a job, and plans change after elections.</li>
      <li><b>Missing is not “no”.</b> If a country is not listed for an area, we did not find it in the documents we read. It may still be investing.</li>
      <li><b>Think in decades.</b> A degree that starts in 2028 finishes around 2031 or later. Broad skills — maths, coding, lab work — travel between these areas.</li>
    </ul>
    <p class="chips jump">${jump}</p>
    ${sections}
    <p class="hint">Sources checked ${esc(industriesFile.capturedOn)}. Each quote was matched word for word against the page or PDF by code. ${reportLine().replace(/<\/?p[^>]*>/g, '')}</p>
  </main>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: 'Where is the world investing? Future industries and the degrees that lead there — Open To You',
    description: `${industriesFile.industries.length} areas that Australia, the US, the EU, the UK, China and India name in official plans — quoted word for word — and the NSW STEM degrees that can lead into each.`,
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
        <p>Almost never as a gate. Of the six universities this planner covers, only the University of Sydney has hard subject rules, and only for Engineering (Honours), Advanced Computing and Pharmacy. That rule is a <em>mark</em> in mathematics, not a required subject list.</p>
        <div class="callout">NSW universities mostly publish <b>assumed knowledge</b>. That does not stop you applying. It tells you what first year will feel like if you have not done the subject.</div>
        <p>Sydney dropped mathematics prerequisites for Commerce, Science, Medicine, Psychology, Veterinary Science and Economics from the 2025 intake. That was an access decision, not a claim that mathematics stopped mattering.</p>
        <p>If you are choosing HSC subjects, ask what a gap <em>costs</em> — a bridging course, a harder first year — not whether a door is locked.</p>
      </div>`
    },
    {
      slug: 'assumed-knowledge',
      title: 'Assumed knowledge is not a prerequisite',
      html: `<div class="prose">
        <h1>Assumed knowledge is not a prerequisite</h1>
        <p><b>Prerequisite</b> (rare in NSW): you must have reached a published standard before an offer. Sydney’s mathematics mark for a handful of degrees is this.</p>
        <p><b>Assumed knowledge</b>: the university will teach as if you already did that HSC subject. You can still get in. You may find first year harder, and a bridging course may be offered.</p>
        <p><b>Recommended studies</b>: a suggestion. It is not assumed knowledge and it is not a prerequisite. This planner never treats recommended studies as a gap.</p>
        <div class="callout">We have mixed those two columns before. The course pages now keep them apart on purpose.</div>
      </div>`
    },
    {
      slug: 'dropping-a-subject',
      title: 'What happens if you drop a subject?',
      html: `<div class="prose">
        <h1>What happens if you drop a subject?</h1>
        <p>For a typical STEM set, dropping History changes nothing in this planner. History was never load-bearing for engineering or science assumed knowledge. Dropping Physics often is.</p>
        <p>There is a second cost that is not about universities at all: the ATAR pattern. You need at least 10 units of Board Developed courses, 2 units of English, three courses of 2 units or more, and four subject areas.</p>
        <p>Extension 2 recounts Extension 1 as 2 units. With Extension 2, dropping both History and Engineering Studies can still land on exactly 10 units and four areas. Without it, the same drop can fall to 9 units and fail the ATAR floor.</p>
        <p>The results page re-runs the catalogue once per subject you currently hold and says <em>nothing changes</em> or <em>N courses worse</em>.</p>
      </div>`
    }
  ];
  for (const g of guides) {
    const dir = path.join(DIST, 'guides', g.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), shell({
      title: g.title + ' — Open To You',
      description: g.title + '. Independent NSW STEM subject guidance — not UAC, not a university.',
      rel: '../../',
      page: 'guide',
      path: `/guides/${g.slug}/`,
      body: g.html
    }));
  }
}

function writeAbout() {
  const dir = path.join(DIST, 'about');
  fs.mkdirSync(dir, { recursive: true });
  const unis = Object.entries(uniMeta).map(([name, m]) =>
    `<li><b>${esc(name)}</b> — rules captured ${esc(m.capturedOn || captured)}${m.institutionRule?.source ? ` · <a href="${esc(m.institutionRule.source)}">institution source</a>` : ''}</li>`
  ).join('');
  const body = `<div class="prose">
    <h1>About this planner</h1>
    <p>Open To You is a public NSW STEM readiness planner. A student enters HSC subjects; the tool returns which STEM degrees across six universities they are prepared for, what a gap costs, and which degrees they had probably never heard of.</p>
    <p>It is not UAC and not a university. It does not predict an ATAR or an offer. Confirm every preference on UAC and the handbook before you apply.</p>
    <h2>Privacy</h2>
    <p>There is no account and no server-side profile. Your subject list lives in the <b>hash fragment</b> of the results URL — the part after <span class="mono">#</span>. Browsers do not send that fragment to the server. That is why the address is shareable (a careers adviser can paste it) without our logs ever seeing your subjects. The only thing this site keeps in the browser is your colour-theme choice (<span class="mono">oty-theme</span>); it never leaves the device, it is not in the shareable link, and clearing site data removes it.</p>
    <h2>How the answers are made</h2>
    <p>The same JavaScript engine the test suite runs is inlined into this site. Same subjects in, same result out. No model is called when you click. Capture dates below are when we last read each university’s published rules.</p>
    <ul>${unis}</ul>
    <p>${courses.length} course records. Last capture in this build: ${esc(captured)}.</p>
    ${reportLine()}
  </div>`;
  fs.writeFileSync(path.join(dir, 'index.html'), shell({
    title: 'About — Open To You',
    description: 'Who built Open To You, how the answers are made, capture dates, and the privacy claim: your subjects never leave the browser.',
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
