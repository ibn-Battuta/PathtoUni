#!/usr/bin/env node
// Builds the prototype and the production static site.
// Inlines the REAL engine source — not a reimplementation — so the site runs
// the same code the tests exercise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseDescription, courseTitleText, prettyDate } from './meta.js';

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
      nameRecognition: c.nameRecognition ?? null,
      verification: c.verification ?? 'unverified',
      capturedOn: c.capturedOn ?? uni.capturedOn,
      source: c.source ?? uni.institutionRule?.source ?? null,
      _completeness: c._completeness,
      _bridging: uni.bridging
    });
  }
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
const CATALOGUE = ${JSON.stringify(courses)};
const GATES = ${JSON.stringify(gates)};
const CAPTURED_ON = ${JSON.stringify(captured)};
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
${robots}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${rel}site.css">
</head>
<body data-page="${esc(page)}" data-base="${esc(rel)}">
<div class="shell">
  <header class="top">
    <div class="brandline">
      <div class="brand"><a href="${rel}"><h1>Open To You</h1></a></div>
      <nav class="topnav" aria-label="Site">
        <a href="${rel}">Subjects</a>
        <a href="${rel}results/">Results</a>
        <a href="${rel}guides/assumed-knowledge/">Assumed knowledge</a>
        <a href="${rel}about/">About</a>
      </nav>
    </div>
  </header>
  ${body}
  <footer class="foot" id="foot">
    <p>Not UAC and not a university. Rules as at ${esc(captured)}. Confirm every preference on UAC and the university handbook before you apply.</p>
  </footer>
</div>
${script ? `<script src="${rel}${script}" defer></script>` : ''}
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
    .replace('/*__ENGINE__*/', enginePayload);
  fs.writeFileSync(path.join(DIST, 'app.js'), app);

  const homeBody = `
    <p class="lead">Tell us what you are studying. We check it against every STEM degree at six NSW universities and show you which ones you are ready for, which have a gap, and what closing that gap would take.</p>
    <ul class="trust">
      <li><b>Independent.</b> We are not UAC and not a university. Nobody pays to appear here.</li>
      <li><b>Quoted, not summarised.</b> Every requirement is the university’s own wording, with the date we read it.</li>
      <li><b>Private by design.</b> The calculation happens on your device. Your subjects stay in the address hash — they are never sent to a server, and there is no account.</li>
      <li><b>Not the last word.</b> Rules change. Check UAC before you submit preferences.</li>
    </ul>
    <form class="picker" id="picker" aria-label="Your subjects" data-mode="steps" style="margin-top:1.25rem"></form>
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

  for (const c of courses) writeCoursePage(c);

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
    <p><a id="prepared" href="../../results/">Am I prepared for this?</a></p>
    ${reportLine()}
  </article>`;

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
      const t = typeof h === 'string' ? h : (h.type || JSON.stringify(h));
      body += `<li>${esc(t)}</li>`;
    });
    body += `</ul></section>`;
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
    <p>There is no account and no server-side profile. Your subject list lives in the <b>hash fragment</b> of the results URL — the part after <span class="mono">#</span>. Browsers do not send that fragment to the server. That is why the address is shareable (a careers adviser can paste it) without our logs ever seeing your subjects.</p>
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
console.log('  captured ' + captured);
