import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureSource } from '../pipeline/capture.js';
import { htmlToText } from '../pipeline/render.js';
import {
  extractCoursePage, extractHtmlCourses, discoverCourseLinks, discoverSitemapLocs,
  splitRecommended, isStemUrl, courseTitle, parseAssumedEntries
} from '../pipeline/html-course.js';
import { AK_PHRASES, auditCourse } from '../pipeline/completeness.js';
import { diffExtract, mergeCatalogue, isRepair } from '../pipeline/diff.js';
import { UTS_COURSES, MQ_COURSES, UNSW_COURSES } from '../pipeline/sources.js';

const UTS_HTML = `
<html><head><title>Bachelor of Computing Science – Advanced Tech | UTS</title></head>
<body>
<h1>Bachelor of Computing Science</h1>
<span class="accordion__headline">Assumed knowledge</span>
<div class="wysiwyg-user-content-output">
<p>HSC Mathematics Advanced and any two units of English. Mathematics Extension 1 and English Advanced are recommended.</p>
</div>
</body></html>`;

const MQ_HTML = `
<html><head><title>Bachelor of Engineering (Honours) | Macquarie University Sydney</title></head>
<body>
<h1>Bachelor of Engineering (Honours)</h1>
<h4>Assumed knowledge</h4>
<p>HSC Mathematics Advanced (Band 4) or equivalent. If you don't have the assumed knowledge, you're advised to undertake a bridging course in mathematics.</p>
<h4>Recommended studies</h4>
<p>HSC Mathematics Extension 1 or HSC Mathematics Extension 2 plus HSC Physics, or equivalent.</p>
</body></html>`;

const WSU_HTML = `
<html><head><title>Bachelor of Engineering (Honours) | Western Sydney University</title></head>
<body>
<h1>Bachelor of Engineering (Honours)</h1>
<ul>
<li>Recommended studies: Physics and HSC Mathematics Extension 1 or HSC Mathematics Extension 2.</li>
<li>Assumed knowledge required: Two subjects of Science, two subjects of English and Mathematics (not General Mathematics) at Band 5 or higher.</li>
</ul>
</body></html>`;

const UNSW_ENG_HTML = `
<html><head><title>Bachelor of Engineering (Honours) | UNSW Sydney</title></head>
<body>
<h1>Bachelor of Engineering (Honours)</h1>
<h3>Assumed knowledge</h3>
<p>Mathematics Extension 1, Physics.</p>
<h3>Adjustment Factors</h3>
<p>Biology is mentioned here only as noise.</p>
</body></html>`;

const UNSW_MED_HTML = `
<html><head><title>Bachelor of Medical Science | UNSW Sydney</title></head>
<body>
<h1>Bachelor of Medical Science</h1>
<h3>Assumed knowledge</h3>
<p>Chemistry, Mathematics Advanced.</p>
<p>Recommended studies: Biology.</p>
</body></html>`;

const UOW_HTML = `
<html><head><title>Bachelor of Engineering (Honours) - Bachelor of Mathematics - University of Wollongong – UOW</title></head>
<body>
<h1>Bachelor of Engineering (Honours) - Bachelor of Mathematics</h1>
<p><strong>Prerequisite</strong><br />Students must have studied the equivalent of <strong>NSW HSC</strong> <strong>Mathematics Standard 2</strong> (minimum Band 2) to be admitted into this degree.</p>
<p><strong>Assumed Knowledge</strong><br />UOW assumes students will have studied any <strong>two units of NSW HSC English</strong> and <strong>NSW HSC</strong> <strong>Mathematics Advanced</strong>, or equivalent.</p>
<p><strong>Recommended Studies</strong><br />Ideally, students will have studied <strong>NSW HSC</strong> <strong>Mathematics Extension 1</strong>, <strong>NSW HSC</strong> <strong>Engineering Studies</strong>, <strong>NSW HSC</strong> <strong>Physics</strong>.</p>
</body></html>`;

function page(url, html) {
  return { url, html, text: htmlToText(html), failed: false, slug: 'x' };
}

