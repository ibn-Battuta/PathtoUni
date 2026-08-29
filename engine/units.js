// NESA pattern-of-study and unit arithmetic.
// Unit values are CONTEXT-DEPENDENT. Do not hardcode a fixed unit count per subject.
import subjects from '../data/subjects.json' with { type: 'json' };

export const MATHS_LEVEL = {
  standard1: 1, standard2: 2, advanced: 3, advanced_ext1: 4, advanced_ext1_ext2: 5
};

/**
 * English is a hierarchy too. A course that assumes "English Standard" is satisfied by
 * English Advanced - holding a HIGHER course in the same subject is never a gap.
 * EAL/D is an alternative 2-unit English stream, not a lower one.
 */
export const ENGLISH_SUBJECT_LEVEL = {
  'English Standard': 1, 'English EAL/D': 1, 'English Advanced': 2, 'English Extension 1': 3
};

export function englishLevel(profile) {
  const held = (profile.english ?? []).map(id => ({
    english_standard: 1, english_eald: 1, english_advanced: 2, english_ext1: 3
  }[id] ?? 0));
  return held.length ? Math.max(...held) : 0;
}

// Maps an assumed-knowledge subject string to the maths level it demands.
export const MATHS_SUBJECT_LEVEL = {
  'Mathematics Standard 1': 1, 'Mathematics Standard 2': 2, 'Mathematics Standard': 2,
  'Mathematics Advanced': 3, 'Mathematics Extension 1': 4, 'Mathematics Extension 2': 5
};

/** Subjects the student actually SITS. Critical: an Extension 2 student does not sit Mathematics Advanced. */
export function subjectsHeld(profile) {
  const held = new Set();
  const m = subjects.mathematics.unitRules[profile.mathsPathway];
  if (!m) throw new Error(`Unknown maths pathway: ${profile.mathsPathway}`);
  m.sits.forEach(s => held.add(s));
  (profile.english ?? []).forEach(id => {
    const o = subjects.english.options.find(x => x.id === id);
    if (o) held.add(o.name);
  });
  (profile.sciences ?? []).forEach(id => {
    const s = subjects.sciences.find(x => x.id === id);
    if (s) held.add(s.name);
  });
  (profile.technology ?? []).forEach(id => {
    const t = subjects.technology.find(x => x.id === id);
    if (t) held.add(t.name);
  });
  (profile.other ?? []).forEach(o => held.add(o.name));
  return held;
}

export function mathsLevel(profile) {
  return MATHS_LEVEL[profile.mathsPathway] ?? 0;
}

/** Total Board Developed units, applying the Extension 2 recount. */
export function unitCount(profile) {
  let units = subjects.mathematics.unitRules[profile.mathsPathway].units;
  (profile.english ?? []).forEach(id => {
    units += subjects.english.options.find(x => x.id === id)?.units ?? 0;
  });
  (profile.sciences ?? []).forEach(id => {
    units += subjects.sciences.find(x => x.id === id)?.units ?? 0;
  });
  (profile.technology ?? []).forEach(id => {
    units += subjects.technology.find(x => x.id === id)?.units ?? 0;
  });
  (profile.other ?? []).forEach(o => { units += o.units ?? 2; });
  return units;
}

/**
 * Course-level breakdown, used for pattern validation.
 * `area` is the NESA SUBJECT AREA, not a faculty grouping. UAC: "Within an HSC subject area
 * (eg mathematics) there may be a number of courses (eg Mathematics Standard 2, Mathematics
 * Advanced, Mathematics Extension 1, Mathematics Extension 2)." So all maths courses collapse
 * to one area and all English courses to one, but Physics and Chemistry are SEPARATE areas.
 */
function courseList(profile) {
  const out = [];
  const m = subjects.mathematics.unitRules[profile.mathsPathway];
  if (profile.mathsPathway === 'advanced_ext1_ext2') {
    out.push({ name: 'Mathematics Extension 1', units: 2, area: 'mathematics' });
    out.push({ name: 'Mathematics Extension 2', units: 2, area: 'mathematics' });
  } else if (profile.mathsPathway === 'advanced_ext1') {
    out.push({ name: 'Mathematics Advanced', units: 2, area: 'mathematics' });
    out.push({ name: 'Mathematics Extension 1', units: 1, area: 'mathematics' });
  } else {
    out.push({ name: m.sits[0], units: m.units, area: 'mathematics' });
  }
  (profile.english ?? []).forEach(id => {
    const o = subjects.english.options.find(x => x.id === id);
    if (o) out.push({ name: o.name, units: o.units, area: 'english' });
  });
  (profile.sciences ?? []).forEach(id => {
    const s = subjects.sciences.find(x => x.id === id);
    if (s) out.push({ name: s.name, units: s.units, area: s.id });
  });
  (profile.technology ?? []).forEach(id => {
    const t = subjects.technology.find(x => x.id === id);
    if (t) out.push({ name: t.name, units: t.units, area: t.id });
  });
  (profile.other ?? []).forEach(o => out.push({ name: o.name, units: o.units ?? 2, area: o.area ?? o.name.toLowerCase() }));
  return out;
}

/** UAC ATAR eligibility. Returns { valid, units, violations[] }. */
export function validateAtarPattern(profile) {
  const p = subjects.atarPattern;
  const courses = courseList(profile);
  const units = courses.reduce((a, c) => a + c.units, 0);
  const englishUnits = courses.filter(c => c.area === 'english').reduce((a, c) => a + c.units, 0);
  const twoUnitCourses = courses.filter(c => c.units >= 2).length;
  const areas = new Set(courses.map(c => c.area)).size;
  const violations = [];
  if (units < p.minBoardDevelopedUnits)
    violations.push(`Needs at least ${p.minBoardDevelopedUnits} units of Board Developed courses; has ${units}.`);
  if (englishUnits < p.minEnglishUnits)
    violations.push(`Needs at least ${p.minEnglishUnits} units of English; has ${englishUnits}.`);
  if (twoUnitCourses < p.minCoursesOfTwoOrMoreUnits)
    violations.push(`Needs at least ${p.minCoursesOfTwoOrMoreUnits} courses of 2 units or more; has ${twoUnitCourses}.`);
  if (areas < p.minSubjectAreas)
    violations.push(`Needs at least ${p.minSubjectAreas} subject areas; has ${areas}.`);
  return { valid: violations.length === 0, units, englishUnits, twoUnitCourses, areas, violations };
}

/** ATAR counts best 2 units English + best 8 from the rest. Anything beyond 10 is a discard buffer. */
export function discardBuffer(profile) {
  const units = unitCount(profile);
  const counted = subjects.atarPattern.countedUnits.english + subjects.atarPattern.countedUnits.remaining;
  return { totalUnits: units, countedUnits: counted, discardableUnits: Math.max(0, units - counted) };
}
