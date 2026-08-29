// Encode the subject set in the URL hash fragment, never the query string.
// A query string is transmitted to the server on every request and lands in access logs.
// A hash fragment is never sent. That is the difference between "we promise not to store
// your subjects" and "your subjects were never sent anywhere".

const MATHS_TO_HASH = {
  standard1: 'std1',
  standard2: 'std2',
  advanced: 'adv',
  advanced_ext1: 'ext1',
  advanced_ext1_ext2: 'ext12'
};
const HASH_TO_MATHS = {
  std1: 'standard1',
  std2: 'standard2',
  adv: 'advanced',
  ext1: 'advanced_ext1',
  ext12: 'advanced_ext1_ext2'
};

const ENG_TO_HASH = {
  english_standard: 'std',
  english_advanced: 'adv',
  english_eald: 'eald'
};
const HASH_TO_ENG = {
  std: 'english_standard',
  adv: 'english_advanced',
  eald: 'english_eald'
};

const SCI_TO_HASH = {
  physics: 'phy',
  chemistry: 'chem',
  biology: 'bio',
  earth_env: 'earth',
  investigating_science: 'invsci'
};
const HASH_TO_SCI = {
  phy: 'physics',
  chem: 'chemistry',
  bio: 'biology',
  earth: 'earth_env',
  invsci: 'investigating_science'
};

const TECH_TO_HASH = {
  engineering_studies: 'engstud',
  software_engineering: 'softeng',
  enterprise_computing: 'entcomp',
  design_technology: 'dt'
};
const HASH_TO_TECH = {
  engstud: 'engineering_studies',
  softeng: 'software_engineering',
  entcomp: 'enterprise_computing',
  dt: 'design_technology'
};

const BAND_KEY_TO_SUBJECT = {
  adv: 'Mathematics Advanced',
  ext1: 'Mathematics Extension 1',
  ext2: 'Mathematics Extension 2'
};
const SUBJECT_TO_BAND_KEY = {
  'Mathematics Advanced': 'adv',
  'Mathematics Extension 1': 'ext1',
  'Mathematics Extension 2': 'ext2'
};

function emptyState() {
  return {
    year: null,
    mathsPathway: null,
    english: [],
    sciences: [],
    technology: [],
    otherCount: 0,
    bands: {}
  };
}

function isCompleteSelection(state) {
  return Boolean(state?.year && state?.mathsPathway && state.english?.length);
}

function encodeState(state) {
  const p = new URLSearchParams();
  if (state.year) p.set('y', String(state.year));
  const m = MATHS_TO_HASH[state.mathsPathway];
  if (m) p.set('m', m);
  const e = ENG_TO_HASH[state.english?.[0]];
  if (e) p.set('e', e);
  const s = (state.sciences ?? []).map(id => SCI_TO_HASH[id]).filter(Boolean);
  if (s.length) p.set('s', s.join(','));
  const t = (state.technology ?? []).map(id => TECH_TO_HASH[id]).filter(Boolean);
  if (t.length) p.set('t', t.join(','));
  if (state.otherCount) p.set('o', String(Math.max(0, Math.min(4, state.otherCount))));
  const bands = [];
  for (const [subj, b] of Object.entries(state.bands ?? {})) {
    const key = SUBJECT_TO_BAND_KEY[subj];
    if (!key || b?.band == null) continue;
    const token = b.scale === 'extension' ? `E${b.band}` : String(b.band);
    bands.push(`${key}:${token}`);
  }
  if (bands.length) p.set('b', bands.join(','));
  return p.toString();
}

function decodeState(hash) {
  const state = emptyState();
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (!raw) return state;
  const p = new URLSearchParams(raw);
  const y = p.get('y');
  if (y === '11' || y === '12') state.year = Number(y);
  const m = p.get('m');
  if (m && HASH_TO_MATHS[m]) state.mathsPathway = HASH_TO_MATHS[m];
  if (state.year === 11 && state.mathsPathway === 'advanced_ext1_ext2')
    state.mathsPathway = 'advanced_ext1';
  const e = p.get('e');
  if (e && HASH_TO_ENG[e]) state.english = [HASH_TO_ENG[e]];
  const s = p.get('s');
  if (s) state.sciences = s.split(',').map(k => HASH_TO_SCI[k.trim()]).filter(Boolean);
  const t = p.get('t');
  if (t) state.technology = t.split(',').map(k => HASH_TO_TECH[k.trim()]).filter(Boolean);
  const o = p.get('o');
  if (o != null && /^\d+$/.test(o)) state.otherCount = Math.max(0, Math.min(4, Number(o)));
  const b = p.get('b');
  if (b) {
    for (const part of b.split(',')) {
      const [key, token] = part.split(':');
      const subj = BAND_KEY_TO_SUBJECT[key];
      if (!subj || !token) continue;
      if (/^E\d+$/i.test(token))
        state.bands[subj] = { band: Number(token.slice(1)), scale: 'extension' };
      else if (/^\d+$/.test(token))
        state.bands[subj] = { band: Number(token), scale: 'hsc' };
    }
  }
  return state;
}


const subjects = {
  "_comment": "NESA Stage 6 Board Developed courses that carry STEM readiness signal, plus the unit rules. Unit values are CONTEXT-DEPENDENT - see mathematics.unitRules. Source this from NESA via the pipeline; do not hand-edit once the pipeline runs.",
  "capturedOn": "2026-08-27",
  "mathematics": {
    "pathway": ["standard1", "standard2", "advanced", "advanced_ext1", "advanced_ext1_ext2"],
    "exclusive": true,
    "unitRules": {
      "_rule": "NESA pattern of study: 'For students entered in Mathematics Extension 2, both Mathematics Extension 1 and Mathematics Extension 2 are counted as 2-unit courses.' Footnote: Extension 1 is a 1-unit course when studied with Mathematics Advanced.",
      "standard1": { "units": 2, "sits": ["Mathematics Standard 1"] },
      "standard2": { "units": 2, "sits": ["Mathematics Standard 2"] },
      "advanced": { "units": 2, "sits": ["Mathematics Advanced"] },
      "advanced_ext1": { "units": 3, "sits": ["Mathematics Advanced", "Mathematics Extension 1"] },
      "advanced_ext1_ext2": {
        "units": 4,
        "sits": ["Mathematics Extension 1", "Mathematics Extension 2"],
        "_note": "Does NOT sit Mathematics Advanced. This removes any gate route that requires an Advanced band."
      }
    },
    "yearRules": { "advanced_ext1_ext2": "year12only" }
  },
  "sciences": [
    { "id": "physics", "name": "Physics", "units": 2 },
    { "id": "chemistry", "name": "Chemistry", "units": 2 },
    { "id": "biology", "name": "Biology", "units": 2 },
    { "id": "earth_env", "name": "Earth and Environmental Science", "units": 2 },
    { "id": "investigating_science", "name": "Investigating Science", "units": 2 }
  ],
  "technology": [
    { "id": "engineering_studies", "name": "Engineering Studies", "units": 2 },
    { "id": "software_engineering", "name": "Software Engineering", "units": 2, "_note": "Replaced Software Design and Development from 2024. First HSC exam 2025." },
    { "id": "enterprise_computing", "name": "Enterprise Computing", "units": 2, "_note": "Replaced Information Processes and Technology." },
    { "id": "design_technology", "name": "Design and Technology", "units": 2 }
  ],
  "english": {
    "required": true,
    "minUnits": 2,
    "options": [
      { "id": "english_standard", "name": "English Standard", "units": 2 },
      { "id": "english_advanced", "name": "English Advanced", "units": 2 },
      { "id": "english_ext1", "name": "English Extension 1", "units": 1, "requires": "english_advanced" },
      { "id": "english_eald", "name": "English EAL/D", "units": 2 }
    ]
  },
  "atarPattern": {
    "_source": "UAC ATAR eligibility",
    "minBoardDevelopedUnits": 10,
    "minEnglishUnits": 2,
    "minCoursesOfTwoOrMoreUnits": 3,
    "minSubjectAreas": 4,
    "countedUnits": { "english": 2, "remaining": 8 }
  },
  "retiredCourses": [
    { "name": "Software Design and Development", "retiredFrom": 2024, "replacedBy": "Software Engineering" },
    { "name": "Information Processes and Technology", "replacedBy": "Enterprise Computing" }
  ]
}
;
// NESA pattern-of-study and unit arithmetic.
// Unit values are CONTEXT-DEPENDENT. Do not hardcode a fixed unit count per subject.