test('htmlToText strips scripts and keeps assumed-knowledge sentences', () => {
  const t = htmlToText('<script>hide()</script><p>Assumed knowledge</p><p>Mathematics Advanced</p>');
  assert.equal(t.includes('hide()'), false);
  assert.match(t, /Assumed knowledge/);
  assert.match(t, /Mathematics Advanced/);
});

test('UTS accordion: assumed Advanced; recommended Ext 1 — quotes are literal', () => {
  const rec = extractCoursePage({
    html: UTS_HTML, text: htmlToText(UTS_HTML),
    url: 'https://www.uts.edu.au/courses/bachelor-of-computing-science',
    source: UTS_COURSES, capturedOn: '2026-08-27'
  });
  assert.equal(rec.verification, 'verified');
  const assumed = rec.assumedKnowledge.map(a => a.subject).sort();
  assert.deepEqual(assumed, ['English Standard', 'Mathematics Advanced']);
  assert.ok(rec.recommendedStudies.some(r => r.subject === 'Mathematics Extension 1'));
  assert.ok(rec.assumedKnowledge.every(a => UTS_HTML.includes(a.quote) || htmlToText(UTS_HTML).includes(a.quote)));
  assert.equal(rec.field, 'computing');
});

test('Macquarie headings: Band 4 Advanced assumed, Ext 1 / Physics recommended', () => {
  const rec = extractCoursePage({
    html: MQ_HTML, text: htmlToText(MQ_HTML),
    url: MQ_COURSES.courses[0], source: MQ_COURSES, capturedOn: '2026-08-27'
  });
  assert.equal(rec.verification, 'verified');
  const math = rec.assumedKnowledge.find(a => a.subject === 'Mathematics Advanced');
  assert.ok(math);
  assert.equal(math.minBand, 4);
  assert.ok(rec.recommendedStudies.some(r => r.subject === 'Physics'));
  assert.ok(MQ_HTML.includes(math.quote));
});

test('WSU: keeps English, Science and Mathematics, and carries Band 5 onto the maths entry', () => {
  const rec = extractCoursePage({
    html: WSU_HTML, text: htmlToText(WSU_HTML),
    url: 'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours',
    source: { prefix: 'wsu' }, capturedOn: '2026-08-27'
  });
  assert.equal(rec.verification, 'verified');
  const math = rec.assumedKnowledge.find(a => a.subject === 'Mathematics Advanced');
  assert.ok(math);
  assert.equal(math.minBand, 5);
  assert.ok(WSU_HTML.includes(math.quote) || math.quote.includes('not General'));
  assert.ok(rec.assumedKnowledge.some(a => a.subject === 'English Standard'));
  assert.ok(rec.assumedKnowledge.some(a => a.subject === 'any two units of Science'));
  // unnamed "two subjects of Science" must not become Physics+Chemistry+Biology
  assert.equal(rec.assumedKnowledge.some(a => a.subject === 'Physics'), false);
  assert.equal(rec._completeness, undefined);
});

test('UOW: assumed Advanced; recommended Ext 1, Engineering Studies, Physics; Standard 2 is the published prerequisite text', () => {
  const rec = extractCoursePage({
    html: UOW_HTML, text: htmlToText(UOW_HTML),
    url: 'https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/',
    source: { prefix: 'uow' }, capturedOn: '2026-08-27'
  });
  assert.ok(rec.assumedKnowledge.some(a => a.subject === 'Mathematics Advanced'));
  assert.ok(rec.assumedKnowledge.some(a => a.subject === 'English Standard'));
  assert.ok(rec.recommendedStudies.some(r => r.subject === 'Mathematics Extension 1'));
  assert.ok(rec.recommendedStudies.some(r => r.subject === 'Physics'));
  assert.match(rec.raw.prereq, /Mathematics Standard 2/);
  assert.deepEqual(rec.hardRules, []); // engine has no UOW gate yet; do not invent one
});

