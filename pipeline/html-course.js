// Deterministic extract from a rendered course page. Quotes verified in code.
import { findVerbatim } from './quote.js';
import { htmlToText } from './render.js';
import { fieldOf } from './usyd-table.js';
import { auditCourse } from './completeness.js';

const STEM_SLUG = /engineer|comput|scien|nurs|physio|medical|informat|cyber|forensic|math|data-science|mechatron|software|biomed|chemistr|physic|radiograph|occupational-therapy|speech/;
const NON_STEM_SLUG = /\/bachelor-of-arts|business|teaching|communication|criminolog|accounting|policing|creative|social-work|laws(?!.*science)|psychology-major|interpreting/;

export function isStemUrl(url) {
  const s = url.toLowerCase();
  if (/social-science|social-work/.test(s)) return false;
  if (NON_STEM_SLUG.test(s) && !/science|engineer|comput|medical/.test(s)) return false;
  return STEM_SLUG.test(s);
}

export function isStemName(name) {
  const n = String(name).toLowerCase();
  if (/social science|social work/.test(n) && !/medical|computer|engineer/.test(n)) return false;
  return STEM_SLUG.test(n);
}

export function slugFromUrl(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const last = path.split('/').filter(Boolean).pop() || 'page';
    return last.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
  } catch {
    return 'page';
  }
}

