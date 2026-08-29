// Sydney Academic Board table → course records. Deterministic. Quotes verified in code.

import { findVerbatim, verifyQuote } from './quote.js';
import { parseBboxXml, tableRows } from './parse-bbox.js';
import { USYD_TABLE } from './sources.js';

export const USYD_MATHS_GATE = {
  id: 'usyd-maths-gate',
  quote: 'Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)',
  routes: [
    { subject: 'Mathematics Advanced', minBand: 4, bandScale: 'hsc' },
    { subject: 'Mathematics Extension 1', minBand: 3, bandScale: 'extension' },
    { subject: 'Mathematics Extension 2', minBand: 3, bandScale: 'extension' }
  ]
};

// Longest-first so "Mathematics Extension 1" is not eaten as "Mathematics".
export const CANON_SUBJECTS = [
  'Mathematics Extension 2',
  'Mathematics Extension 1',
  'Mathematics Advanced',
  'Mathematics Standard 2',
  'Mathematics Standard 1',
  'Mathematics Standard',
  'English Advanced',
  'English Standard',
  'Earth and Environmental Science',
  'Investigating Science',
  'Engineering Studies',
  'Software Engineering',
  'Physics',
  'Chemistry',
  'Biology'
];

const STEM_FACULTY = [
  /Faculty of Engineering/i,
  /Faculty of Science/i,
  /Faculty of Medicine and Health/i
];

export function isStemRow(row) {
  const f = row.faculty ?? '';
  const n = row.course ?? '';
  if (/Arts and Social Sciences/i.test(f) && !/Engineering Honours|Advanced Computing|Mathematical Sciences/i.test(n))
    return false;
  if (STEM_FACULTY.some(re => re.test(f))) return true;
  if (/Engineering Honours|Advanced Computing|Mathematical Sciences/i.test(n)) return true;
  if (/Bachelor of Science/i.test(n)) return true;
  return false;
}

export function fieldOf(name, faculty = '') {
  const n = name.toLowerCase();
  if (/\bcomput|\binformation technology|\bcyber/.test(n)) return 'computing';
  if (/\bengineer/.test(n)) return 'engineering';
  if (/\b(pharm|medic|nurs|health|physio|psycholog|radiograph|oral|veterinary|dietetic|dental|biomedicine|occupational therapy|speech)/.test(n))
    return 'health';
  if (/engineering/i.test(faculty)) return 'engineering';
  if (/medicine/i.test(faculty)) return 'health';
  return 'science';
}

