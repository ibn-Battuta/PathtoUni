import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findVerbatim, verifyQuote, isLiteralSubstring } from '../pipeline/quote.js';
import { parseBboxXml, tableRows, courseNameComplete, colOf } from '../pipeline/parse-bbox.js';
import { USYD_TABLE } from '../pipeline/sources.js';
import {
  extractUsydTable, parseSubjects, isStemRow, courseId, fieldOf, USYD_MATHS_GATE, captureHaystack
} from '../pipeline/usyd-table.js';
import { diffExtract, mergeCatalogue, namesMatch, toCatalogueCourse } from '../pipeline/diff.js';
import { secondCheck } from '../pipeline/check.js';
import usydCatalogue from '../data/courses/usyd.json' with { type: 'json' };

const COL = { course: 76, prereq: 170, assumed: 280, recommended: 391, special: 501, date: 700 };

function place(col, y, sentence) {
  // Keep every word inside its column — character-width spacing spills into the next cell.
  let x = COL[col];
  return sentence.split(/\s+/).filter(Boolean).map(t => {
    const w = { x, y, t };
    x += 8;
    return w;
  });
}

function toXml(pages) {
  return '<doc>\n' + pages.map(words => {
    const body = words.map(w =>
      `    <word xMin="${w.x}" yMin="${w.y}" xMax="${w.x + 20}" yMax="${w.y + 10}">${esc(w.t)}</word>`
    ).join('\n');
    return `  <page width="842" height="595">\n${body}\n  </page>`;
  }).join('\n') + '\n</doc>';
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function header(y = 99) {
  return [
    ...place('course', y, 'Course'),
    ...place('prereq', y, 'Course Prerequisites'),
    ...place('assumed', y, 'Assumed Knowledge'),
    ...place('recommended', y, 'Recommended Studies'),
    ...place('special', y, 'Special Entry Requirements'),
    ...place('date', y, 'Date reviewed')
  ];
}

const fixtureXml = toXml([
  [
    { x: 72, y: 67, t: 'Faculty' }, { x: 110, y: 67, t: 'of' }, { x: 130, y: 67, t: 'Engineering' },
    ...header(),
    ...place('course', 114, 'Bachelor of Advanced'),
    ...place('prereq', 114, 'Mathematics Advanced (Band 4)'),
    ...place('assumed', 114, 'Mathematics Extension 1'),
    ...place('date', 114, 'Sep 2023'),
    ...place('course', 124, 'Computing'),
    ...place('prereq', 124, 'or Mathematics Extension 1 or 2'),
    ...place('prereq', 134, '(Band E3)'),

    ...place('course', 160, 'Bachelor of Engineering'),
    ...place('prereq', 160, 'Mathematics Advanced (Band 4)'),
    ...place('assumed', 160, 'Mathematics Extension 1,'),
    ...place('recommended', 160, 'Biology and Physics'),
    ...place('date', 160, 'Jan 2024'),
    ...place('course', 170, 'Honours (Biomedical'),
    ...place('prereq', 170, 'or Mathematics Extension 1 or 2'),
    ...place('assumed', 170, 'Chemistry'),
    ...place('course', 180, 'Engineering)'),
    ...place('prereq', 180, '(Band E3)')
  ],
  [
    { x: 72, y: 67, t: 'Faculty' }, { x: 110, y: 67, t: 'of' }, { x: 130, y: 67, t: 'Science' },
    ...header(),
    ...place('course', 114, 'Bachelor of Science'),
    ...place('assumed', 114, 'Mathematics Advanced,'),
    ...place('date', 114, 'Jan 2024'),
    ...place('course', 124, '(Medical Science)'),
    ...place('assumed', 124, 'Chemistry and Biology; other'),
    ...place('assumed', 134, 'assumed knowledge depends'),
    ...place('assumed', 144, 'on majors or units of study'),
    ...place('assumed', 154, 'chosen')
  ],
  [
    { x: 72, y: 67, t: 'Faculty' }, { x: 110, y: 67, t: 'of' }, { x: 130, y: 67, t: 'Medicine' },
    { x: 180, y: 67, t: 'and' }, { x: 200, y: 67, t: 'Health' },
    ...header(),
    ...place('course', 114, 'Bachelor of Pharmacy'),
    ...place('prereq', 114, 'Mathematics Advanced (Band 4)'),
    ...place('assumed', 114, 'Mathematics Advanced,'),
    ...place('recommended', 114, 'Physics'),
    ...place('date', 114, 'Sep 2023'),
    ...place('course', 124, '(Honours) and Master of'),
    ...place('prereq', 124, 'or Mathematics Extension 1 or 2'),
    ...place('assumed', 124, 'Chemistry and Biology'),
    ...place('course', 134, 'Pharmacy Practice'),
    ...place('prereq', 134, '(Band E3)')
  ]
]);

const fixtureText = `
Course Prerequisites, Assumed Knowledge, Recommended Studies and Special Entry Requirements
APPROVAL 11 November 2025
Faculty of Engineering
Bachelor of Advanced Computing
Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)
Assumed Knowledge Mathematics Extension 1
Bachelor of Engineering Honours (Biomedical Engineering)
Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)
Assumed Knowledge Mathematics Extension 1, Chemistry
Recommended Studies Biology and Physics
Faculty of Science
Bachelor of Science (Medical Science)
Assumed Knowledge Mathematics Advanced, Chemistry and Biology; other assumed knowledge depends on majors or units of study chosen
Faculty of Medicine and Health
Bachelor of Pharmacy (Honours) and Master of Pharmacy Practice
Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)
Assumed Knowledge Mathematics Advanced, Chemistry and Biology
Recommended Studies Physics
`;

function extract() {
  return extractUsydTable({
    bboxXml: fixtureXml,
    text: fixtureText,
    source: USYD_TABLE,
    capturedOn: '2026-08-27'
  });
}

test('maths-gate phrase verifies against the bbox cell when layout text interleaves columns', () => {
  const layout = 'Bachelor of Advanced Computing Mathematics Advanced (Band 4) Mathematics Extension 1 or Mathematics Extension 1 or 2';
  assert.equal(findVerbatim(layout, USYD_MATHS_GATE.quote), null);
  const rows = [{
    course: 'Bachelor of Advanced Computing',
    prereq: USYD_MATHS_GATE.quote,
    assumed: 'Mathematics Extension 1',
    recommended: '',
    special: '',
    date: 'Sep 2023'
  }];
  const hay = captureHaystack(layout, rows);
  assert.equal(findVerbatim(hay, USYD_MATHS_GATE.quote), USYD_MATHS_GATE.quote);
});

test('a quote must be a literal substring of the capture — whitespace-folded proposals are rewritten to the verbatim slice', () => {
  const capture = 'Mathematics Advanced (Band 4)\nor Mathematics Extension 1 or 2 (Band E3)';
  const proposed = 'Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)';
  const got = findVerbatim(capture, proposed);
  assert.ok(got);
  assert.equal(isLiteralSubstring(capture, got), true);
  assert.ok(got.includes('\n'));
});

test('no match means unverified, never a guessed quote', () => {
  const r = verifyQuote('Physics and Chemistry', 'Geology');
  assert.equal(r.verification, 'unverified');
  assert.equal(r.quote, null);
});

test('column assignment uses the last header whose x is left of the word', () => {
  assert.equal(colOf(76, USYD_TABLE.columns), 'course');
  assert.equal(colOf(248, USYD_TABLE.columns), 'prereq');   // "(Band 4)" sits here
  assert.equal(colOf(280, USYD_TABLE.columns), 'assumed');
  assert.equal(colOf(700, USYD_TABLE.columns), 'date');
});

test('wrapped combined names stay one row: "and Bachelor" is not a new course', () => {
  assert.equal(courseNameComplete('Bachelor of Arts and'), false);
  assert.equal(courseNameComplete('Bachelor of Engineering Honours (Biomedical'), false);
  assert.equal(courseNameComplete('Bachelor of Advanced Computing'), true);
});

test('either-or science is a choice, not two assumed subjects', () => {
  const r = parseSubjects('Mathematics Extension 1, either Physics or Chemistry (depending on the Engineering stream chosen)');
  assert.deepEqual(r.subjects, ['Mathematics Extension 1']);
  assert.equal(r.choices.length, 1);
});

test('the bbox parser reconstructs the four STEM fixture rows', () => {
  const rows = tableRows(parseBboxXml(fixtureXml), USYD_TABLE.columns);
  const names = rows.map(r => r.course);
  assert.ok(names.some(n => n.includes('Advanced Computing')));
  assert.ok(names.some(n => n.includes('Biomedical')));
  assert.ok(names.some(n => n.includes('Medical Science')));
  assert.ok(names.some(n => n.includes('Pharmacy')));
  const adv = rows.find(r => r.course.includes('Advanced Computing'));
  assert.match(adv.prereq, /Mathematics Advanced \(Band 4\)/);
  assert.match(adv.prereq, /Band E3/);
  assert.equal(adv.assumed, 'Mathematics Extension 1');
});

test('extract: Advanced Computing is gated and assumes Extension 1, both quote-verified', () => {
  const adv = extract().courses.find(c => c.name.includes('Advanced Computing'));
  assert.ok(adv);
  assert.equal(adv.verification, 'verified');
  assert.deepEqual(adv.hardRules, ['usyd-maths-gate']);
  assert.ok(adv.assumedKnowledge.some(a => a.subject === 'Mathematics Extension 1'));
  assert.ok(isLiteralSubstring(fixtureText, adv.assumedKnowledge[0].quote));
  assert.ok(isLiteralSubstring(fixtureText, adv.gateQuote));
  assert.equal(adv.gateQuote, USYD_MATHS_GATE.quote);
});

test('extract: Biomedical assumed is Ext 1 + Chemistry; Biology is recommended, not assumed', () => {
  const bio = extract().courses.find(c => c.name.includes('Biomedical'));
  const assumed = bio.assumedKnowledge.map(a => a.subject).sort();
  assert.deepEqual(assumed, ['Chemistry', 'Mathematics Extension 1']);
  assert.ok(bio.recommendedStudies.some(r => r.subject === 'Biology'));
  assert.ok(bio.recommendedStudies.some(r => r.subject === 'Physics'));
});

test('extract: Medical Science has no maths gate — Science dropped it from 2025', () => {
  const med = extract().courses.find(c => c.name.includes('Medical Science'));
  assert.deepEqual(med.hardRules, []);
  const assumed = med.assumedKnowledge.map(a => a.subject).sort();
  assert.deepEqual(assumed, ['Biology', 'Chemistry', 'Mathematics Advanced']);
  assert.equal(med.field, 'health');
});

test('extract: Pharmacy keeps the maths gate and assumes Advanced, Chemistry, Biology', () => {
  const ph = extract().courses.find(c => c.name.includes('Pharmacy'));
  assert.deepEqual(ph.hardRules, ['usyd-maths-gate']);
  const assumed = ph.assumedKnowledge.map(a => a.subject).sort();
  assert.deepEqual(assumed, ['Biology', 'Chemistry', 'Mathematics Advanced']);
});

test('Arts rows are not STEM; Engineering and Science are', () => {
  assert.equal(isStemRow({ faculty: 'Faculty of Arts and Social Sciences', course: 'Bachelor of Arts' }), false);
  assert.equal(isStemRow({ faculty: 'Faculty of Engineering', course: 'Bachelor of Advanced Computing' }), true);
  assert.equal(isStemRow({ faculty: 'Faculty of Science', course: 'Bachelor of Science (Medical Science)' }), true);
});

test('diff flags a maths-gate removal and stops, rather than silently accepting it', () => {
  // Invariant, not a snapshot: build a catalogue row that still carries the gate and confirm
  // the diff refuses to pass it through. Asserting against the live catalogue would only hold
  // while the live catalogue happened to be stale - which it was, until the row was corrected.
  const stale = usydCatalogue.courses.map(c =>
    c.id === 'usyd-medical-science'
      ? { ...c, hardRules: ['usyd-maths-gate'] }
      : c);
  const diff = diffExtract(extract(), stale);
  const med = diff.changed.find(c => c.id === 'usyd-medical-science');
  assert.ok(med, 'expected a change on Medical Science');
  assert.ok(med.changes.some(c => c.field === 'hardRules' && c.from.includes('usyd-maths-gate') && c.to.length === 0));
  assert.equal(diff.stops, true);
});

test('the live catalogue now agrees with the source - Medical Science carries no maths gate', () => {
  const med = usydCatalogue.courses.find(c => c.id === 'usyd-medical-science');
  assert.deepEqual(med.hardRules, []);
  assert.deepEqual(med.assumedKnowledge.map(a => a.subject).sort(),
    ['Biology', 'Chemistry', 'Mathematics Advanced']);
});

test('Biomedical Engineering assumes Chemistry, not Biology - Biology is recommended only', () => {
  const bio = usydCatalogue.courses.find(c => c.id === 'usyd-biomedical-engineering');
  assert.deepEqual(bio.assumedKnowledge.map(a => a.subject).sort(),
    ['Chemistry', 'Mathematics Extension 1']);
  assert.ok(bio.recommendedStudies.some(r => r.subject === 'Biology'));
});

test('namesMatch maps Chemical / Biomedical / Pharmacy aliases onto the table wording', () => {
  assert.equal(
    namesMatch('Bachelor of Engineering (Honours) (Chemical)', 'Bachelor of Engineering Honours (Chemical and Biomolecular Engineering)'),
    true
  );
  assert.equal(
    namesMatch('Bachelor of Pharmacy (Honours) / Master of Pharmacy Practice', 'Bachelor of Pharmacy (Honours) and Master of Pharmacy Practice'),
    true
  );
  assert.equal(namesMatch('Bachelor of Engineering (Honours)', 'Bachelor of Advanced Computing'), false);
});

test('merge never overwrites a verified record with an unverified one', () => {
  const uni = {
    university: 'University of Sydney',
    courses: [{
      id: 'usyd-medical-science',
      name: 'Bachelor of Science (Medical Science)',
      hardRules: ['usyd-maths-gate'],
      assumedKnowledge: [{ subject: 'Biology', quote: 'Biology' }],
      extraHurdles: [],
      verification: 'verified'
    }]
  };
  const incoming = {
    courses: [{
      id: 'usyd-medical-science',
      name: 'Bachelor of Science (Medical Science)',
      hardRules: [],
      assumedKnowledge: [{ subject: 'Biology', quote: 'Biology' }],
      extraHurdles: [],
      verification: 'unverified'
    }]
  };
  const diff = diffExtract(incoming, uni.courses);
  const merged = mergeCatalogue(uni, incoming, diff, { apply: true });
  const kept = merged.courses.find(c => c.id === 'usyd-medical-science');
  assert.deepEqual(kept.hardRules, ['usyd-maths-gate']);
  assert.ok(merged.keptVerified.some(k => k.id === 'usyd-medical-science'));
});

test('apply appends new verified courses and still does not mutate existing verified rows', () => {
  const uni = {
    university: 'University of Sydney',
    courses: [{
      id: 'usyd-advanced-computing',
      name: 'Bachelor of Advanced Computing',
      hardRules: ['usyd-maths-gate'],
      assumedKnowledge: [{ subject: 'Mathematics Extension 1', quote: 'Mathematics Extension 1' }],
      extraHurdles: [],
      verification: 'verified'
    }]
  };
  const ex = extract();
  const diff = diffExtract(ex, uni.courses);
  assert.ok(diff.added.length >= 2);
  const merged = mergeCatalogue(uni, ex, diff, { apply: true });
  assert.equal(merged.courses.find(c => c.id === 'usyd-advanced-computing').hardRules[0], 'usyd-maths-gate');
  assert.ok(merged.appended.length >= 1);
  assert.ok(merged.appended.every(c => c.verification === 'verified'));
  assert.ok(merged.courses.length > uni.courses.length);
});

test('second check agrees when layout text carries the same assumed subjects next to the course name', () => {
  const bio = extract().courses.find(c => c.name.includes('Biomedical'));
  const r = secondCheck({ extracted: bio }, fixtureText);
  assert.equal(r.status, 'agree');
});

test('second check conflicts when the layout window does not contain a claimed subject', () => {
  const fake = {
    extracted: {
      name: 'Bachelor of Advanced Computing',
      assumedKnowledge: [{ subject: 'Geology', quote: 'Geology' }],
      hardRules: []
    }
  };
  const r = secondCheck(fake, fixtureText);
  assert.equal(r.status, 'conflict');
});

test('toCatalogueCourse keeps quote, source and capturedOn on every assumed-knowledge row', () => {
  const adv = extract().courses.find(c => c.name.includes('Advanced Computing'));
  const row = toCatalogueCourse(adv);
  assert.equal(row.verification, 'verified');
  assert.equal(row.capturedOn, '2026-08-27');
  assert.ok(row.assumedKnowledge[0].source.startsWith('https://www.sydney.edu.au/'));
  assert.ok(row.assumedKnowledge[0].quote);
});

test('courseId is stable and fieldOf maps computing / health / engineering', () => {
  assert.equal(courseId('Bachelor of Advanced Computing'), 'usyd-advanced-computing');
  assert.equal(fieldOf('Bachelor of Advanced Computing'), 'computing');
  assert.equal(fieldOf('Bachelor of Engineering Honours (Civil Engineering)'), 'engineering');
  assert.equal(fieldOf('Bachelor of Science (Medical Science)'), 'health');
});