export function discoverCourseLinks(html, baseUrl, linkRe) {
  let origin;
  try { origin = new URL(baseUrl).origin; } catch { return []; }
  const re = linkRe instanceof RegExp ? linkRe : new RegExp(linkRe || 'bachelor-of-', 'i');
  const hrefs = [...String(html).matchAll(/href=["']([^"'#?]+)/gi)].map(m => m[1]);
  const out = [];
  for (const h of hrefs) {
    let u;
    try { u = new URL(h, origin); } catch { continue; }
    if (u.origin !== origin) continue;
    const abs = u.href.split('#')[0].split('?')[0];
    if (re.test(abs)) out.push(abs.replace(/\/+$/, ''));
  }
  return [...new Set(out)];
}

/** Locs from a sitemap.xml. GET of XML is the index; course pages still need a render. */
export function discoverSitemapLocs(xml, { linkRe, excludeRe } = {}) {
  const locs = [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1].trim());
  const keep = linkRe instanceof RegExp ? linkRe : new RegExp(linkRe || '/study/undergraduate/bachelor', 'i');
  const drop = excludeRe instanceof RegExp ? excludeRe : (excludeRe ? new RegExp(excludeRe, 'i') : null);
  const out = [];
  for (const raw of locs) {
    const u = raw.replace(/\/+$/, '');
    if (!keep.test(u)) continue;
    if (drop && drop.test(u)) continue;
    if (isStemUrl(u)) out.push(u);
  }
  return [...new Set(out)];
}

export function courseTitle(html) {
  const h1s = [...String(html).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map(m => htmlToText(m[1]).replace(/\s+/g, ' ').trim())
    .filter(t => t && !/^skip to/i.test(t));
  const named = h1s.find(t => /bachelor|diploma|master|doctor/i.test(t) && t.length < 200);
  if (named) return named;
  if (h1s[0] && h1s[0].length < 200) return h1s[0];
  const title = String(html).match(/<title>([\s\S]*?)<\/title>/i);
  if (!title) return null;
  return htmlToText(title[1]).split('|')[0].split('–')[0].split('- University')[0].trim();
}

function section(text, labels) {
  const names = labels.join('|');
  const re = new RegExp(
    `(?:${names})\\s*[:.\\-]*\\s*([\\s\\S]{8,1500}?)(?=\\n\\s*(?:Assumed knowledge|Recommended studies|Prerequisite|Admission|Inherent|Recognition|Overview|What you|Entry requirements|Duration|Fees|Apply|Adjustment)\\b|$)`,
    'i'
  );
  const m = String(text).match(re);
  if (!m) return '';
  let body = m[1].replace(/\s+/g, ' ').trim();
  if (body.length > 480) body = body.slice(0, 480);
  return body;
}

/** UTS often puts recommended in the same paragraph as assumed. */
export function splitRecommended(block) {
  if (!block) return { assumed: '', recommended: '' };
  const rec = block.match(/([^.]*\bare recommended\.?)/i);
  if (!rec) return { assumed: block, recommended: '' };
  return {
    assumed: block.replace(rec[1], '').replace(/\s+/g, ' ').trim(),
    recommended: rec[1].trim()
  };
}

/**
 * Longest-first subject phrases. Generic English / Science / 2-unit Mathematics
 * stay in the list — stripping them is how Band 5 and "two subjects of English"
 * fell on the floor.
 */
const ENTRY_SPECS = [
  { subject: 'Mathematics Extension 2', re: /Mathematics Extension 2/gi },
  { subject: 'Mathematics Extension 1', re: /Mathematics Extension 1/gi },
  { subject: 'Mathematics Advanced', re: /Mathematics Advanced/gi },
  { subject: 'Mathematics Standard 2', re: /Mathematics Standard 2/gi },
  { subject: 'Mathematics Standard 1', re: /Mathematics Standard 1/gi },
  { subject: 'Mathematics Standard', re: /Mathematics Standard(?!\s*[12])/gi },
  { subject: 'Mathematics Advanced', re: /Mathematics\s*\(\s*not General(?: Mathematics)?\s*\)/gi },
  { subject: 'Mathematics Advanced', re: /Mathematics equivalent to 2\s*Unit(?: HSC)?/gi },
  { subject: 'Mathematics Advanced', re: /2\s*Unit HSC/gi },
  { subject: 'Mathematics Advanced', re: /two (?:unit|subject)s? mathematics/gi },
  { subject: 'Mathematics Advanced', re: /HSC Mathematics(?!\s+(?:Advanced|Standard|Extension))/gi },
  { subject: 'Mathematics Advanced', re: /\bMathematics\b(?!\s+(?:Advanced|Standard|Extension|equivalent))/gi },
  { subject: 'English Extension 1', re: /English Extension 1/gi },
  { subject: 'English Advanced', re: /English Advanced/gi },
  { subject: 'English Standard', re: /English Standard/gi },
  { subject: 'English EAL/D', re: /English EAL\/D/gi },
  { subject: 'English Standard', re: /any two units of(?: NSW HSC | HSC )?English/gi },
  { subject: 'English Standard', re: /any 2 units of(?: NSW HSC | HSC )?English/gi },
  { subject: 'English Standard', re: /any 2 subjects of English/gi },
  { subject: 'English Standard', re: /two subjects of English/gi },
  { subject: 'English Standard', re: /two unit English/gi },
  { subject: 'English Standard', re: /\bEnglish\b(?!\s+(?:Advanced|Standard|Extension|EAL))/gi },
  { subject: 'any two units of Science', re: /two subjects of Science/gi },
  { subject: 'any two units of Science', re: /two unit science(?:\s*\(\s*any science\s*\))?/gi },
  { subject: 'any two units of Science', re: /any two units of(?: NSW HSC)? Science/gi },
  { subject: 'any two units of Science', re: /any 2 units of Science/gi },
  { subject: 'Physics', re: /\bPhysics\b/gi },
  { subject: 'Chemistry', re: /\bChemistry\b/gi },
  { subject: 'Biology', re: /\bBiology\b/gi },
  { subject: 'Engineering Studies', re: /Engineering Studies/gi },
  { subject: 'Software Engineering', re: /Software Engineering/gi }
];

const QUOTE_NEEDLES = {
  'Mathematics Advanced': [
    'Mathematics Advanced',
    'Mathematics (not General Mathematics)',
    'Mathematics (not General)',
    'HSC Mathematics',
    '2 Unit HSC',
    'two unit mathematics',
    'two subject mathematics',
    'Mathematics equivalent'
  ],
  'English Standard': [
    'English Standard',
    'any two units of English',
    'any two units of HSC English',
    'any 2 units of English',
    'any 2 units of HSC English',
    'two subjects of English',
    'any 2 subjects of English',
    'two unit English',
    'two units of HSC English',
    'any two units of HSC English',
    'any two units of NSW HSC English'
  ],
  'any two units of Science': [
    'two subjects of Science',
    'two unit science',
    'any science',
    'any two units of Science',
    'two unit science (any science)'
  ]
};

function overlaps(used, start, end) {
  return used.some(([a, b]) => start < b && end > a);
}

function bandAfterMaths(text, start, end) {
  const window = text.slice(start, Math.min(text.length, end + 70));
  const m = window.match(/[Bb]and\s+(e?\d)/);
  if (!m) return undefined;
  const n = Number(String(m[1]).replace(/^e/i, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Parse every named (and generic English/Science/2-unit maths) subject, with minBand when stated. */
export function parseAssumedEntries(text) {
  if (!text) return [];
  const used = [];
  const items = [];
  for (const spec of ENTRY_SPECS) {
    const re = spec.re;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index, end = m.index + m[0].length;
      if (overlaps(used, start, end)) continue;
      used.push([start, end]);
      const entry = { subject: spec.subject, quoteNeedle: m[0] };
      if (/^Mathematics/.test(spec.subject)) {
        const band = bandAfterMaths(text, start, end);
        if (band != null) entry.minBand = band;
      }
      items.push(entry);
    }
  }
  return items;
}

function quoteFor(subject, cell, capture, needle) {
  const mapped = [needle, ...(QUOTE_NEEDLES[subject] ?? [subject])].filter(Boolean);
  for (const n of mapped) {
    const q = findVerbatim(cell, n) || findVerbatim(capture, n);
    if (q) return q;
  }
  return null;
}

export function courseId(prefix, name) {
  return prefix + '-' + String(name)
    .toLowerCase()
    .replace(/bachelor of /g, '')
    .replace(/master of /g, 'm-')
    .replace(/doctor of /g, 'd-')
    .replace(/\(honours\)/g, 'honours')
    .replace(/\bhonours\b/g, 'honours')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-');
}

export function pageLooksFailed(html, text) {
  const t = `${html}\n${text}`.toLowerCase();
  if (t.includes('403 error') || t.includes('the request could not be satisfied')) return true;
  if (/<title>[^<]*course not found/i.test(html)) return true;
  if ((html || '').length < 400 && !/bachelor|diploma|master/i.test(t)) return true;
  return false;
}

export function plausibleCourseName(name) {
  if (!name || name.length < 12 || name.length > 200) return false;
  if (/^404\b/i.test(name) || /page not found/i.test(name) || /course not found/i.test(name))
    return false;
  return /bachelor|diploma|master|doctor/i.test(name);
}

export function extractCoursePage({ html, text, url, source, capturedOn }) {
  const body = text || htmlToText(html);
  const capture = `${html}\n${body}`;
  const name = courseTitle(html);
  if (!name || !plausibleCourseName(name) || pageLooksFailed(html, body)) {
    return { url, verification: 'unverified', dropped: [{ reason: 'page did not render a course' }] };
  }

  let assumedBlock = section(body, ['Assumed knowledge required', 'Assumed knowledge', 'Assumed Knowledge']);
  let recommendedBlock = section(body, ['Recommended studies', 'Recommended Studies']);
  const prereqBlock = section(body, ['Course prerequisites', 'Prerequisites?', 'Prerequisite']);

  if (!recommendedBlock && /are recommended/i.test(assumedBlock)) {
    const split = splitRecommended(assumedBlock);
    assumedBlock = split.assumed;
    recommendedBlock = split.recommended;
  }

  const dropped = [];
  const assumed = [];
  const recommended = [];
  const seenAk = new Set();
  for (const ent of parseAssumedEntries(assumedBlock)) {
    if (seenAk.has(ent.subject)) continue;
    seenAk.add(ent.subject);
    const quote = quoteFor(ent.subject, assumedBlock, capture, ent.quoteNeedle);
    if (!quote) { dropped.push({ field: 'assumedKnowledge', subject: ent.subject }); continue; }
    const row = { subject: ent.subject, quote, source: url, tier: 'A' };
    if (ent.minBand != null) row.minBand = ent.minBand;
    assumed.push(row);
  }
  const seenRec = new Set();
  for (const ent of parseAssumedEntries(recommendedBlock)) {
    if (seenRec.has(ent.subject) || seenAk.has(ent.subject)) continue;
    seenRec.add(ent.subject);
    const quote = quoteFor(ent.subject, recommendedBlock, capture, ent.quoteNeedle);
    if (!quote) { dropped.push({ field: 'recommendedStudies', subject: ent.subject }); continue; }
    recommended.push({ subject: ent.subject, quote, source: url });
  }

  const rec = {
    id: courseId(source.prefix, name),
    name,
    field: fieldOf(name),
    hardRules: [],
    assumedKnowledge: assumed,
    recommendedStudies: recommended,
    extraHurdles: [],
    nameRecognition: 'low',
    verification: dropped.length === 0 ? 'verified' : 'unverified',
    source: url,
    capturedOn,
    raw: { assumed: assumedBlock, recommended: recommendedBlock, prereq: prereqBlock },
    dropped,
    url
  };

  const audit = auditCourse(rec, capture);
  if (dropped.length === 0 && !audit.complete) {
    rec.verification = 'incomplete';
    rec._completeness = audit.reasons;
  } else if (audit.complete) {
    delete rec._completeness;
  }
  return rec;
}

export function extractHtmlCourses({ pages, source, capturedOn }) {
  const courses = [];
  const listing = (source.listingUrl || '').replace(/\/+$/, '');
  for (const p of pages ?? []) {
    if (p.failed) continue;
    if (listing && (p.url || '').replace(/\/+$/, '') === listing) continue;
    const rec = extractCoursePage({
      html: p.html,
      text: p.text,
      url: p.url,
      source,
      capturedOn
    });
    if (!rec.name) continue;
    if (/\bcanberra\b/i.test(rec.name) || /canberra/i.test(p.url || '')) continue;
    if (!isStemName(rec.name) && !isStemUrl(p.url)) continue;
    courses.push(rec);
  }
  return {
    source,
    capturedOn,
    rows: pages?.length ?? 0,
    stemRows: courses.length,
    courses,
    verified: courses.filter(c => c.verification === 'verified').length,
    unverified: courses.filter(c => c.verification === 'unverified').length,
    approved: null
  };
}