const MATHS_LEVEL = {
  standard1: 1, standard2: 2, advanced: 3, advanced_ext1: 4, advanced_ext1_ext2: 5
};

/**
 * English is a hierarchy too. A course that assumes "English Standard" is satisfied by
 * English Advanced - holding a HIGHER course in the same subject is never a gap.
 * EAL/D is an alternative 2-unit English stream, not a lower one.
 */
const ENGLISH_SUBJECT_LEVEL = {
  'English Standard': 1, 'English EAL/D': 1, 'English Advanced': 2, 'English Extension 1': 3
};

function englishLevel(profile) {
  const held = (profile.english ?? []).map(id => ({
    english_standard: 1, english_eald: 1, english_advanced: 2, english_ext1: 3
  }[id] ?? 0));
  return held.length ? Math.max(...held) : 0;
}

// Maps an assumed-knowledge subject string to the maths level it demands.
const MATHS_SUBJECT_LEVEL = {
  'Mathematics Standard 1': 1, 'Mathematics Standard 2': 2, 'Mathematics Standard': 2,
  'Mathematics Advanced': 3, 'Mathematics Extension 1': 4, 'Mathematics Extension 2': 5
};

/** Subjects the student actually SITS. Critical: an Extension 2 student does not sit Mathematics Advanced. */
function subjectsHeld(profile) {
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

function mathsLevel(profile) {
  return MATHS_LEVEL[profile.mathsPathway] ?? 0;
}

/** Total Board Developed units, applying the Extension 2 recount. */
function unitCount(profile) {
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
function validateAtarPattern(profile) {
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
function discardBuffer(profile) {
  const units = unitCount(profile);
  const counted = subjects.atarPattern.countedUnits.english + subjects.atarPattern.countedUnits.remaining;
  return { totalUnits: units, countedUnits: counted, discardableUnits: Math.max(0, units - counted) };
}

// The readiness engine. Deterministic. NO model call in this path, ever.
// readiness(profile, course, ctx) -> { band, gateStatus, findings[], hurdles[], needsInput[], sources[] }


const BAND = { PREPARED: 0, MINOR_GAP: 1, BRIDGE_IT: 2, HARD_GAP: 3, GATED: 4 };
const BAND_NAME = ['PREPARED', 'MINOR_GAP', 'BRIDGE_IT', 'HARD_GAP', 'GATED'];

// Evidence tier of the SEVERITY CLAIM, not of the published fact.
//   A = published rule (the gate itself)
//   B = research-backed (ACDS/ACER: maths background predicts first-year pass rates independently of ATAR)
//   C = judgement (physics -> engineering, chemistry -> health)
// RULE: a Tier C claim may never produce HARD_GAP on its own. Judgement advises; only evidence or a rule alarms.
const MAX_BAND_FOR_TIER = { A: BAND.GATED, B: BAND.HARD_GAP, C: BAND.BRIDGE_IT };

function severityTier(subject) {
  return MATHS_SUBJECT_LEVEL[subject] !== undefined ? 'B' : 'C';
}

/**
 * Evaluate a hard prerequisite gate.
 * A route is UNAVAILABLE if the student does not sit that subject - which is how taking
 * Extension 2 removes the "Mathematics Advanced Band 4" route entirely.
 */
function evaluateGate(profile, gate) {
  const held = subjectsHeld(profile);
  const bands = profile.bands ?? {};
  const routes = gate.routes.map(r => {
    if (!held.has(r.subject)) return { ...r, status: 'unavailable', why: `Does not sit ${r.subject}.` };
    const b = bands[r.subject];
    if (b === undefined || b === null || b.band === undefined)
      return { ...r, status: 'unknown', why: `Sits ${r.subject}, but no expected band recorded.` };
    return b.band >= r.minBand
      ? { ...r, status: 'satisfied', why: `${r.subject} band ${b.band} meets the minimum of ${r.minBand}.` }
      : { ...r, status: 'failed', why: `${r.subject} band ${b.band} is below the minimum of ${r.minBand}.` };
  });
  let status = 'fail';
  if (routes.some(r => r.status === 'satisfied')) status = 'pass';
  else if (routes.some(r => r.status === 'unknown')) status = 'unconfirmed';
  return { status, routes, quote: gate.quote, source: gate.source };
}

function mathsFinding(profile, subject) {
  const required = MATHS_SUBJECT_LEVEL[subject];
  const have = mathsLevel(profile);
  const gap = required - have;
  if (gap <= 0) return null;
  return {
    subject, tier: 'B', gap,
    band: gap === 1 ? BAND.MINOR_GAP : BAND.HARD_GAP,
    why: gap === 1
      ? `One level below the assumed ${subject}. The university's own first-year revision material generally covers this.`
      : `${gap} levels below the assumed ${subject}. A short bridging course does not replace two years of study.`
  };
}

function englishFinding(profile, subject) {
  const required = ENGLISH_SUBJECT_LEVEL[subject];
  const have = englishLevel(profile);
  if (have >= required) return null;          // a higher English is never a gap
  return {
    subject, tier: 'C',
    band: BAND.MINOR_GAP,
    why: `Assumes ${subject}; the English course held sits below it.`
  };
}

function holdsAssumed(profile, held, ak) {
  if (ak.subject === 'any two units of Science')
    return (profile.sciences ?? []).length >= 2;
  return held.has(ak.subject);
}

function subjectFinding(profile, subject, ctx) {
  const bridging = ctx?.bridging;
  const canBridge = bridging?.subjects?.some(s => subject.toLowerCase().includes(s.toLowerCase()));
  const cost = canBridge && bridging.costAud ? ` (~${bridging.costAud}, ${bridging.timing})` : '';
  return {
    subject, tier: 'C',
    band: BAND.BRIDGE_IT,
    why: canBridge
      ? `Assumed but not held. A bridging course is offered${cost}.`
      : `Assumed but not held. No bridging course listed for this subject - expect a harder first year.`
  };
}

function readiness(profile, course, ctx = {}) {
  const held = subjectsHeld(profile);
  const findings = [];
  const satisfiedBy = [];   // non-obvious passes, recorded so a reasoned pass is never silence
  const needsInput = [];
  const sources = [];
  let gateStatus = 'none';
  let gateDetail = null;

  for (const gateId of course.hardRules ?? []) {
    const gate = ctx.gates?.[gateId];
    if (!gate) { needsInput.push(`Gate definition missing: ${gateId}`); continue; }
    const res = evaluateGate(profile, gate);
    gateDetail = res;
    if (gate.source) sources.push(gate.source);
    if (res.status === 'fail') { gateStatus = 'fail'; break; }
    if (res.status === 'unconfirmed') {
      gateStatus = 'unconfirmed';
      needsInput.push('Expected mathematics band');
    } else if (gateStatus === 'none') gateStatus = 'pass';
  }

  for (const ak of course.assumedKnowledge ?? []) {
    if (ak.source) sources.push(ak.source);

    // A student on a HIGHER maths pathway does not sit the assumed course at all, so there is
    // no band to compare. Extension 2 students never sit Mathematics Advanced. Treat the higher
    // pathway as satisfying the assumption - the same rule as "a higher course in the same
    // subject is never a gap" - but record WHY, so it is a reasoned pass and not silence.
    const assumedMaths = MATHS_SUBJECT_LEVEL[ak.subject];
    if (assumedMaths !== undefined && !held.has(ak.subject) && mathsLevel(profile) > assumedMaths) {
      satisfiedBy.push({
        subject: ak.subject,
        via: 'higher maths pathway',
        why: ak.minBand != null
          ? `Assumes ${ak.subject} at Band ${ak.minBand}. This student sits a higher maths course instead, so no ${ak.subject} band exists to compare.`
          : `Assumes ${ak.subject}. This student sits a higher maths course.`
      });
      continue;
    }

    if (holdsAssumed(profile, held, ak)) {
      if (ak.minBand != null && held.has(ak.subject)) {
        const b = (profile.bands ?? {})[ak.subject];
        if (b === undefined || b === null || b.band === undefined) {
          needsInput.push(`Expected ${ak.subject} band (minimum ${ak.minBand})`);
        } else if (b.band < ak.minBand) {
          const tier = severityTier(ak.subject);
          const raw = b.band <= ak.minBand - 2 ? BAND.HARD_GAP : BAND.MINOR_GAP;
          findings.push({
            subject: ak.subject,
            tier,
            // The tier cap applies here exactly as it does to a missing subject. A band
            // shortfall is still a severity CLAIM, and a Tier C claim may never alarm alone.
            band: Math.min(raw, MAX_BAND_FOR_TIER[tier]),
            quote: ak.quote,
            why: `${ak.subject} band ${b.band} is below the assumed minimum of Band ${ak.minBand}.`
          });
        }
      }
      continue;
    }
    const f = MATHS_SUBJECT_LEVEL[ak.subject] !== undefined
      ? mathsFinding(profile, ak.subject)
      : ENGLISH_SUBJECT_LEVEL[ak.subject] !== undefined
        ? englishFinding(profile, ak.subject)
        : subjectFinding(profile, ak.subject, ctx);
    if (!f) continue;
    const cap = MAX_BAND_FOR_TIER[severityTier(ak.subject)];
    f.band = Math.min(f.band, cap);
    f.quote = ak.quote;
    findings.push(f);
  }

  let band = findings.reduce((a, f) => Math.max(a, f.band), BAND.PREPARED);
  if (gateStatus === 'fail') band = BAND.GATED;

  // Fail safe on incomplete data. A record whose assumed knowledge was not fully
  // extracted must never read as PREPARED: "we found no requirements" and "there are
  // no requirements" are different claims, and only one of them is reassuring.
  const complete = (course.verification ?? 'unverified') === 'verified';
  if (!complete) {
    needsInput.push('Assumed knowledge for this course is not fully captured');
    if (course._completeness) needsInput.push(...course._completeness);
  }

  return {
    courseId: course.id,
    courseName: course.name,
    band, bandName: BAND_NAME[band],
    complete,
    gateStatus, gate: gateDetail,
    findings,
    satisfiedBy,
    hurdles: course.extraHurdles ?? [],   // never folded into the band
    needsInput,
    verification: course.verification ?? 'unverified',
    sources: [...new Set(sources)]
  };
}

/** View B: what a subject change costs. Run the engine twice and diff. */
function subjectChangeImpact(profileBefore, profileAfter, courses, ctx) {
  return courses.map(c => {
    const before = readiness(profileBefore, c, ctx);
    const after = readiness(profileAfter, c, ctx);
    return {
      courseId: c.id, courseName: c.name,
      before: before.bandName, after: after.bandName,
      changed: before.band !== after.band,
      worse: after.band > before.band
    };
  }).filter(r => r.changed);
}

/** View C: rank across the catalogue. Ranks WITHIN bands, never blends band with anything else. */
function shortlist(profile, courses, ctx) {
  return courses
    .map(c => readiness(profile, c, ctx))
    .sort((a, b) => a.band - b.band || a.courseName.localeCompare(b.courseName));
}

const CATALOGUE = [{"id":"mq-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"Macquarie University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"},{"subject":"Physics","quote":"Physics","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"},{"id":"mq-science","name":"Bachelor of Science","university":"Macquarie University","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"subject":"Physics","quote":"Physics","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"id":"mq-information-technology","name":"Bachelor of Information Technology","university":"Macquarie University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology"},{"id":"mq-cyber-security","name":"Bachelor of Cyber Security","university":"Macquarie University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security"},{"id":"mq-medical-sciences","name":"Bachelor of Medical Sciences","university":"Macquarie University","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences"},{"id":"unsw-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1, Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours","tier":"A"},{"subject":"Physics","quote":"Mathematics Extension 1, Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-medical-science","name":"Bachelor of Medical Science","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Chemistry","quote":"Chemistry, Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-science","tier":"A"},{"subject":"Mathematics Advanced","quote":"Chemistry, Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-renewable-energy-engineering","name":"Bachelor of Engineering (Honours) (Renewable Energy)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-nuclear-engineering","name":"Bachelor of Engineering (Honours) (Nuclear Engineering)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-robotics-and-mechatronics","name":"Bachelor of Engineering (Honours) (Robotics and Mechatronics)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-robotics-mechatronics","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-robotics-mechatronics","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-robotics-mechatronics","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-advanced-computer-science-honours","name":"Bachelor of Advanced Computer Science (Honours)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-computer-science-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-computer-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-engineering-science","name":"Bachelor of Engineering (Honours) / Bachelor of Engineering Science","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-engineering-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-engineering-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-engineering-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-exercise-science-m-physiotherapy-and-exercise-physiology","name":"Bachelor of Exercise Science / Master of Physiotherapy and Exercise Physiology","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-exercise-science-master-of-physiotherapy-and-exercise-physiology","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-exercise-science-master-of-physiotherapy-and-exercise-physiology","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-exercise-science-master-of-physiotherapy-and-exercise-physiology","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-applied-exercise-science-m-clinical-exercise-physiology","name":"Bachelor of Applied Exercise Science / Master of Clinical Exercise Physiology","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-applied-exercise-science-master-of-clinical-exercise-physiology","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-applied-exercise-science-master-of-clinical-exercise-physiology","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-applied-exercise-science-master-of-clinical-exercise-physiology","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-advanced-science-honours-computer-science","name":"Bachelor of Advanced Science (Honours)/Computer Science","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-materials-science-engineering-engineering-science","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering) / Engineering Science","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-commerce","name":"Bachelor of Engineering (Honours) / Commerce","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-commerce","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-commerce","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-science-advanced-mathematics-honours-science-computer-science","name":"Bachelor of Science (Advanced Mathematics)(Honours)/Science (Computer Science)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-mathematics-honours-computer-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-mathematics-honours-computer-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-science-advanced-mathematics-honours","name":"Bachelor of Science (Advanced Mathematics) (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-medical-studies-d-medicine","name":"Bachelor of Medical Studies / Doctor of Medicine","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"English Standard","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-studies-doctor-of-medicine","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-studies-doctor-of-medicine","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-medicinal-chemistry-honours","name":"Bachelor of Medicinal Chemistry (Honours)","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medicinal-chemistry-honours","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medicinal-chemistry-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medicinal-chemistry-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-science-honours","name":"Bachelor of Science (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"English","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-civil-surveying","name":"Bachelor of Engineering (Honours) (Civil) / Surveying","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-surveying","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-surveying","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-surveying","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-science","name":"Bachelor of Engineering (Honours) / Science","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-advanced-science-honours-engineering-honours","name":"Bachelor of Advanced Science (Honours)/Engineering (Honours)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-materials-science-engineering-commerce","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering) / Commerce","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-commerce","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-commerce","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-commerce","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-information-systems-co-op-honours","name":"Bachelor of Information Systems (Co-op) (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-computational-design-honours","name":"Bachelor of Computational Design (Honours)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-computational-design-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-advanced-science-honours","name":"Bachelor of Advanced Science (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-civil-engineering-with-architecture-honours","name":"Bachelor of Engineering (Civil Engineering with Architecture) (Honours)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-architecture","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-architecture","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-architecture","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-psychological-science-honours","name":"Bachelor of Psychological Science (Honours)","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-psychological-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-science-advanced-mathematics-honours-commerce","name":"Bachelor of Science (Advanced Mathematics) (Honours) / Commerce","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours-commerce","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours-commerce","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours-commerce","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-m-engineering-electrical-engineering","name":"Bachelor of Engineering (Honours) / Master of Engineering (Electrical Engineering)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-materials-science-engineering-m-biomedical-engineering","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering) / Master of Biomedical Engineering","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-psychological-science","name":"Bachelor of Psychological Science","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-psychological-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-psychological-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"unsw-engineering-honours-materials-science-engineering","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"}},{"id":"usyd-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1, Physics","tier":"A"},{"subject":"Physics","quote":"Mathematics Extension 1, Physics","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-advanced-computing","name":"Bachelor of Advanced Computing","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-chemical-engineering","name":"Bachelor of Engineering (Honours) (Chemical)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1, Chemistry","tier":"A"},{"subject":"Chemistry","quote":"Mathematics Extension 1, Chemistry","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"medium","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-biomedical-engineering","name":"Bachelor of Engineering (Honours) (Biomedical)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"medium","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-medical-science","name":"Bachelor of Science (Medical Science)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-pharmacy","name":"Bachelor of Pharmacy (Honours) / Master of Pharmacy Practice","university":"University of Sydney","field":"health","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-commerce-and-science","name":"Bachelor of Commerce and Bachelor of Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-advanced-computing-and-commerce","name":"Bachelor of Advanced Computing and Bachelor of Commerce","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-advanced-computing-and-science","name":"Bachelor of Advanced Computing and Bachelor of Science","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-advanced-computing-and-science-health","name":"Bachelor of Advanced Computing and Bachelor of Science (Health)","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-advanced-computing-and-science-medical-science","name":"Bachelor of Advanced Computing and Bachelor of Science (Medical Science)","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-aeronautical-engineering","name":"Bachelor of Engineering Honours (Aeronautical Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-civil-engineering","name":"Bachelor of Engineering Honours (Civil Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-civil-engineering-and-design-in-architecture","name":"Bachelor of Engineering Honours (Civil Engineering) and Bachelor of Design in Architecture","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-dalyell-scholars","name":"Bachelor of Engineering Honours (Dalyell Scholars)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-electrical-engineering","name":"Bachelor of Engineering Honours (Electrical Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-environmental-engineering","name":"Bachelor of Engineering Honours (Environmental Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-flexible-first-year","name":"Bachelor of Engineering Honours (Flexible First Year)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-mechanical-engineering","name":"Bachelor of Engineering Honours (Mechanical Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-mechatronic-engineering","name":"Bachelor of Engineering Honours (Mechatronic Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-software-engineering","name":"Bachelor of Engineering Honours (Software Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-and-arts","name":"Bachelor of Engineering Honours and Bachelor of Arts","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-and-commerce","name":"Bachelor of Engineering Honours and Bachelor of Commerce","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-and-project-management","name":"Bachelor of Engineering Honours and Bachelor of Project Management","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-and-science","name":"Bachelor of Engineering Honours and Bachelor of Science","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-biomedical-engineering-and-science-health","name":"Bachelor of Engineering Honours (Biomedical Engineering) and Bachelor of Science (Health)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-biomedical-engineering-and-science-medical-science","name":"Bachelor of Engineering Honours (Biomedical Engineering) and Bachelor of Science (Medical Science)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-with-space","name":"Bachelor of Engineering Honours with Space","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-project-management","name":"Bachelor of Project Management","university":"University of Sydney","field":"engineering","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-engineering-honours-and-laws","name":"Bachelor of Engineering Honours and Bachelor of Laws","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-laws","name":"Bachelor of Science and Bachelor of Laws","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-applied-science-diagnostic-radiography","name":"Bachelor of Applied Science (Diagnostic Radiography)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-applied-science-exercise-and-sport-science","name":"Bachelor of Applied Science (Exercise and Sport Science)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-applied-science-exercise-physiology","name":"Bachelor of Applied Science (Exercise Physiology)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-applied-science-occupational-therapy","name":"Bachelor of Applied Science (Occupational Therapy)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-applied-science-physiotherapy","name":"Bachelor of Applied Science (Physiotherapy)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-applied-science-speech-pathology","name":"Bachelor of Applied Science (Speech Pathology)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"English Advanced","quote":"English Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-biomedicine-and-health","name":"Bachelor of Biomedicine and Health","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-oral-health","name":"Bachelor of Oral Health","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-pharmacy-and-management-honours-and-m-pharmacy-practice","name":"Bachelor of Pharmacy and Management (Honours) and Master of Pharmacy Practice","university":"University of Sydney","field":"health","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-arts-and-m-nursing","name":"Bachelor of Arts and Master of Nursing","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-health-and-m-nursing","name":"Bachelor of Science (Health) and Master of Nursing","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-m-nursing","name":"Bachelor of Science and Master of Nursing","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-d-dental-medicine-no-intake-from-01-january-2027","name":"Bachelor of Science and Doctor of Dental Medicine [No intake from 01 January 2027]","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-d-medicine","name":"Bachelor of Science and Doctor of Medicine","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-m-nutrition-and-dietetics","name":"Bachelor of Science and Master of Nutrition and Dietetics","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-agricultural-science","name":"Bachelor of Agricultural Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-agricultural-science-honours","name":"Bachelor of Agricultural Science Honours","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-animal-and-veterinary-bioscience","name":"Bachelor of Animal and Veterinary Bioscience","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-liberal-arts-and-science","name":"Bachelor of Liberal Arts and Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-liberal-arts-and-science-advanced","name":"Bachelor of Liberal Arts and Science (Advanced)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-mathematical-sciences","name":"Bachelor of Mathematical Sciences","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-psychology","name":"Bachelor of Psychology","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-psychology-honours","name":"Bachelor of Psychology Honours","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science","name":"Bachelor of Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-advanced","name":"Bachelor of Science (Advanced)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-health","name":"Bachelor of Science (Health)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-advanced-studies","name":"Bachelor of Science and Bachelor of Advanced Studies","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-advanced-studies-advanced","name":"Bachelor of Science and Bachelor of Advanced Studies (Advanced)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-advanced-studies-dalyell-scholars","name":"Bachelor of Science and Bachelor of Advanced Studies (Dalyell Scholars)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-advanced-studies-health","name":"Bachelor of Science and Bachelor of Advanced Studies (Health)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-advanced-studies-medical-science","name":"Bachelor of Science and Bachelor of Advanced Studies (Medical Science)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-arts","name":"Bachelor of Science and Bachelor of Arts","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-and-m-mathematical-sciences","name":"Bachelor of Science and Master of Mathematical Sciences","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-veterinary-biology-and-d-veterinary-medicine","name":"Bachelor of Veterinary Biology and Doctor of Veterinary Medicine","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[{"type":"situational_judgement"}],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-wildlife-conservation-taronga","name":"Bachelor of Wildlife Conservation (Taronga)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-extended","name":"Bachelor of Science (Extended)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[{"type":"portfolio"},{"type":"interview"},{"type":"personal_statement"}],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"usyd-science-extended-health","name":"Bachelor of Science (Extended) (Health)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[{"type":"portfolio"},{"type":"interview"},{"type":"personal_statement"}],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"}},{"id":"uts-computing-science","name":"Bachelor of Computing Science","university":"University of Technology Sydney","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science"},{"id":"uts-information-technology","name":"Bachelor of Information Technology","university":"University of Technology Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology"},{"id":"uts-nursing","name":"Bachelor of Nursing","university":"University of Technology Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-nursing"},{"id":"uts-forensic-science","name":"Bachelor of Forensic Science","university":"University of Technology Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-forensic-science"},{"id":"uts-engineering-honours-flexible","name":"Bachelor of Engineering (Honours) (Flexible)","university":"University of Technology Sydney","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"Software Engineering","quote":"Software Engineering","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible"},{"id":"uts-engineering-honours-diploma-in-industry-practice-mechanical-mechatronic","name":"Bachelor of Engineering (Honours) Diploma in Industry Practice (Mechanical & Mechatronic)","university":"University of Technology Sydney","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"Software Engineering","quote":"Software Engineering","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic"},{"id":"wsu-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"},{"id":"wsu-science","name":"Bachelor of Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"two unit mathematics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","tier":"A"},{"subject":"English Standard","quote":"two unit English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","tier":"A"},{"subject":"any two units of Science","quote":"two unit science (any science)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science"},{"id":"wsu-medical-science","name":"Bachelor of Medical Science","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"two subject mathematics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","tier":"A"},{"subject":"English Standard","quote":"two unit English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","tier":"A"},{"subject":"any two units of Science","quote":"two unit science (any science)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science"},{"id":"wsu-computer-science","name":"Bachelor of Computer Science","university":"Western Sydney University","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"HSC Mathematics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science","tier":"A"},{"subject":"English Standard","quote":"any two units of HSC English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science"},{"id":"wsu-nursing","name":"Bachelor of Nursing","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-nursing"},{"id":"wsu-physiotherapy","name":"Bachelor of Physiotherapy","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"any 2 subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-physiotherapy","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-physiotherapy"},{"id":"wsu-advanced-science","name":"Bachelor of Advanced Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-advanced-science"},{"id":"wsu-applied-data-science","name":"Bachelor of Applied Data Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics equivalent to 2 Unit HSC","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-applied-data-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-applied-data-science"},{"id":"wsu-advanced-medical-science","name":"Bachelor of Advanced Medical Science","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science-advanced"},{"id":"wsu-cyber-security-and-behaviour","name":"Bachelor of Cyber Security and Behaviour","university":"Western Sydney University","field":"computing","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-cyber-security-and-behaviour"},{"id":"wsu-clinical-exercise-physiology","name":"Bachelor of Clinical Exercise Physiology","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-clinical-exercise-physiology","tier":"A"}],"recommendedStudies":[{"subject":"Biology","quote":"Biology","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-clinical-exercise-physiology"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-clinical-exercise-physiology"},{"id":"wsu-data-science","name":"Bachelor of Data Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-data-science"},{"id":"wsu-engineering-honours-materials-engineering","name":"Bachelor of Engineering (Honours) (Materials Engineering)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"},{"id":"wsu-engineering-honours-advanced-manufacturing-engineering","name":"Bachelor of Engineering (Honours) (Advanced Manufacturing Engineering)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"},{"id":"wsu-engineering-honours-construction-engineering","name":"Bachelor of Engineering (Honours) (Construction Engineering)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"}],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"},{"id":"uow-computer-science","name":"Bachelor of Computer Science","university":"University of Wollongong","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/","tier":"A"},{"subject":"Mathematics Standard 2","quote":"Mathematics Standard 2","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/"},{"id":"uow-information-technology","name":"Bachelor of Information Technology","university":"University of Wollongong","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-information-technology/"},{"id":"uow-mathematics","name":"Bachelor of Mathematics","university":"University of Wollongong","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-mathematics/"},{"id":"uow-nursing","name":"Bachelor of Nursing","university":"University of Wollongong","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/"},{"id":"uow-engineering-honours-mathematics","name":"Bachelor of Engineering (Honours) - Bachelor of Mathematics","university":"University of Wollongong","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"low","verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/"}];
const GATES = {"usyd-maths-gate":{"id":"usyd-maths-gate","quote":"Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/university-calendar/assumed-knowledge.pdf","routes":[{"subject":"Mathematics Advanced","minBand":4,"bandScale":"hsc"},{"subject":"Mathematics Extension 1","minBand":3,"bandScale":"extension"},{"subject":"Mathematics Extension 2","minBand":3,"bandScale":"extension"}]}};
const CAPTURED_ON = "2026-08-28";


const PAGE = document.body.dataset.page;
const BASE = document.body.dataset.base || '';

const MATHS = [
  ['standard1', 'Standard 1'],
  ['standard2', 'Standard 2'],
  ['advanced', 'Advanced'],
  ['advanced_ext1', 'Advanced + Ext 1'],
  ['advanced_ext1_ext2', 'Ext 1 + Ext 2']
];
const ENGLISH = [
  ['english_standard', 'Standard'],
  ['english_advanced', 'Advanced'],
  ['english_eald', 'EAL/D']
];
const BAND_LABEL = {
  PREPARED: 'ready now',
  MINOR_GAP: 'small gap',
  BRIDGE_IT: 'bridging course',
  HARD_GAP: 'hard gap',
  GATED: 'blocked'
};
const BAND_CLASS = {
  PREPARED: 's-prep',
  MINOR_GAP: 's-minor',
  BRIDGE_IT: 's-bridge',
  HARD_GAP: 's-hard',
  GATED: 's-gated'
};

let state = decodeState(location.hash);
let step = 0;
const STEPS = ['year', 'maths', 'english', 'sciences', 'technology', 'other'];

function profileFrom(s) {
  const other = Array.from({ length: s.otherCount || 0 }, (_, i) => ({
    name: `Other subject ${i + 1}`, units: 2, area: `other${i}`
  }));
  return {
    year: s.year,
    intakeYear: 2028,
    mathsPathway: s.mathsPathway,
    english: s.english,
    sciences: s.sciences,
    technology: s.technology,
    other,
    bands: s.bands
  };
}

function writeHash() {
  const next = encodeState(state);
  const want = next ? '#' + next : '';
  if (location.hash !== want) history.replaceState(null, '', (location.pathname + location.search) + want);
}

function resultsHref() {
  const h = encodeState(state);
  return BASE + 'results/' + (h ? '#' + h : '');
}

function homeHref() {
  const h = encodeState(state);
  return BASE + (h ? '#' + h : '');
}

function courseHref(id) {
  const h = encodeState(state);
  return BASE + 'course/' + id + '/' + (h ? '#' + h : '');
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function chip(label, on, onClick, opts = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = label;
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (opts.disabled) {
    b.disabled = true;
    if (opts.title) b.title = opts.title;
  } else {
    b.addEventListener('click', () => { onClick(); afterChange(); });
  }
  return b;
}

function toggle(arr, v) {
  const i = arr.indexOf(v);
  if (i < 0) arr.push(v); else arr.splice(i, 1);
}

function runCatalogue(p) {
  return CATALOGUE.map(c => {
    const r = readiness(p, c, { gates: GATES, bridging: c._bridging });
    return { ...r, university: c.university, course: c };
  });
}

function afterChange() {
  if (state.year === 11 && state.mathsPathway === 'advanced_ext1_ext2')
    state.mathsPathway = 'advanced_ext1';
  writeHash();
  render();
}

function unitsPanel() {
  const wrap = el('div', 'pk');
  wrap.dataset.units = '1';
  if (!state.mathsPathway || !state.english.length || !state.year) {
    wrap.appendChild(el('p', 'hint', 'Choose year, mathematics and English to start counting units.'));
    return wrap;
  }
  const pat = validateAtarPattern(profileFrom(state));
  const urow = el('div', 'units');
  const left = el('span');
  left.append('Units ', el('b', null, String(pat.units)), ' · subject areas ', el('b', null, String(pat.areas)));
  const right = el('span', pat.valid ? 'ok' : 'bad');
  right.textContent = pat.valid ? 'ATAR pattern OK' : 'ATAR pattern fails';
  urow.append(left, right);
  wrap.appendChild(urow);
  if (!pat.valid && pat.violations[0]) {
    const v = el('p', 'hint fail');
    v.textContent = pat.violations[0];
    wrap.appendChild(v);
  }
  return wrap;
}

function renderPicker(root, opts = {}) {
  const { showCta = true, stepped = false } = opts;
  root.replaceChildren();
  if (stepped) {
    const prog = el('div', 'progress');
    prog.textContent = `Question ${step + 1} of ${STEPS.length}`;
    root.appendChild(prog);
  }

  function stepBox(id, title, body) {
    const box = el('div', 'step pk');
    box.dataset.step = id;
    if (stepped && STEPS[step] === id) box.classList.add('is-on');
    box.appendChild(el('label', 'q', title));
    body(box);
    return box;
  }

  root.appendChild(stepBox('year', 'Year', box => {
    const c = el('div', 'chips');
    [11, 12].forEach(y => c.appendChild(chip('Year ' + y, state.year === y, () => { state.year = y; })));
    box.appendChild(c);
  }));

  root.appendChild(stepBox('maths', 'Which mathematics?', box => {
    const c = el('div', 'chips');
    MATHS.forEach(([k, l]) => {
      const locked = k === 'advanced_ext1_ext2' && state.year === 11;
      c.appendChild(chip(l, state.mathsPathway === k, () => { state.mathsPathway = k; }, {
        disabled: locked,
        title: locked ? 'Extension 2 is a Year 12 course' : ''
      }));
    });
    box.appendChild(c);
    if (state.year === 11) {
      box.appendChild(el('p', 'hint', 'Extension 2 is a Year 12 course, so it is not available in Year 11.'));
    }
  }));

  root.appendChild(stepBox('english', 'English', box => {
    const c = el('div', 'chips');
    ENGLISH.forEach(([k, l]) => c.appendChild(chip(l, state.english[0] === k, () => { state.english = [k]; })));
    box.appendChild(c);
  }));

  root.appendChild(stepBox('sciences', 'Sciences', box => {
    const c = el('div', 'chips');
    subjects.sciences.forEach(s => {
      const label = s.name === 'Earth and Environmental Science' ? 'Earth & env.'
        : s.name === 'Investigating Science' ? 'Investigating' : s.name;
      c.appendChild(chip(label, state.sciences.includes(s.id), () => toggle(state.sciences, s.id)));
    });
    box.appendChild(c);
  }));

  root.appendChild(stepBox('technology', 'Technology', box => {
    const c = el('div', 'chips');
    subjects.technology.forEach(t => {
      const label = t.name === 'Engineering Studies' ? 'Eng. Studies'
        : t.name === 'Software Engineering' ? 'Software Eng.'
          : t.name === 'Enterprise Computing' ? 'Enterprise Comp.'
            : t.name === 'Design and Technology' ? 'Design & Tech' : t.name;
      c.appendChild(chip(label, state.technology.includes(t.id), () => toggle(state.technology, t.id)));
    });
    box.appendChild(c);
  }));

  const other = stepBox('other', 'Anything else', box => {
    box.appendChild(el('p', 'hint', 'No effect on STEM readiness — only counted for your ATAR pattern.'));
    const row = el('div', 'units');
    const st = el('div', 'stepper');
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−';
    minus.setAttribute('aria-label', 'One fewer other subject');
    minus.addEventListener('click', () => { state.otherCount = Math.max(0, state.otherCount - 1); afterChange(); });
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+';
    plus.setAttribute('aria-label', 'One more other subject');
    plus.addEventListener('click', () => { state.otherCount = Math.min(4, state.otherCount + 1); afterChange(); });
    const n = el('b', null, String(state.otherCount));
    st.append(minus, n, plus);
    row.append(el('span', 'mono', 'other 2-unit subjects'), st);
    box.appendChild(row);
    if (showCta) {
      const cta = el('div', 'cta-wrap');
      const go = el('button', 'btn', "See what's open to you");
      go.type = 'button';
      go.disabled = !isCompleteSelection(state);
      go.addEventListener('click', () => { writeHash(); location.href = resultsHref(); });
      cta.appendChild(go);
      box.appendChild(cta);
    }
  });
  root.appendChild(other);
  root.appendChild(unitsPanel());

  if (stepped) {
    const nav = el('div', 'step-nav');
    const back = el('button', 'btn ghost', 'Back');
    back.type = 'button';
    back.disabled = step === 0;
    back.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    const next = el('button', 'btn', step === STEPS.length - 1 ? "See what's open to you" : 'Next');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (step === STEPS.length - 1) {
        if (!isCompleteSelection(state)) return;
        writeHash();
        location.href = resultsHref();
        return;
      }
      step = Math.min(STEPS.length - 1, step + 1);
      render();
    });
    if (step === STEPS.length - 1) next.disabled = !isCompleteSelection(state);
    nav.append(back, next);
    root.appendChild(nav);
  } else if (showCta) {
    const cta = el('div', 'cta-wrap');
    const go = el('button', 'btn', "See what's open to you");
    go.type = 'button';
    go.disabled = !isCompleteSelection(state);
    go.addEventListener('click', () => { writeHash(); location.href = resultsHref(); });
    cta.appendChild(go);
    root.appendChild(cta);
  }
}

function captureDate(course) {
  return course.capturedOn || CAPTURED_ON;
}

function courseCard(r, opts = {}) {
  const row = el('article', 'row b-' + r.bandName);
  const hd = el('div', 'hd');
  const nm = el('span', 'nm');
  const a = document.createElement('a');
  a.href = courseHref(r.courseId);
  a.textContent = r.courseName;
  nm.appendChild(a);
  const right = el('span', 'uni');
  right.appendChild(el('span', 'tag t-' + r.bandName, bandLabel(r)));
  right.appendChild(document.createTextNode(' ' + r.university));
  hd.append(nm, right);
  row.appendChild(hd);

  (r.hurdles || []).forEach(h => {
    const t = typeof h === 'string' ? h : (h.type || h.name || 'extra requirement');
    row.appendChild(el('span', 'tag t-flag', t));
  });

  if (!r.complete) {
    row.appendChild(el('p', 'why', 'We could not fully read this university’s page — this is not a clear result.'));
  }
  r.findings.forEach(f => {
    row.appendChild(el('p', 'why', f.why));
    if (f.quote) row.appendChild(el('p', 'quote', '“' + f.quote + '”'));
  });
  (r.satisfiedBy || []).forEach(s => {
    row.appendChild(el('p', 'pass', s.why));
  });
  // Only mention the university's bridging courses when they actually cover the missing
  // subject. Saying "no bridging course for this subject" and then listing the university's
  // bridging courses in the next line reads as a contradiction to the person it is for.

/**
 * The band is BRIDGE_IT whenever a Tier C gap is capped there, whether or not this
 * university actually offers bridging in the missing subject. Labelling it "bridging course"
 * when no such course exists promises a remedy that is not on offer, so the label follows
 * the facts rather than the enum.
 */
function bandLabel(r) {
  if (r.bandName !== 'BRIDGE_IT') return BAND_LABEL[r.bandName];
  const subs = r.course?._bridging?.subjects || [];
  const gaps = (r.findings || []).map(f => f.subject);
  const covered = gaps.some(g => subs.some(b => g.toLowerCase().includes(b.toLowerCase())));
  return covered ? 'bridging course' : 'harder first year';
}

  const bridging = r.course?._bridging;
  if (r.bandName === 'BRIDGE_IT' && bridging?.subjects?.length) {
    const gaps = (r.findings || []).map(f => f.subject);
    const covered = gaps.filter(g => bridging.subjects.some(b => g.toLowerCase().includes(b.toLowerCase())));
    if (covered.length) {
      row.appendChild(el('p', 'why',
        `Bridging is offered in ${covered.join(' and ')} (about $${bridging.costAud}, ${bridging.timing || 'timing unpublished'}).`));
    } else if (gaps.length) {
      row.appendChild(el('p', 'why',
        `This university's bridging courses cover ${bridging.subjects.join(', ')} — not ${gaps.join(' or ')}.`));
    }
  }
  const srcs = new Set();
  (r.course?.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
  if (r.gate?.source) srcs.add(r.gate.source);
  if (opts.sources && srcs.size) {
    const p = el('p', 'src');
    const date = captureDate(r.course);
    p.append('Captured ' + date + '. ');
    [...srcs].slice(0, 2).forEach((u, i) => {
      if (i) p.append(' ');
      const l = document.createElement('a');
      l.href = u; l.target = '_blank'; l.rel = 'noopener';
      l.textContent = 'Source';
      p.appendChild(l);
    });
    row.appendChild(p);
  }
  return row;
}

function subjectChips() {
  const labels = [];
  if (state.year) labels.push('Year ' + state.year);
  const ml = MATHS.find(([k]) => k === state.mathsPathway);
  if (ml) labels.push(ml[1]);
  const elab = ENGLISH.find(([k]) => k === state.english[0]);
  if (elab) labels.push('English ' + elab[1]);
  state.sciences.forEach(id => {
    const s = subjects.sciences.find(x => x.id === id);
    if (s) labels.push(s.name);
  });
  state.technology.forEach(id => {
    const t = subjects.technology.find(x => x.id === id);
    if (t) labels.push(t.name);
  });
  if (state.otherCount) labels.push(state.otherCount + ' other');
  return labels;
}

function renderHome() {
  const picker = document.getElementById('picker');
  picker.dataset.mode = 'steps';
  renderPicker(picker, { showCta: true, stepped: true });
}

function renderResults() {
  const main = document.getElementById('results');
  if (!isCompleteSelection(state)) {
    main.replaceChildren();
    main.appendChild(el('p', 'lede', "Choose your subjects to see what's open to you."));
    const go = el('a', 'btn');
    go.href = homeHref();
    go.textContent = 'Choose your subjects';
    go.style.display = 'inline-block';
    go.style.textDecoration = 'none';
    main.appendChild(go);
    return;
  }

  const p = profileFrom(state);
  const results = runCatalogue(p);
  const order = ['PREPARED', 'MINOR_GAP', 'BRIDGE_IT', 'HARD_GAP', 'GATED'];
  const attention = results.filter(r => r.bandName !== 'PREPARED' || !r.complete);
  const prepared = results.filter(r => r.bandName === 'PREPARED' && r.complete);
  const byBand = Object.fromEntries(order.map(b => [b, results.filter(r => r.bandName === b)]));

  main.replaceChildren();

  const strip = el('div', 'strip');
  const inner = el('div', 'strip-inner');
  subjectChips().forEach(l => {
    const c = el('span', 'chip');
    c.textContent = l;
    inner.appendChild(c);
  });
  const edit = el('button', 'btn ghost', 'Edit subjects');
  edit.type = 'button';
  edit.addEventListener('click', () => {
    const d = document.getElementById('editor');
    d.hidden = !d.hidden;
    if (!d.hidden) {
      d.replaceChildren();
      renderPicker(d, { showCta: false, stepped: false });
    }
  });
  const copy = el('button', 'btn ghost', 'Copy link');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy link'; }, 1500);
    } catch {
      copy.textContent = 'Copy the address bar';
    }
  });
  inner.append(edit, copy);
  strip.appendChild(inner);
  main.appendChild(strip);

  const editor = el('div', 'drawer');
  editor.id = 'editor';
  editor.hidden = true;
  main.appendChild(editor);

  const gatedAsk = results.some(r => r.needsInput.some(x => /band/i.test(x)));
  if (gatedAsk) {
    const bd = el('div', 'bandask');
    bd.appendChild(el('label', 'q', 'Expected maths band'));
    bd.appendChild(el('p', 'hint', 'A course on your list is gated on a mark, not a subject. This is the only thing in NSW that can turn you away. You can skip this if you do not know yet.'));
    const target = state.mathsPathway === 'advanced_ext1_ext2' ? 'Mathematics Extension 1'
      : state.mathsPathway === 'advanced_ext1' ? 'Mathematics Extension 1'
        : 'Mathematics Advanced';
    const scale = /Extension/.test(target) ? 'extension' : 'hsc';
    const opts = scale === 'extension'
      ? [['E4', 4], ['E3', 3], ['E2', 2]]
      : [['Band 6', 6], ['Band 5', 5], ['Band 4', 4], ['Band 3', 3]];
    const c = el('div', 'chips');
    opts.forEach(([lbl, v]) => c.appendChild(chip(lbl, state.bands[target]?.band === v, () => {
      state.bands = { ...state.bands };
      if (state.bands[target]?.band === v) delete state.bands[target];
      else state.bands[target] = { band: v, scale };
    })));
    bd.appendChild(c);
    main.appendChild(bd);
  }

  main.appendChild(el('p', 'honest',
    'Most of what follows is open to you. That is the normal answer in New South Wales — universities publish assumed knowledge rather than hard prerequisites, so subjects rarely stop you being admitted. What matters is the short list that is not open, and why.'));

  const sum = el('div', 'summary');
  order.forEach(b => {
    const n = byBand[b].length;
    if (!n) return;
    const s = el('div', 'stat ' + BAND_CLASS[b]);
    s.appendChild(el('span', 'n', String(n)));
    s.appendChild(el('span', 'l', BAND_LABEL[b]));
    sum.appendChild(s);
  });
  main.appendChild(sum);

  const sec1 = el('section');
  const h1 = el('div', 'sh');
  h1.appendChild(el('h2', null, attention.length ? 'What needs attention' : 'Nothing needs attention'));
  h1.appendChild(el('span', 'count', attention.length ? attention.length + ' of ' + results.length : results.length + ' courses, no gaps'));
  sec1.appendChild(h1);
  if (attention.length) {
    const missing = {};
    attention.forEach(r => r.findings.forEach(f => { missing[f.subject] = (missing[f.subject] || 0) + 1; }));
    const parts = Object.entries(missing).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} (${n})`);
    if (parts.length) {
      const l = el('p', 'lede');
      l.textContent = 'Every gap on your list comes down to: ' + parts.join(', ') + '.';
      sec1.appendChild(l);
    }
    const rows = el('div', 'rows');
    attention.forEach(r => rows.appendChild(courseCard(r, { sources: true })));
    sec1.appendChild(rows);
  } else {
    sec1.appendChild(el('p', 'lede', 'Your subject set meets the published assumed knowledge for every fully captured course in the catalogue.'));
  }
  main.appendChild(sec1);

  const candidates = [
    ...state.sciences.map(s => ({ kind: 'sciences', id: s, label: subjects.sciences.find(x => x.id === s).name })),
    ...state.technology.map(t => ({ kind: 'technology', id: t, label: subjects.technology.find(x => x.id === t).name }))
  ];
  if (state.otherCount > 0) candidates.push({ kind: 'other', id: null, label: 'One other subject' });
  if (candidates.length) {
    const sec2 = el('section');
    const h2 = el('div', 'sh');
    h2.appendChild(el('h2', null, 'If you dropped one'));
    sec2.appendChild(h2);
    sec2.appendChild(el('p', 'lede', 'Each subject re-run against all ' + results.length + ' courses. This is the question Year 11 actually has to answer.'));
    const wrap = el('div', 'drops');
    candidates.forEach(c => {
      const altState = {
        ...state,
        sciences: c.kind === 'sciences' ? state.sciences.filter(x => x !== c.id) : state.sciences,
        technology: c.kind === 'technology' ? state.technology.filter(x => x !== c.id) : state.technology,
        otherCount: c.kind === 'other' ? Math.max(0, state.otherCount - 1) : state.otherCount
      };
      const alt = profileFrom(altState);
      const after = runCatalogue(alt);
      let worse = 0;
      after.forEach((a, i) => { if (a.band > results[i].band) worse++; });
      const altPat = validateAtarPattern(alt);
      const d = el('div', 'drop');
      d.appendChild(el('b', null, c.label));
      const delta = el('span', 'delta ' + (worse ? 'cost' : 'free'));
      delta.textContent = worse ? worse + ' courses worse' : 'nothing changes';
      d.appendChild(delta);
      if (!altPat.valid) {
        const w = el('span', 'delta cost');
        w.textContent = '· ATAR pattern fails';
        d.appendChild(w);
      }
      wrap.appendChild(d);
    });
    sec2.appendChild(wrap);
    main.appendChild(sec2);
  }

  const hasRecognition = CATALOGUE.some(c => c.nameRecognition);
  if (hasRecognition) {
    const unfamiliar = prepared.filter(r => r.course.nameRecognition === 'low');
    if (unfamiliar.length) {
      const sec3 = el('section');
      const h3 = el('div', 'sh');
      h3.appendChild(el('h2', null, 'Open to you, and probably unfamiliar'));
      h3.appendChild(el('span', 'count', unfamiliar.length + ' of ' + prepared.length + ' ready now'));
      sec3.appendChild(h3);
      sec3.appendChild(el('p', 'lede', 'Narrower degrees mean smaller cohorts and fewer exits if you change your mind. You cannot search for a degree whose name you have never heard.'));
      const rows = el('div', 'rows');
      unfamiliar.slice(0, 24).forEach(r => rows.appendChild(courseCard(r)));
      sec3.appendChild(rows);
      main.appendChild(sec3);
    }
    const rest = prepared.filter(r => r.course.nameRecognition !== 'low');
    if (rest.length) foldPrepared(main, rest, 'Everything else you are ready for');
  } else if (prepared.length) {
    foldPrepared(main, prepared, 'Everything else you are ready for');
  }

  const foot = document.getElementById('foot');
  const srcs = new Set();
  results.forEach(r => {
    (r.course.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
    if (r.gate?.source) srcs.add(r.gate.source);
  });
  foot.replaceChildren();
  foot.appendChild(el('p', null,
    'Not UAC and not a university. Rules as at ' + CAPTURED_ON + '. Confirm every preference on UAC and the university handbook before you apply. Your subjects stay in the address hash — they are never sent to a server.'));
  const ul = document.createElement('ul');
  [...srcs].slice(0, 12).forEach(u => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = u; a.textContent = u;
    li.appendChild(a);
    ul.appendChild(li);
  });
  if (srcs.size) foot.appendChild(ul);
}

function foldPrepared(main, list, title) {
  const det = document.createElement('details');
  det.className = 'fold';
  const sm = document.createElement('summary');
  sm.appendChild(document.createTextNode(title));
  sm.appendChild(el('span', 'hint', list.length + ' courses'));
  det.appendChild(sm);
  const body = el('div', 'foldbody');
  const unis = [...new Set(list.map(r => r.university))].sort();
  unis.forEach(u => {
    const g = el('div', 'unigroup');
    g.appendChild(el('h3', null, u));
    const cl = el('div', 'clist');
    list.filter(r => r.university === u).forEach(r => {
      const a = document.createElement('a');
      a.href = courseHref(r.courseId);
      a.textContent = r.courseName.replace(/^Bachelor of /, '');
      cl.appendChild(a);
    });
    g.appendChild(cl);
    body.appendChild(g);
  });
  det.appendChild(body);
  const sec = el('section');
  sec.appendChild(det);
  main.appendChild(sec);
}

function render() {
  if (PAGE === 'home') renderHome();
  else if (PAGE === 'results') renderResults();
}

window.addEventListener('hashchange', () => {
  state = decodeState(location.hash);
  render();
});

render();