export function courseId(name) {
  return 'usyd-' + name
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

/**
 * Pull canonical HSC subjects out of an assumed/recommended cell.
 * "either Physics or Chemistry" and "Physics and/or Chemistry" are choices, not two gaps.
 */
export function parseSubjects(text) {
  if (!text) return { subjects: [], choices: [] };
  const main = text
    .split(/;\s*other assumed knowledge/i)[0]
    .replace(/\bNone\b/g, '');
  if (/^depends on/i.test(main.trim())) return { subjects: [], choices: [] };

  const choices = [];
  const skip = new Set();
  const choiceRe = /(?:either\s+)?(Physics|Chemistry)\s+(?:and\/or|or)\s+(Physics|Chemistry)/gi;
  let cm;
  while ((cm = choiceRe.exec(main))) {
    choices.push([cm[1], cm[2]]);
    skip.add(cm[1]);
    skip.add(cm[2]);
  }

  const subjects = [];
  const lower = main.toLowerCase();
  for (const s of CANON_SUBJECTS) {
    if (skip.has(s)) continue;
    const i = lower.indexOf(s.toLowerCase());
    if (i === -1) continue;
    // Don't take a shorter name that sits inside a longer one already accepted.
    const clash = subjects.some(x => x.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(x.toLowerCase()));
    if (clash) continue;
    subjects.push(s);
  }
  return { subjects, choices };
}

function hurdlesFrom(special) {
  if (!special) return [];
  const out = [];
  const s = special.toLowerCase();
  if (/\bportfolio\b/.test(s)) out.push({ type: 'portfolio' });
  if (/\baudition\b/.test(s)) out.push({ type: 'audition' });
  if (/\binterview\b/.test(s)) out.push({ type: 'interview' });
  if (/\bucat\b/.test(s)) out.push({ type: 'ucat' });
  if (/personal statement/.test(s)) out.push({ type: 'personal_statement' });
  if (/situational judgement/.test(s)) out.push({ type: 'situational_judgement' });
  return out;
}

function hasMathsGatePhrase(prereq) {
  return /Mathematics Advanced \(Band 4\).*Mathematics Extension 1 or 2 \(Band E3\)/s.test(prereq)
    || /Mathematics Advanced \(Band 4\) or Mathematics Extension 1 or 2 \(Band E3\)/.test(prereq);
}

export function rowToCourse(row, captureText, source) {
  const name = row.course;
  const dropped = [];
  const assumed = [];
  const recommended = [];
  const { subjects: akSubjects, choices } = parseSubjects(row.assumed);
  const { subjects: recSubjects } = parseSubjects(row.recommended);

  const cellQuote = (cell, subject) => {
    // Prefer a quote from this cell; fall back to the whole capture.
    const fromCell = findVerbatim(cell, subject) || findVerbatim(captureText, subject);
    return fromCell;
  };

  for (const subject of akSubjects) {
    const quote = cellQuote(row.assumed, subject);
    if (!quote) {
      dropped.push({ field: 'assumedKnowledge', subject, reason: 'quote not in capture' });
      continue;
    }
    assumed.push({
      subject,
      quote,
      source: source.url,
      tier: 'A'
    });
  }
  for (const subject of recSubjects) {
    const quote = cellQuote(row.recommended, subject);
    if (!quote) {
      dropped.push({ field: 'recommendedStudies', subject, reason: 'quote not in capture' });
      continue;
    }
    recommended.push({ subject, quote, source: source.url });
  }

  const hardRules = [];
  let gateQuote = null;
  if (hasMathsGatePhrase(row.prereq)) {
    const g = verifyQuote(captureText, USYD_MATHS_GATE.quote);
    if (g.verification === 'verified') {
      hardRules.push(USYD_MATHS_GATE.id);
      gateQuote = g.quote;
    } else {
      dropped.push({ field: 'hardRules', reason: 'maths-gate phrase not a literal substring' });
    }
  }

  const extras = hurdlesFrom(row.special);
  const verification = dropped.length === 0 ? 'verified' : 'unverified';

  return {
    id: courseId(name),
    name,
    field: fieldOf(name, row.faculty),
    faculty: row.faculty,
    hardRules,
    assumedKnowledge: assumed,
    recommendedStudies: recommended,
    assumedChoices: choices,
    extraHurdles: extras,
    nameRecognition: 'low',
    verification,
    source: source.url,
    capturedOn: source.capturedOn,
    reviewed: row.reviewed || null,
    raw: {
      prereq: row.prereq,
      assumed: row.assumed,
      recommended: row.recommended,
      special: row.special
    },
    gateQuote,
    dropped,
    page: row.page
  };
}

/**
 * Layout text interleaves columns, so a cell's words may never sit in one
 * substring. The bbox cell reconstruction is the same words, column-local —
 * still the capture, not a guess. Quotes must match one of the two.
 */
export function captureHaystack(layoutText, rows) {
  const cells = rows.flatMap(r => [r.course, r.prereq, r.assumed, r.recommended, r.special, r.date]);
  return [layoutText, ...cells].filter(Boolean).join('\n');
}

export function extractUsydTable({ bboxXml, text, source = USYD_TABLE, capturedOn }) {
  const src = { ...source, capturedOn };
  const pages = parseBboxXml(bboxXml);
  const rows = tableRows(pages, source.columns);
  const stemRows = rows.filter(isStemRow);
  const haystack = captureHaystack(text, rows);
  const courses = stemRows.map(r => rowToCourse(r, haystack, src));
  const approved = (text.match(/APPROVAL\s+(\d{1,2}\s+\w+\s+\d{4})/) || [])[1] ?? null;

  return {
    source: src,
    capturedOn,
    approved,
    rows: rows.length,
    stemRows: stemRows.length,
    courses,
    verified: courses.filter(c => c.verification === 'verified').length,
    unverified: courses.filter(c => c.verification === 'unverified').length
  };
}