test('splitRecommended peels the UTS combined sentence', () => {
  const s = splitRecommended('HSC Mathematics Advanced and any two units of English. Mathematics Extension 1 and English Advanced are recommended.');
  assert.match(s.assumed, /Mathematics Advanced/);
  assert.match(s.recommended, /are recommended/);
});

test('discoverCourseLinks keeps same-host bachelor slugs', () => {
  const html = '<a href="/future/study/courses/undergraduate/bachelor-of-science">S</a><a href="https://example.com/bachelor-of-science">x</a>';
  const links = discoverCourseLinks(
    html,
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate',
    /\/bachelor-of-/
  );
  assert.ok(links.some(l => l.endsWith('bachelor-of-science')));
  assert.equal(links.some(l => l.includes('example.com')), false);
});

test('STEM slug filter keeps engineering and drops standalone arts/law', () => {
  assert.equal(isStemUrl('https://x/bachelor-of-engineering-honours'), true);
  assert.equal(isStemUrl('https://x/bachelor-of-arts'), false);
  assert.equal(isStemUrl('https://x/bachelor-of-science-and-bachelor-of-laws'), true);
  assert.equal(isStemUrl('https://x/bachelor-of-arts-bachelor-of-social-science'), false);
});

test('HTML capture uses the headless renderer — never GET', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ptu-html-'));
  let fetched = false;
  const html = UTS_HTML;
  const cap = await captureSource(
    { ...UTS_COURSES, listingUrl: null, courses: ['https://www.uts.edu.au/courses/bachelor-of-computing-science'] },
    {
      root: tmp,
      capturedOn: '2026-08-27',
      force: true,
      delayMs: 0,
      fetchImpl: async () => { fetched = true; return { ok: true, arrayBuffer: async () => Buffer.from('nope') }; },
      renderImpl: async url => ({ html, text: htmlToText(html) })
    }
  );
  assert.equal(fetched, false);
  assert.equal(cap.pages.length, 1);
  assert.ok(cap.pages[0].html.includes('Assumed knowledge'));
  assert.ok(fs.existsSync(path.join(cap.dir, 'pages', cap.pages[0].slug, 'source.html')));
});

test('extract + apply fills an empty university file without touching unverified rows', () => {
  const extract = extractHtmlCourses({
    pages: [page(UTS_COURSES.courses[0], UTS_HTML)],
    source: UTS_COURSES,
    capturedOn: '2026-08-27'
  });
  assert.equal(extract.verified, 1);
  const uni = { university: 'University of Technology Sydney', courses: [] };
  const diff = diffExtract(extract, uni.courses);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.stops, false);
  const merged = mergeCatalogue(uni, extract, diff, { apply: true });
  assert.equal(merged.courses.length, 1);
  assert.equal(merged.courses[0].verification, 'verified');
  assert.ok(merged.courses[0].assumedKnowledge[0].source.startsWith('https://'));
});

test('courseTitle prefers the Bachelor h1 over skip-to-content', () => {
  const html = '<h1>Skip to main content</h1><h1>Bachelor of Nursing</h1>';
  assert.equal(courseTitle(html), 'Bachelor of Nursing');
});

test('all six assumed-knowledge phrasings are registered', () => {
  assert.equal(AK_PHRASES.length, 6);
  assert.ok(AK_PHRASES.some(r => r.source.includes('assumes students will have')));
});

test('parseAssumedEntries keeps every subject and carries Band 5 onto Mathematics', () => {
  const items = parseAssumedEntries(
    'Two subjects of Science, two subjects of English and Mathematics (not General Mathematics) at Band 5 or higher.'
  );
  const by = Object.fromEntries(items.map(i => [i.subject, i]));
  assert.ok(by['Mathematics Advanced']);
  assert.equal(by['Mathematics Advanced'].minBand, 5);
  assert.ok(by['English Standard']);
  assert.ok(by['any two units of Science']);
});

test('completeness audit is clean once English, Science and minBand are on the record', () => {
  const rec = extractCoursePage({
    html: WSU_HTML, text: htmlToText(WSU_HTML),
    url: 'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours',
    source: { prefix: 'wsu' }, capturedOn: '2026-08-27'
  });
  const audit = auditCourse(rec, WSU_HTML);
  assert.equal(audit.complete, true);
  assert.deepEqual(audit.reasons, []);
});

test('UNSW Engineering assumes Ext 1 and Physics; Biology on the same page is not assumed', () => {
  const rec = extractCoursePage({
    html: UNSW_ENG_HTML, text: htmlToText(UNSW_ENG_HTML),
    url: UNSW_COURSES.courses[0], source: UNSW_COURSES, capturedOn: '2026-08-28'
  });
  assert.equal(rec.verification, 'verified');
  const assumed = rec.assumedKnowledge.map(a => a.subject).sort();
  assert.deepEqual(assumed, ['Mathematics Extension 1', 'Physics']);
  assert.equal(rec.assumedKnowledge.some(a => a.subject === 'Biology'), false);
});

test('UNSW Medical Science assumes Chemistry and Maths Advanced, not Biology', () => {
  const rec = extractCoursePage({
    html: UNSW_MED_HTML, text: htmlToText(UNSW_MED_HTML),
    url: UNSW_COURSES.courses[1], source: UNSW_COURSES, capturedOn: '2026-08-28'
  });
  const assumed = rec.assumedKnowledge.map(a => a.subject).sort();
  assert.deepEqual(assumed, ['Chemistry', 'Mathematics Advanced']);
  assert.ok(rec.recommendedStudies.some(r => r.subject === 'Biology'));
});

test('sitemap discovery keeps STEM bachelor locs and drops Canberra / commerce', () => {
  const xml = `<?xml version="1.0"?><urlset>
    <loc>https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil</loc>
    <loc>https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-canberra</loc>
    <loc>https://www.unsw.edu.au/study/undergraduate/bachelor-of-commerce</loc>
    <loc>https://www.unsw.edu.au/study/undergraduate/bachelor-of-computer-science</loc>
    <loc>https://www.unsw.edu.au/study/how-to-apply</loc>
  </urlset>`;
  const locs = discoverSitemapLocs(xml, {
    linkRe: UNSW_COURSES.linkRe,
    excludeRe: UNSW_COURSES.excludeRe
  });
  assert.ok(locs.some(u => u.endsWith('bachelor-of-engineering-honours-civil')));
  assert.ok(locs.some(u => u.endsWith('bachelor-of-computer-science')));
  assert.equal(locs.some(u => u.includes('canberra')), false);
  assert.equal(locs.some(u => u.endsWith('bachelor-of-commerce')), false);
});

test('an unverified inherited row is repaired by a verified extract of the same subjects', () => {
  const existing = {
    id: 'unsw-renewable-energy-engineering',
    name: 'Bachelor of Engineering (Honours) (Renewable Energy)',
    assumedKnowledge: [{ subject: 'Mathematics Extension 1' }, { subject: 'Physics' }],
    verification: 'unverified'
  };
  const incoming = {
    id: 'unsw-renewable-energy-engineering',
    name: existing.name,
    assumedKnowledge: [
      { subject: 'Mathematics Extension 1', quote: 'Mathematics Extension 1', source: 'https://x', tier: 'A' },
      { subject: 'Physics', quote: 'Physics', source: 'https://x', tier: 'A' }
    ],
    verification: 'verified'
  };
  assert.equal(isRepair(existing, incoming), true);
});

test('a 404 shell is not a STEM course', () => {
  const html = '<html><title>404</title><h1>404</h1><p>Course not found</p></html>';
  const rec = extractCoursePage({
    html, text: htmlToText(html),
    url: 'https://www.uts.edu.au/EPiServer/CMS/uts.edu.au/courses/bachelor-of-engineering-honours-data-science',
    source: UTS_COURSES, capturedOn: '2026-08-27'
  });
  assert.equal(rec.verification, 'unverified');
  assert.equal(rec.name, undefined);
});
