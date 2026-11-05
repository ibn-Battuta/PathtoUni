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

const FIELD_TO_HASH = {
  engineering: 'eng',
  computing: 'comp',
  science: 'sci',
  health: 'health'
};
const HASH_TO_FIELD = {
  eng: 'engineering',
  comp: 'computing',
  sci: 'science',
  health: 'health'
};
const UNI_TO_HASH = {
  UNSW: 'unsw',
  'University of Sydney': 'usyd',
  'University of Technology Sydney': 'uts',
  'Macquarie University': 'mq',
  'Western Sydney University': 'wsu',
  'University of Wollongong': 'uow'
};
const HASH_TO_UNI = Object.fromEntries(Object.entries(UNI_TO_HASH).map(([k, v]) => [v, k]));

function emptyState() {
  return {
    year: null,
    mathsPathway: null,
    english: [],
    sciences: [],
    technology: [],
    otherCount: 0,
    bands: {},
    filterField: null,
    filterUni: null,
    interests: [],
    industry: null
  };
}

// Interests and the chosen industry sort results; they never change a band. Both are
// short ids, validated against a fixed list, so nothing a reader types reaches the page.
const INTEREST_IDS = ['ai', 'data', 'cyber', 'electronics', 'robotics', 'space', 'energy', 'materials', 'build', 'bio', 'health', 'mind', 'nature'];
const INDUSTRY_IDS = ['ai', 'quantum', 'chips', 'energy', 'space', 'robotics', 'biotech', 'minerals', 'manufacturing'];

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
  const f = FIELD_TO_HASH[state.filterField];
  if (f) p.set('f', f);
  const u = UNI_TO_HASH[state.filterUni];
  if (u) p.set('u', u);
  const i = (state.interests ?? []).filter(x => INTEREST_IDS.includes(x)).slice(0, 3);
  if (i.length) p.set('i', i.join(','));
  if (INDUSTRY_IDS.includes(state.industry)) p.set('x', state.industry);
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
  const f = p.get('f');
  if (f && HASH_TO_FIELD[f]) state.filterField = HASH_TO_FIELD[f];
  const u = p.get('u');
  if (u && HASH_TO_UNI[u]) state.filterUni = HASH_TO_UNI[u];
  const i = p.get('i');
  if (i) state.interests = [...new Set(i.split(',').map(x => x.trim()).filter(x => INTEREST_IDS.includes(x)))].slice(0, 3);
  const x = p.get('x');
  if (x && INDUSTRY_IDS.includes(x)) state.industry = x;
  return state;
}

const B_PREFIX = { y: 'by', m: 'bm', e: 'be', s: 'bs', t: 'bt', o: 'bo', b: 'bb' };

function encodeCompare(a, b) {
  const p = new URLSearchParams(encodeState(a));
  if (!isCompleteSelection(b)) return p.toString();
  const right = new URLSearchParams(encodeState(b));
  for (const [k, v] of right.entries()) {
    const pk = B_PREFIX[k];
    if (pk) p.set(pk, v);
  }
  return p.toString();
}

function decodeSetB(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  if (![...Object.values(B_PREFIX)].some(k => p.has(k))) return null;
  const fake = new URLSearchParams();
  for (const [k, pk] of Object.entries(B_PREFIX)) {
    if (p.has(pk)) fake.set(k, p.get(pk));
  }
  return decodeState(fake.toString());
}

// Institution-level early-entry schemes. Not a band. No likelihood, no score, no colour.

const USES_ENGLISH = {
  year11_academic: 'Year 11 academic results',
  extracurricular: 'extracurricular activities',
  casual_work: 'casual work',
  community_involvement: 'community involvement',
  hsc_subject_bands: 'HSC subject band outcomes',
  year11_studies: 'Year 11 studies',
  school_ratings: 'school ratings',
  year11_results: 'Year 11 results',
  skills_experience: 'skills and experience',
  year11_subject_results: 'Year 11 subject results'
};

function usesEnglish(uses) {
  return (uses ?? []).map(u => USES_ENGLISH[u] || u.replace(/_/g, ' '));
}

function universityMatches(courseUniversity, schemeUniversity) {
  const a = String(courseUniversity || '').toLowerCase();
  const b = String(schemeUniversity || '').toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function isDisplayableScheme(s) {
  return Boolean(s && s.verification === 'verified' && s.quote);
}

function displayableSchemes(file) {
  return (file?.schemes ?? []).filter(isDisplayableScheme);
}

function schemesForUniversity(university, file) {
  return displayableSchemes(file).filter(s => universityMatches(university, s.university));
}

/** Present-tense vs "as at <date> — confirm…" once past stalenessDays. Capture date is always shown. */
function staleNote(scheme, file, now = new Date()) {
  const iso = scheme.capturedOn || file?.capturedOn;
  if (!iso) return null;
  const captured = Date.parse(iso + 'T00:00:00Z');
  if (Number.isNaN(captured)) return null;
  const days = scheme.stalenessDays ?? file?.stalenessDays ?? 180;
  const age = (now.getTime() - captured) / 86400000;
  if (age <= days) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pretty = `${d} ${months[m - 1]} ${y}`;
  return `as at ${pretty} — confirm the current round with the university`;
}

const TRUE_REWARD_CAVEAT =
  'Western Sydney may offer you a place based on your subject results instead of your ATAR: a conditional offer on Year 11 results, or an unconditional one on Year 12 results. The university publishes which results count for which course — we have not captured that table, so check its page.';

// Two subject sets, no winner. Restricted and incomplete courses are unknown on both sides.

function compareResults(left, right) {
  const byId = new Map(right.map(r => [r.courseId, r]));
  const usable = [];
  const skipped = [];
  for (const a of left) {
    const b = byId.get(a.courseId);
    if (!b) continue;
    if (a.restrictedTo || b.restrictedTo) { skipped.push(a.courseId); continue; }
    if (!a.complete || !b.complete) { skipped.push(a.courseId); continue; }
    usable.push({ a, b, course: a.course });
  }
  const same = usable.filter(p => p.a.band === p.b.band);
  const aOpens = usable.filter(p => p.a.band < p.b.band);
  const bOpens = usable.filter(p => p.b.band < p.a.band);
  return {
    total: usable.length,
    same,
    aOpens,
    bOpens,
    skipped: skipped.length
  };
}

// View filter, not a band. Choosing Engineering hides Science from this screen;
// it does not delete Science from the catalogue or change any readiness result.

const FIELDS = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'computing', label: 'Computing' },
  { id: 'science', label: 'Science' },
  { id: 'health', label: 'Health' }
];

const UNI_FILTER = [
  { id: 'UNSW', label: 'UNSW' },
  { id: 'University of Sydney', label: 'Sydney' },
  { id: 'University of Technology Sydney', label: 'UTS' },
  { id: 'Macquarie University', label: 'Macquarie' },
  { id: 'Western Sydney University', label: 'Western Sydney' },
  { id: 'University of Wollongong', label: 'Wollongong' }
];

function courseField(r) {
  return r.course?.field || r.field || 'science';
}

function applyClassifier(results, { field, university } = {}) {
  return (results ?? []).filter(r => {
    if (field && courseField(r) !== field) return false;
    if (university && r.university !== university) return false;
    return true;
  });
}

function fieldCounts(results) {
  const out = {};
  for (const f of FIELDS) out[f.id] = 0;
  for (const r of results ?? []) {
    const id = courseField(r);
    if (out[id] == null) out[id] = 0;
    out[id]++;
  }
  return out;
}

function uniCounts(results) {
  const out = {};
  for (const u of UNI_FILTER) out[u.id] = 0;
  for (const r of results ?? []) {
    if (out[r.university] == null) out[r.university] = 0;
    out[r.university]++;
  }
  return out;
}

// Interests and industries. A sort, never a filter and never a band.
//
// Topics are matched from a course's own name with plain rules, so anyone can see why a
// course was tagged. That makes the tagging our judgement, not the university's, and the
// page says so. A course whose name names no topic ("Bachelor of Science") is BROAD: you
// pick a major later. Broad degrees are never scored and never sunk; they are listed apart
// so a vague name does not read as "not for you".

const TOPICS = [
  { id: 'ai', label: 'Coding, software and AI', match: /comput|software|information technology|information systems|data science/i, broadFields: ['science', 'engineering'] },
  { id: 'data', label: 'Maths and data', match: /mathemat|data science|statistic|actuar/i, broadFields: ['science'] },
  { id: 'cyber', label: 'Cyber security', match: /cyber/i, broadFields: [] },
  { id: 'electronics', label: 'Electronics and electricity', match: /electrical|electronic/i, broadFields: ['engineering'] },
  { id: 'robotics', label: 'Robots and machines', match: /robot|mechatronic|mechanical|manufactur/i, broadFields: ['engineering'] },
  { id: 'space', label: 'Space and flight', match: /space|aeronaut|aerospace/i, broadFields: ['engineering'] },
  { id: 'energy', label: 'Energy', match: /renewable|nuclear|electrical|chemical/i, broadFields: ['engineering', 'science'] },
  { id: 'materials', label: 'Materials and making things', match: /materials|manufactur|chemical/i, broadFields: ['engineering', 'science'] },
  { id: 'build', label: 'Buildings, bridges and cities', match: /civil|construction|surveying|architect/i, broadFields: ['engineering'] },
  { id: 'bio', label: 'Living things and biotech', match: /biomedic|bioscience|medicinal chem|agricultur|veterinar|forensic|biomedicine|medical scien/i, broadFields: ['science'] },
  { id: 'health', label: 'Health and caring for people', match: /nursing|medicine|medical studies|physio|pharmacy|exercise|occupational|speech|radiograph|oral health|dental|nutrition|\(health\)/i, broadFields: [] },
  { id: 'mind', label: 'How people think and behave', match: /psycholog|behaviour/i, broadFields: ['science'] },
  { id: 'nature', label: 'Nature and the environment', match: /environment|wildlife|agricultur|conservation/i, broadFields: ['science'] }
];

const TOPIC_IDS = TOPICS.map(t => t.id);

function topicLabel(id) {
  return TOPICS.find(t => t.id === id)?.label ?? id;
}

/** Topics a course's own name points to. Empty means broad. */
function courseTopics(course) {
  const name = String(course?.name ?? '');
  return TOPICS.filter(t => t.match.test(name)).map(t => t.id);
}

// Broad means "you choose the focus later": a general science or engineering degree.
// A name with no topic that is not science or engineering (Project Management) is not
// broad — it simply matches nothing, and it is still in every results list.
const BROAD_NAME = /science|engineering/i;

function isBroad(course) {
  return courseTopics(course).length === 0 && BROAD_NAME.test(String(course?.name ?? ''));
}

// Ten this-or-that picks. Questions, not claims: nothing here is stated as fact.
// Every topic is offered at least twice. A topic offered once can never outrank one
// picked twice, so before 23 Oct 2026 a student who loved building could not get it
// as their top area (error 20).
const QUIZ = [
  [{ text: 'Build a robot that can walk', topics: ['robotics'] },
   { text: 'Work out why some people get sick and others do not', topics: ['health', 'bio'] }],
  [{ text: 'Write code for an app millions of people use', topics: ['ai'] },
   { text: 'Design a bridge that survives an earthquake', topics: ['build'] }],
  [{ text: 'Find a pattern hidden in a huge pile of numbers', topics: ['data'] },
   { text: 'Grow a crop that survives a drought', topics: ['nature', 'bio'] }],
  [{ text: 'Design a rocket or a satellite', topics: ['space'] },
   { text: 'Invent a better battery', topics: ['energy', 'materials'] }],
  [{ text: 'Stop hackers breaking into a hospital’s computers', topics: ['cyber'] },
   { text: 'Help someone who feels anxious feel better', topics: ['mind', 'health'] }],
  [{ text: 'Understand why people make the choices they do', topics: ['mind'] },
   { text: 'Work out how the circuits in your phone work', topics: ['electronics'] }],
  [{ text: 'Make a material stronger than steel and lighter than plastic', topics: ['materials'] },
   { text: 'Teach a computer to recognise voices', topics: ['ai'] }],
  [{ text: 'Protect an endangered animal', topics: ['nature'] },
   { text: 'Design a city that runs on wind and solar power', topics: ['energy', 'build'] }],
  [{ text: 'Design aircraft and drones', topics: ['space', 'robotics'] },
   { text: 'Study cells and DNA in a lab', topics: ['bio'] }],
  [{ text: 'Crack a secret code', topics: ['cyber', 'data'] },
   { text: 'Take a machine apart and make it work better', topics: ['robotics', 'electronics'] }]
];

/**
 * answers: array the length of QUIZ, each 0, 1 or null (skipped).
 * Returns up to three topic ids, strongest first. Ties go to the topic picked more
 * often relative to how often it was offered, then to TOPICS order, so the result is
 * the same every time for the same answers.
 */
function scoreQuiz(answers) {
  const picks = {}, offered = {};
  QUIZ.forEach((pair, i) => {
    pair.forEach(opt => opt.topics.forEach(t => { offered[t] = (offered[t] || 0) + 1; }));
    const a = answers?.[i];
    if (a === 0 || a === 1) pair[a].topics.forEach(t => { picks[t] = (picks[t] || 0) + 1; });
  });
  return TOPIC_IDS
    .filter(t => picks[t] > 0)
    .sort((x, y) => (picks[y] - picks[x])
      || (picks[y] / offered[y] - picks[x] / offered[x])
      || (TOPIC_IDS.indexOf(x) - TOPIC_IDS.indexOf(y)))
    .slice(0, 3);
}

/** Topics a chosen industry points to, or [] when none is chosen. */
function industryTopicIds(industries, industryId) {
  return industries?.find(x => x.id === industryId)?.topics ?? [];
}

/**
 * How closely a course matches what the student told us. 0 means no match, never
 * "unsuitable". Interests weigh 3, 2, 1 in the order given; a chosen industry adds 2
 * for any of its topics.
 */
function interestScore(course, interests = [], industryTopics = []) {
  const ct = courseTopics(course);
  if (!ct.length) return 0;
  let s = 0;
  interests.forEach((t, i) => { if (ct.includes(t)) s += Math.max(1, 3 - i); });
  if (industryTopics.some(t => ct.includes(t))) s += 2;
  return s;
}

/** Stable sort by interest. Same length in, same length out: nothing is removed. */
function sortByInterest(results, interests = [], industryTopics = []) {
  if (!interests.length && !industryTopics.length) return results.slice();
  return results
    .map((r, i) => ({ r, i, s: interestScore(r.course ?? r, interests, industryTopics) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.r);
}

/** Which of the student's topics a course matches, for the "matches" tag. */
function matchedTopics(course, interests = [], industryTopics = []) {
  const ct = courseTopics(course);
  return [...new Set([...interests, ...industryTopics])].filter(t => ct.includes(t));
}

/** Degrees for an industry: specific matches, and broad degrees in the fields it names. */
function coursesForIndustry(industry, courses) {
  const specific = [], broad = [];
  for (const c of courses ?? []) {
    if (c.notEntryPoint) continue;
    const ct = courseTopics(c);
    if (ct.length) { if (industry.topics.some(t => ct.includes(t))) specific.push(c); }
    else if (isBroad(c) && (industry.broadFields ?? []).includes(c.field)) broad.push(c);
  }
  return { specific, broad };
}

/** Same split for a set of interests (quiz result). */
function coursesForTopics(topics, courses) {
  const specific = [], broad = [];
  const fields = new Set(TOPICS.filter(t => topics.includes(t.id)).flatMap(t => t.broadFields));
  for (const c of courses ?? []) {
    if (c.notEntryPoint) continue;
    const ct = courseTopics(c);
    if (ct.length) { if (topics.some(t => ct.includes(t))) specific.push(c); }
    else if (isBroad(c) && fields.has(c.field)) broad.push(c);
  }
  return { specific, broad };
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
    violations.push(`For an ATAR you need at least ${p.minBoardDevelopedUnits} units of Board Developed courses (the standard HSC courses). You have ${units}.`);
  if (englishUnits < p.minEnglishUnits)
    violations.push(`For an ATAR you need at least ${p.minEnglishUnits} units of English. You have ${englishUnits}.`);
  if (twoUnitCourses < p.minCoursesOfTwoOrMoreUnits)
    violations.push(`For an ATAR you need at least ${p.minCoursesOfTwoOrMoreUnits} courses of 2 units or more. You have ${twoUnitCourses}.`);
  if (areas < p.minSubjectAreas)
    violations.push(`For an ATAR you need subjects from at least ${p.minSubjectAreas} subject areas. You have ${areas}.`);
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
    if (!held.has(r.subject)) return { ...r, status: 'unavailable', why: `You’re not taking ${r.subject}.` };
    const b = bands[r.subject];
    if (b === undefined || b === null || b.band === undefined)
      return { ...r, status: 'unknown', why: `You’re taking ${r.subject}, but you haven’t added an expected band yet.` };
    return b.band >= r.minBand
      ? { ...r, status: 'satisfied', why: `Your expected ${r.subject} band (${b.band}) meets the minimum (Band ${r.minBand}).` }
      : { ...r, status: 'failed', why: `Your expected ${r.subject} band (${b.band}) is below the minimum (Band ${r.minBand}).` };
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
      ? `You’re one level below the ${subject} this course assumes. The university’s first-year revision material usually covers this.`
      : `You’re ${gap} levels below the ${subject} this course assumes. A short bridging course can’t make up for two years of study.`
  };
}

function englishFinding(profile, subject) {
  const required = ENGLISH_SUBJECT_LEVEL[subject];
  const have = englishLevel(profile);
  if (have >= required) return null;          // a higher English is never a gap
  return {
    subject, tier: 'C',
    band: BAND.MINOR_GAP,
    why: `This course assumes ${subject}, and your English course is a level below it.`
  };
}

function earlyEntryFor(course, ctx) {
  const file = ctx.earlyEntry;
  const schemes = file?.schemes ?? (Array.isArray(file) ? file : []);
  const uni = String(course.university || '').toLowerCase();
  return schemes.filter(s =>
    s && s.verification === 'verified' && s.quote
    && uni.includes(String(s.university || '').toLowerCase())
  );
}

function holdsAssumed(profile, held, ak) {
  if (ak.subject === 'any two units of Science')
    return (profile.sciences ?? []).length >= 2;
  return held.has(ak.subject);
}

function subjectFinding(profile, subject, ctx) {
  const bridging = ctx?.bridging;
  const canBridge = bridging?.subjects?.some(s => subject.toLowerCase().includes(s.toLowerCase()));
  const cost = canBridge && bridging.costAud ? ` (~$${bridging.costAud}, ${bridging.timing})` : '';
  return {
    subject, tier: 'C',
    band: BAND.BRIDGE_IT,
    why: canBridge
      ? `This course assumes ${subject}, which you’re not taking. The university runs a bridging course for it${cost}.`
      : `This course assumes ${subject}, which you’re not taking. There’s no bridging course for it, so expect first year to be harder.`
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
          ? `This course assumes ${ak.subject} at Band ${ak.minBand}. You’re taking a higher maths course instead, which covers it.`
          : `This course assumes ${ak.subject}. You’re taking a higher maths course, which covers it.`
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
            why: `Your expected ${ak.subject} band (${b.band}) is below the assumed minimum of Band ${ak.minBand}.`
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

    // Who may apply at all. Deliberately NOT folded into the band: readiness answers
    // "would this course suit the subjects you chose", and eligibility to apply is a
    // separate question with a separate answer. Folding it in would either hide the
    // course from the students it exists for, or quietly downgrade it for everyone
    // else. It is carried out so the page must say it.
    restrictedTo: course.restrictedTo ?? null,
    // Whether a school leaver can start this course at all (error 18). An honours year
    // after a degree, or an add-on beside one, is not something a Year 12 student is
    // "ready for" whatever their subjects. Carried out, never read by the band.
    notEntryPoint: course.notEntryPoint ?? null,
    // Institution-level early-entry schemes. Same shape as restrictedTo: carried so
    // the page must say them; never read by band arithmetic. No likelihood, no score.
    earlyEntry: earlyEntryFor(course, ctx),
    needsInput,
    verification: course.verification ?? 'unverified',
    sources: [...new Set(sources)]
  };
}

/** False for a course nobody starts from school. Views that list courses use this. */
function isEntryPoint(course) {
  return !course?.notEntryPoint;
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
    .filter(isEntryPoint)
    .map(c => readiness(profile, c, ctx))
    .sort((a, b) => a.band - b.band || a.courseName.localeCompare(b.courseName));
}

const CATALOGUE = [{"id":"mq-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"Macquarie University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"HSC Mathematics Advanced (Band 4)","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours","tier":"A","minBand":4}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"},{"subject":"Physics","quote":"Physics","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours","offerCount":6},{"id":"mq-science","name":"Bachelor of Science","university":"Macquarie University","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"HSC Mathematics Advanced (Band 4)","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science","tier":"A","minBand":4},{"subject":"Physics","quote":"Physics","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"},{"subject":"Physics","quote":"Physics","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science","offerCount":4},{"id":"mq-information-technology","name":"Bachelor of Information Technology","university":"Macquarie University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology","offerCount":3},{"id":"mq-cyber-security","name":"Bachelor of Cyber Security","university":"Macquarie University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security","offerCount":2},{"id":"mq-medical-sciences","name":"Bachelor of Medical Sciences","university":"Macquarie University","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences","offerCount":1},{"id":"unsw-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1, Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours","tier":"A"},{"subject":"Physics","quote":"Mathematics Extension 1, Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-medical-science","name":"Bachelor of Medical Science","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Chemistry","quote":"Chemistry, Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-science","tier":"A"},{"subject":"Mathematics Advanced","quote":"Chemistry, Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":2},{"id":"unsw-renewable-energy-engineering","name":"Bachelor of Engineering (Honours) (Renewable Energy)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-engineering-honours-nuclear-engineering","name":"Bachelor of Engineering (Honours) (Nuclear Engineering)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-nuclear-engineering","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-engineering-honours-robotics-and-mechatronics","name":"Bachelor of Engineering (Honours) (Robotics and Mechatronics)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-robotics-mechatronics","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-robotics-mechatronics","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-robotics-mechatronics","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-advanced-computer-science-honours","name":"Bachelor of Advanced Computer Science (Honours)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-computer-science-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-computer-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-engineering-honours-engineering-science","name":"Bachelor of Engineering (Honours) / Bachelor of Engineering Science","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-engineering-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-engineering-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-engineering-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-exercise-science-m-physiotherapy-and-exercise-physiology","name":"Bachelor of Exercise Science / Master of Physiotherapy and Exercise Physiology","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-exercise-science-master-of-physiotherapy-and-exercise-physiology","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-exercise-science-master-of-physiotherapy-and-exercise-physiology","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-exercise-science-master-of-physiotherapy-and-exercise-physiology","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-applied-exercise-science-m-clinical-exercise-physiology","name":"Bachelor of Applied Exercise Science / Master of Clinical Exercise Physiology","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-applied-exercise-science-master-of-clinical-exercise-physiology","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-applied-exercise-science-master-of-clinical-exercise-physiology","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-applied-exercise-science-master-of-clinical-exercise-physiology","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-advanced-science-honours-computer-science","name":"Bachelor of Advanced Science (Honours)/Computer Science","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-computer-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":2},{"id":"unsw-engineering-honours-materials-science-engineering-engineering-science","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering) / Engineering Science","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-materials-science-and-engineering-honours-engineering-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-engineering-honours-commerce","name":"Bachelor of Engineering (Honours) / Commerce","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-commerce","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-commerce","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-science-advanced-mathematics-honours-science-computer-science","name":"Bachelor of Science (Advanced Mathematics)(Honours)/Science (Computer Science)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-mathematics-honours-computer-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-mathematics-honours-computer-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":4},{"id":"unsw-science-advanced-mathematics-honours","name":"Bachelor of Science (Advanced Mathematics) (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":4},{"id":"unsw-medical-studies-d-medicine","name":"Bachelor of Medical Studies / Doctor of Medicine","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"English Standard","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-studies-doctor-of-medicine","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-studies-doctor-of-medicine","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-medicinal-chemistry-honours","name":"Bachelor of Medicinal Chemistry (Honours)","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medicinal-chemistry-honours","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medicinal-chemistry-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-medicinal-chemistry-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-science-honours","name":"Bachelor of Science (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"English","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":4},{"id":"unsw-engineering-honours-civil-surveying","name":"Bachelor of Engineering (Honours) (Civil) / Surveying","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-surveying","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-surveying","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-surveying","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-engineering-honours-science","name":"Bachelor of Engineering (Honours) / Science","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-advanced-science-honours-engineering-honours","name":"Bachelor of Advanced Science (Honours)/Engineering (Honours)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours-engineering-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":2},{"id":"unsw-engineering-honours-materials-science-engineering-commerce","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering) / Commerce","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-commerce","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-commerce","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-commerce","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-information-systems-co-op-honours","name":"Bachelor of Information Systems (Co-op) (Honours)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[{"type":"interview","label":"a separate application with a questionnaire and interview","quote":"In addition to meeting the required ATAR (or equivalent), you’ll need to respond to a questionnaire and sit for an interview with UNSW Co-op Program.","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours"}],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-computational-design-honours","name":"Bachelor of Computational Design (Honours)","university":"UNSW","field":"computing","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"notEntryPoint":{"kind":"after_degree","who":"students who already hold a Bachelor degree in Computational Design","quote":"Students must hold a Bachelor degree in Computational Design with the equivalent of a UNSW Credit average.","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-computational-design-honours","tier":"A"},"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-computational-design-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-advanced-science-honours","name":"Bachelor of Advanced Science (Honours)","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":2},{"id":"unsw-engineering-civil-engineering-with-architecture-honours","name":"Bachelor of Engineering (Civil Engineering with Architecture) (Honours)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-architecture","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-architecture","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-civil-architecture","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-psychological-science-honours","name":"Bachelor of Psychological Science (Honours)","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-psychological-science-honours","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-science-advanced-mathematics-honours-commerce","name":"Bachelor of Science (Advanced Mathematics) (Honours) / Commerce","university":"UNSW","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours-commerce","tier":"A"},{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours-commerce","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-science-advanced-mathematics-honours-commerce","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":4},{"id":"unsw-engineering-honours-m-engineering-electrical-engineering","name":"Bachelor of Engineering (Honours) / Master of Engineering (Electrical Engineering)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-master-of-electrical-engineering","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-engineering-honours-materials-science-engineering-m-biomedical-engineering","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering) / Master of Biomedical Engineering","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-and-materials-science-honours-master-of-biomedical-engineering","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"unsw-psychological-science","name":"Bachelor of Psychological Science","university":"UNSW","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-psychological-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-psychological-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":1},{"id":"unsw-engineering-honours-materials-science-engineering","name":"Bachelor of Engineering (Honours) (Materials Science & Engineering)","university":"UNSW","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-28","source":"https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-material-science","_bridging":{"subjects":["Physics","Chemistry","Mathematics"],"costAud":380,"timing":"3-4 weeks, pre-session","source":"https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements/assumed-knowledge","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1, Physics","tier":"A"},{"subject":"Physics","quote":"Mathematics Extension 1, Physics","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-advanced-computing","name":"Bachelor of Advanced Computing","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-chemical-engineering","name":"Bachelor of Engineering (Honours) (Chemical)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1, Chemistry","tier":"A"},{"subject":"Chemistry","quote":"Mathematics Extension 1, Chemistry","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"medium","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-biomedical-engineering","name":"Bachelor of Engineering (Honours) (Biomedical)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"medium","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-medical-science","name":"Bachelor of Science (Medical Science)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-pharmacy","name":"Bachelor of Pharmacy (Honours) / Master of Pharmacy Practice","university":"University of Sydney","field":"health","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":"high","verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/study/help/advice/prerequisites-and-assumed-knowledge-explained.html","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-commerce-and-science","name":"Bachelor of Commerce and Bachelor of Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-advanced-computing-and-commerce","name":"Bachelor of Advanced Computing and Bachelor of Commerce","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-advanced-computing-and-science","name":"Bachelor of Advanced Computing and Bachelor of Science","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-advanced-computing-and-science-health","name":"Bachelor of Advanced Computing and Bachelor of Science (Health)","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-advanced-computing-and-science-medical-science","name":"Bachelor of Advanced Computing and Bachelor of Science (Medical Science)","university":"University of Sydney","field":"computing","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-engineering-honours-aeronautical-engineering","name":"Bachelor of Engineering Honours (Aeronautical Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-civil-engineering","name":"Bachelor of Engineering Honours (Civil Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-civil-engineering-and-design-in-architecture","name":"Bachelor of Engineering Honours (Civil Engineering) and Bachelor of Design in Architecture","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-dalyell-scholars","name":"Bachelor of Engineering Honours (Dalyell Scholars)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-electrical-engineering","name":"Bachelor of Engineering Honours (Electrical Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-environmental-engineering","name":"Bachelor of Engineering Honours (Environmental Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-flexible-first-year","name":"Bachelor of Engineering Honours (Flexible First Year)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-mechanical-engineering","name":"Bachelor of Engineering Honours (Mechanical Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-mechatronic-engineering","name":"Bachelor of Engineering Honours (Mechatronic Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-software-engineering","name":"Bachelor of Engineering Honours (Software Engineering)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-and-arts","name":"Bachelor of Engineering Honours and Bachelor of Arts","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-and-commerce","name":"Bachelor of Engineering Honours and Bachelor of Commerce","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-and-project-management","name":"Bachelor of Engineering Honours and Bachelor of Project Management","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-and-science","name":"Bachelor of Engineering Honours and Bachelor of Science","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-biomedical-engineering-and-science-health","name":"Bachelor of Engineering Honours (Biomedical Engineering) and Bachelor of Science (Health)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-biomedical-engineering-and-science-medical-science","name":"Bachelor of Engineering Honours (Biomedical Engineering) and Bachelor of Science (Medical Science)","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-engineering-honours-with-space","name":"Bachelor of Engineering Honours with Space","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-project-management","name":"Bachelor of Project Management","university":"University of Sydney","field":"engineering","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-engineering-honours-and-laws","name":"Bachelor of Engineering Honours and Bachelor of Laws","university":"University of Sydney","field":"engineering","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":6},{"id":"usyd-science-and-laws","name":"Bachelor of Science and Bachelor of Laws","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-applied-science-diagnostic-radiography","name":"Bachelor of Applied Science (Diagnostic Radiography)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-applied-science-exercise-and-sport-science","name":"Bachelor of Applied Science (Exercise and Sport Science)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-applied-science-exercise-physiology","name":"Bachelor of Applied Science (Exercise Physiology)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-applied-science-occupational-therapy","name":"Bachelor of Applied Science (Occupational Therapy)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-applied-science-physiotherapy","name":"Bachelor of Applied Science (Physiotherapy)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-applied-science-speech-pathology","name":"Bachelor of Applied Science (Speech Pathology)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"English Advanced","quote":"English Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-biomedicine-and-health","name":"Bachelor of Biomedicine and Health","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-oral-health","name":"Bachelor of Oral Health","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-pharmacy-and-management-honours-and-m-pharmacy-practice","name":"Bachelor of Pharmacy and Management (Honours) and Master of Pharmacy Practice","university":"University of Sydney","field":"health","hardRules":["usyd-maths-gate"],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-arts-and-m-nursing","name":"Bachelor of Arts and Master of Nursing","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-science-health-and-m-nursing","name":"Bachelor of Science (Health) and Master of Nursing","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-m-nursing","name":"Bachelor of Science and Master of Nursing","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-d-dental-medicine-no-intake-from-01-january-2027","name":"Bachelor of Science and Doctor of Dental Medicine [No intake from 01 January 2027]","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-d-medicine","name":"Bachelor of Science and Doctor of Medicine","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-m-nutrition-and-dietetics","name":"Bachelor of Science and Master of Nutrition and Dietetics","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-agricultural-science","name":"Bachelor of Agricultural Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-agricultural-science-honours","name":"Bachelor of Agricultural Science Honours","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-animal-and-veterinary-bioscience","name":"Bachelor of Animal and Veterinary Bioscience","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-liberal-arts-and-science","name":"Bachelor of Liberal Arts and Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-liberal-arts-and-science-advanced","name":"Bachelor of Liberal Arts and Science (Advanced)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-mathematical-sciences","name":"Bachelor of Mathematical Sciences","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-psychology","name":"Bachelor of Psychology","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-psychology-honours","name":"Bachelor of Psychology Honours","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-science","name":"Bachelor of Science","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-advanced","name":"Bachelor of Science (Advanced)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-health","name":"Bachelor of Science (Health)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-advanced-studies","name":"Bachelor of Science and Bachelor of Advanced Studies","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-advanced-studies-advanced","name":"Bachelor of Science and Bachelor of Advanced Studies (Advanced)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-advanced-studies-dalyell-scholars","name":"Bachelor of Science and Bachelor of Advanced Studies (Dalyell Scholars)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-advanced-studies-health","name":"Bachelor of Science and Bachelor of Advanced Studies (Health)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-advanced-studies-medical-science","name":"Bachelor of Science and Bachelor of Advanced Studies (Medical Science)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-arts","name":"Bachelor of Science and Bachelor of Arts","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-and-m-mathematical-sciences","name":"Bachelor of Science and Master of Mathematical Sciences","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-veterinary-biology-and-d-veterinary-medicine","name":"Bachelor of Veterinary Biology and Doctor of Veterinary Medicine","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[{"subject":"Physics","quote":"Physics","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"extraHurdles":[{"type":"situational_judgement","label":"a situational judgement test","quote":"situational judgement test","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-wildlife-conservation-taronga","name":"Bachelor of Wildlife Conservation (Taronga)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Standard","quote":"Mathematics Standard","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},{"subject":"Biology","quote":"Biology","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":1},{"id":"usyd-science-extended","name":"Bachelor of Science (Extended)","university":"University of Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[{"type":"portfolio","label":"a portfolio of written work","quote":"a portfolio of written work or support material","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"type":"interview","label":"a structured interview","quote":"a structured interview","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"type":"personal_statement","label":"a personal statement of intent","quote":"personal statement of intent for\n                                                                                                          studying the course","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"restrictedTo":{"who":"Aboriginal and Torres Strait Islander students","quoteParts":["Admission to this course is only open to Aboriginal and","Torres Strait Islander students"],"quote":"Admission to this course is only open to Aboriginal and Torres Strait Islander students","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"usyd-science-extended-health","name":"Bachelor of Science (Extended) (Health)","university":"University of Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[{"type":"portfolio","label":"a portfolio of written work","quote":"a portfolio of written work or support material","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"type":"interview","label":"a structured interview","quote":"a structured interview","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"},{"type":"personal_statement","label":"a personal statement of intent","quote":"personal statement of intent for\n                                                                                                          studying the course","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf"}],"restrictedTo":{"who":"Aboriginal and Torres Strait Islander students","quoteParts":["Admission to this course is only open to Aboriginal and","Torres Strait Islander students"],"quote":"Admission to this course is only open to Aboriginal and Torres Strait Islander students","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","tier":"A"},"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf","_bridging":{"route":"Introduction to Calculus MOOC + post-MOOC examination, completed before intake","source":"https://www.sydney.edu.au/study/applying/how-to-apply/undergraduate/mathematics-prerequisite.html","verification":"verified"},"offerCount":4},{"id":"uts-computing-science","name":"Bachelor of Computing Science","university":"University of Technology Sydney","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science","tier":"A"},{"subject":"English Standard","quote":"any two units of English","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-computing-science","offerCount":1},{"id":"uts-information-technology","name":"Bachelor of Information Technology","university":"University of Technology Sydney","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology","tier":"A"},{"subject":"English Standard","quote":"any two units of English","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-information-technology","offerCount":3},{"id":"uts-nursing","name":"Bachelor of Nursing","university":"University of Technology Sydney","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-nursing","offerCount":3},{"id":"uts-forensic-science","name":"Bachelor of Forensic Science","university":"University of Technology Sydney","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-forensic-science","offerCount":1},{"id":"uts-engineering-honours-flexible","name":"Bachelor of Engineering (Honours) (Flexible)","university":"University of Technology Sydney","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"Software Engineering","quote":"Software Engineering","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible","offerCount":6},{"id":"uts-engineering-honours-diploma-in-industry-practice-mechanical-mechatronic","name":"Bachelor of Engineering (Honours) Diploma in Industry Practice (Mechanical & Mechatronic)","university":"University of Technology Sydney","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"English Advanced","quote":"English Advanced","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"English Standard","quote":"English Standard","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"Software Engineering","quote":"Software Engineering","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"Physics","quote":"Physics","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"},{"subject":"Chemistry","quote":"Chemistry","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic","offerCount":6},{"id":"wsu-engineering-honours","name":"Bachelor of Engineering (Honours)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours","offerCount":6},{"id":"wsu-science","name":"Bachelor of Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"two unit mathematics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","tier":"A"},{"subject":"English Standard","quote":"two unit English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","tier":"A"},{"subject":"any two units of Science","quote":"two unit science (any science)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science","offerCount":4},{"id":"wsu-medical-science","name":"Bachelor of Medical Science","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"two subject mathematics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","tier":"A"},{"subject":"English Standard","quote":"two unit English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","tier":"A"},{"subject":"any two units of Science","quote":"two unit science (any science)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science","offerCount":2},{"id":"wsu-computer-science","name":"Bachelor of Computer Science","university":"Western Sydney University","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"HSC Mathematics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science","tier":"A"},{"subject":"English Standard","quote":"any two units of HSC English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science","offerCount":2},{"id":"wsu-nursing","name":"Bachelor of Nursing","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-nursing","offerCount":3},{"id":"wsu-physiotherapy","name":"Bachelor of Physiotherapy","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"any 2 subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-physiotherapy","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-physiotherapy","offerCount":1},{"id":"wsu-advanced-science","name":"Bachelor of Advanced Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-advanced-science","offerCount":2},{"id":"wsu-applied-data-science","name":"Bachelor of Applied Data Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics equivalent to 2 Unit HSC","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-applied-data-science","tier":"A"}],"recommendedStudies":[],"extraHurdles":[],"notEntryPoint":{"kind":"add_on","who":"students already taking another bachelor degree at the same university","quote":"This program is not a stand-alone degree, but is designed to be undertaken as an add on degree in combination with any Bachelor degree offered at Western Sydney University.","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-applied-data-science","tier":"A"},"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-applied-data-science","offerCount":1},{"id":"wsu-advanced-medical-science","name":"Bachelor of Advanced Medical Science","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science-advanced","offerCount":1},{"id":"wsu-cyber-security-and-behaviour","name":"Bachelor of Cyber Security and Behaviour","university":"Western Sydney University","field":"computing","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-cyber-security-and-behaviour","offerCount":2},{"id":"wsu-clinical-exercise-physiology","name":"Bachelor of Clinical Exercise Physiology","university":"Western Sydney University","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-clinical-exercise-physiology","tier":"A"}],"recommendedStudies":[{"subject":"Biology","quote":"Biology","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-clinical-exercise-physiology"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-clinical-exercise-physiology","offerCount":1},{"id":"wsu-data-science","name":"Bachelor of Data Science","university":"Western Sydney University","field":"science","hardRules":[],"assumedKnowledge":[],"recommendedStudies":[],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-data-science","offerCount":1},{"id":"wsu-engineering-honours-materials-engineering","name":"Bachelor of Engineering (Honours) (Materials Engineering)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-materials","offerCount":6},{"id":"wsu-engineering-honours-advanced-manufacturing-engineering","name":"Bachelor of Engineering (Honours) (Advanced Manufacturing Engineering)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-advanced-manufacturing","offerCount":6},{"id":"wsu-engineering-honours-construction-engineering","name":"Bachelor of Engineering (Honours) (Construction Engineering)","university":"Western Sydney University","field":"engineering","hardRules":[],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"Mathematics (not General Mathematics)","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","tier":"A","minBand":5},{"subject":"English Standard","quote":"two subjects of English","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","tier":"A"},{"subject":"any two units of Science","quote":"Two subjects of Science","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 2","quote":"Mathematics Extension 2","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"},{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"},{"subject":"Physics","quote":"Physics","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours-construction","offerCount":6},{"id":"uow-computer-science","name":"Bachelor of Computer Science","university":"University of Wollongong","field":"computing","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"any two units of English","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/","tier":"A"},{"subject":"Mathematics Standard 2","quote":"Mathematics Advanced or Mathematics Standard 2","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-computer-science/","offerCount":2},{"id":"uow-information-technology","name":"Bachelor of Information Technology","university":"University of Wollongong","field":"science","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"any two units of English","source":"https://www.uow.edu.au/study/courses/bachelor-of-information-technology/","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Standard","quote":"any two units of Mathematics","source":"https://www.uow.edu.au/study/courses/bachelor-of-information-technology/"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-information-technology/","offerCount":3},{"id":"uow-mathematics","name":"Bachelor of Mathematics","university":"University of Wollongong","field":"science","hardRules":["uow-maths-std2"],"assumedKnowledge":[{"subject":"English Standard","quote":"any two units of English","source":"https://www.uow.edu.au/study/courses/bachelor-of-mathematics/","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"Mathematics Extension 1","source":"https://www.uow.edu.au/study/courses/bachelor-of-mathematics/"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-mathematics/","offerCount":1},{"id":"uow-nursing","name":"Bachelor of Nursing","university":"University of Wollongong","field":"health","hardRules":[],"assumedKnowledge":[{"subject":"English Standard","quote":"any two units of English","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/","tier":"A"},{"subject":"Mathematics Standard","quote":"any two units of Mathematics","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/","tier":"A"},{"subject":"any two units of Science","quote":"any two units of Science","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Standard 2","quote":"Mathematics Standard 2","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/"},{"subject":"Chemistry","quote":"Students who have not completed Chemistry and/or Biology in the HSC (or equivalent) are strongly encouraged to enrol in bridging courses offered in February each year.","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/"},{"subject":"Biology","quote":"Students who have not completed Chemistry and/or Biology in the HSC (or equivalent) are strongly encouraged to enrol in bridging courses offered in February each year.","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-nursing/","offerCount":3},{"id":"uow-engineering-honours-mathematics","name":"Bachelor of Engineering (Honours) - Bachelor of Mathematics","university":"University of Wollongong","field":"engineering","hardRules":["uow-maths-std2"],"assumedKnowledge":[{"subject":"Mathematics Advanced","quote":"NSW HSC Mathematics Advanced","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/","tier":"A"},{"subject":"English Standard","quote":"any two units of NSW HSC English","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/","tier":"A"}],"recommendedStudies":[{"subject":"Mathematics Extension 1","quote":"NSW HSC Mathematics Extension 1","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/"},{"subject":"Engineering Studies","quote":"NSW HSC Engineering Studies","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/"},{"subject":"Physics","quote":"NSW HSC Physics","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/"},{"subject":"Chemistry","quote":"NSW HSC Chemistry","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/"}],"extraHurdles":[],"nameRecognition":null,"verification":"verified","capturedOn":"2026-08-27","source":"https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/","offerCount":6}];
const DISCOVERY = [{"courseId":"unsw-advanced-computer-science-honours","firstYear":"A four-year honours degree. First year is programming, computer systems and software engineering (COMP1511, COMP1521, COMP1531), with data structures and algorithms (COMP2521) already in the third term, alongside UNSW's higher-level maths (Higher Mathematics 1A and 1B) and discrete maths. Later you choose a major in Computer Science, Security Engineering or Artificial Intelligence, and the final year is a three-part research thesis.","notThis":"Not a different field from UNSW's Bachelor of Computer Science. It is the same subject taken deeper: higher maths in first year, an extension course in algorithms and programming, and a research thesis built into year four.","neighbours":["usyd-advanced-computing","usyd-advanced-computing-and-commerce","usyd-advanced-computing-and-science"],"sources":["https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-computer-science-honours","https://www.unsw.edu.au/content/dam/pdfs/engineering/general/course-progression/2026-progression-plans/term-1/3779/3779%20-%20Bachelor%20Advanced%20Computer%20Science%20(Honours)%20-%20Computer%20Science%20-%20COMPCH%20-%20T1%202026%20Start.pdf"],"researchedOn":"2026-09-25","draftedBy":"Claude (Opus 5.5), 2026-09-25","reviewed":true,"reviewedBy":"Ajay Walia","reviewedOn":"2026-09-25","sourcesCheckedOn":"2026-10-24"},{"courseId":"unsw-information-systems-co-op-honours","firstYear":"A four-year degree in UNSW's Business School. First year is seven introductory information-systems courses and one second-level course, covering how businesses use technology, programming and databases. Years two and three include three industry placements (about 18 months in total), year four is a supervised research thesis, and the co-op scholarship pays a yearly allowance for all four years.","notThis":"Not computer science. The focus is how organisations use technology, such as enterprise systems and digital transformation, rather than building software from the ground up. It is also a separate application: as well as UAC, you apply to the UNSW Co-op Program itself, with a questionnaire and interview and a deadline around the end of September in Year 12. Check the current date with UNSW.","neighbours":["wsu-computer-science","uow-computer-science","uts-computing-science"],"sources":["https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours"],"researchedOn":"2026-09-25","draftedBy":"Claude (Opus 5.5), 2026-09-25","reviewed":true,"reviewedBy":"Ajay Walia","reviewedOn":"2026-09-25","sourcesCheckedOn":"2026-10-24"},{"courseId":"usyd-advanced-computing","firstYear":"First year covers the core of computing: programming (Introduction to Programming, then Object-Oriented Programming), computer systems, operating systems and networks, professional practice, foundations of data science, Mathematics 1A and discrete maths for computing. Several units have Advanced versions. You then major in computer science, cybersecurity, software development or computational data science, and can add a second major or minor from another area such as commerce, science or music.","notThis":"Not the same as a Bachelor of Science with a computing major. This degree is run by the Engineering faculty as a professional computing degree: you can finish after three years with a Bachelor of Computing, or stay a fourth year for advanced professional and research work.","neighbours":["unsw-advanced-computer-science-honours","unsw-advanced-science-honours-computer-science","unsw-science-advanced-mathematics-honours-science-computer-science"],"sources":["https://www.sydney.edu.au/content/handbooks/engineering/advanced-computing.html","https://www.sydney.edu.au/handbooks/engineering/advanced-computing/unit-of-study-table.html"],"researchedOn":"2026-09-25","draftedBy":"Claude (Opus 5.5), 2026-09-25","reviewed":true,"reviewedBy":"Ajay Walia","reviewedOn":"2026-09-25","sourcesCheckedOn":"2026-10-24"},{"courseId":"usyd-mathematical-sciences","firstYear":"First year is mostly mathematics and data: Mathematics 1A and 1B, discrete maths, foundations of data science and data computing, plus a unit on research and communication in the mathematical sciences. Most of these have Advanced versions. You then choose a major from Mathematics, Statistics, Financial Mathematics and Statistics, Data Science, Mathematical Modelling and Computation, or Discrete Mathematics and Algorithms, and add a minor or second major.","notThis":"Not a general science degree. In a Bachelor of Science, maths is one choice among many sciences; here every major is mathematical, and the university describes the degree as a foundation for Honours. It takes three years.","neighbours":["unsw-advanced-science-honours","unsw-science-advanced-mathematics-honours","unsw-science-advanced-mathematics-honours-commerce"],"sources":["https://www.sydney.edu.au/handbooks/science/coursework/mathematical-sciences/overview.html","https://www.sydney.edu.au/handbooks/science/coursework/mathematical-sciences/course-resolutions.html","https://www.sydney.edu.au/handbooks/science/coursework/mathematical-sciences/unit-of-study-table.html"],"researchedOn":"2026-09-25","draftedBy":"Claude (Opus 5.5), 2026-09-25","reviewed":true,"reviewedBy":"Ajay Walia","reviewedOn":"2026-09-25","sourcesCheckedOn":"2026-10-24"},{"courseId":"wsu-data-science","firstYear":"A three-year degree. The first semester is Scientific Literacy, Thinking About Data, Discrete Mathematics and Programming Fundamentals. Later study covers designing experiments, building statistical models, visualisation, machine learning and handling large data sets. You add either a major (Health Informatics or Technology Entrepreneurship), two minors, or one minor plus electives. The minors include Artificial Intelligence, Cybersecurity, Mathematics and Statistics.","notThis":"Not the same as Western Sydney's Bachelor of Applied Data Science, which is a one-year add-on taken with another degree. This is the standalone three-year degree.","neighbours":[],"sources":["https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-data-science","https://studenthandbook.westernsydney.edu.au/course/2027/3769"],"researchedOn":"2026-09-25","draftedBy":"Claude (Opus 5.5), 2026-09-25","reviewed":true,"reviewedBy":"Ajay Walia","reviewedOn":"2026-09-25","sourcesCheckedOn":"2026-10-24"}];
const GATES = {"usyd-maths-gate":{"id":"usyd-maths-gate","quote":"Mathematics Advanced (Band 4) or Mathematics Extension 1 or 2 (Band E3)","source":"https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/university-calendar/assumed-knowledge.pdf","routes":[{"subject":"Mathematics Advanced","minBand":4,"bandScale":"hsc"},{"subject":"Mathematics Extension 1","minBand":3,"bandScale":"extension"},{"subject":"Mathematics Extension 2","minBand":3,"bandScale":"extension"}]},"uow-maths-std2":{"id":"uow-maths-std2","quote":"Students must have studied the equivalent of NSW HSC Mathematics Standard 2 (minimum Band 2) to be admitted into this degree.","source":"https://www.uow.edu.au/study/courses/bachelor-of-mathematics/","routes":[{"subject":"Mathematics Standard 2","minBand":2,"bandScale":"hsc"},{"subject":"Mathematics Advanced","minBand":2,"bandScale":"hsc"},{"subject":"Mathematics Extension 1","minBand":1,"bandScale":"extension"},{"subject":"Mathematics Extension 2","minBand":1,"bandScale":"extension"}],"_note":"Only the Standard 2 route is in the university's own words. \"The equivalent of\" is read as including the harder maths courses at the same minimum band (Advanced Band 2, either Extension at any band). That reading is ours and is on the adviser review list. Found 24 Oct 2026 (error 22)."}};
const EARLY_ENTRY = {"_comment":"Non-ATAR admission routes. Three of six MVP universities lead with these, and they read Year 11 results. A tool modelling only prerequisites describes a minority of how NSW admission works.","capturedOn":"2026-11-05","stalenessDays":180,"schemes":[{"id":"mq-leaders-achievers","university":"Macquarie","name":"Leaders and Achievers Early Entry","kind":"holistic","uses":["year11_academic","extracurricular","casual_work","community_involvement"],"quote":"You could receive an early offer if you’ve performed well academically in Year 11 and can demonstrate initiative through sport, volunteering, part-time work, or leadership or personal development activities in Years 11 and/or 12.","source":"https://www.mq.edu.au/study/admissions-and-entry/pathways/schemes/leaders-achievers","capturedOn":"2026-11-05","coverage":"most Macquarie degrees","appliedVia":"direct to university","verification":"verified","_note":"Re-verified 5 Nov 2026 in the desktop browser. Note: a text-only page reader was served an older version of this page (2025 qualifications, \"now open\"); the browser shows the current one."},{"id":"wsu-hsc-true-reward","university":"Western Sydney","name":"HSC True Reward","kind":"subject_bands","uses":["year11_subject_results","hsc_subject_bands"],"quote":"Instead of waiting until the end of Year 12, you could receive an early conditional offer to study at Western based on your Year 11 subject results or an unconditional offer on your Year 12 subject results.","source":"https://www.westernsydney.edu.au/future/study/application-pathways/hsc-true-reward","capturedOn":"2026-11-05","verification":"verified","_note":"Reworded by 24 Oct 2026: offers now also use Year 11 subject results (conditional). We hold the scheme, not the per-course subject table. Do not compute eligibility."},{"id":"wsu-srs","university":"Western Sydney","name":"Schools Recommendation Scheme","kind":"holistic","uses":["year11_studies","school_ratings"],"quote":"The Western Sydney University Schools Recommendation Scheme allows current domestic and international Year 12 students who meet the requirements below to receive early offers of undergraduate admission.","source":"https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes/institution-specific-srs-criteria","capturedOn":"2026-11-05","verification":"verified","_note":"Reworded at UAC between 24 Oct and 5 Nov 2026 (\"domestic and international\" added). Re-verified by code in the desktop browser on 5 Nov 2026."},{"id":"uow-early-admission","university":"Wollongong","name":"Early Admission","kind":"holistic","uses":["year11_results","skills_experience"],"quote":"Instead of relying solely on your final Year 12 results, we consider your Year 11 performance, whether you’ve experienced challenges that have impacted that performance, and your skills and experiences through a written questionnaire.","source":"https://www.uow.edu.au/the-stand/2026/answering-the-most-common-early-admission-questions.php","capturedOn":"2026-11-05","verification":"verified","_note":"The old page moved (early admission now at https://www.uow.edu.au/early-admission/, which says applications are closed). Quote from UOW's own 2026 FAQ article. 5 Nov 2026: offer release moved from 1 to 17 September 2026 (UOW page); UAC still shows 1 September."}]};
const CAPTURED_ON = "2026-08-28";
const RECHECKED_ON = "2026-10-24";
const INDUSTRIES = {"economies":[{"id":"au","label":"Australia","short":"Australia","long":"Australia"},{"id":"us","label":"United States","short":"the US","long":"the United States"},{"id":"eu","label":"European Union","short":"the EU","long":"the European Union"},{"id":"uk","label":"United Kingdom","short":"the UK","long":"the United Kingdom"},{"id":"cn","label":"China","short":"China","long":"China"},{"id":"in","label":"India","short":"India","long":"India"},{"id":"jp","label":"Japan","short":"Japan","long":"Japan"},{"id":"kr","label":"South Korea","short":"South Korea","long":"South Korea"}],"industries":[{"id":"ai","name":"Artificial intelligence (AI) and computing","topics":["ai","data"],"broadFields":["science","engineering"]},{"id":"quantum","name":"Quantum technology","topics":["data","electronics","ai"],"broadFields":["science","engineering"]},{"id":"chips","name":"Computer chips (semiconductors)","topics":["electronics","materials"],"broadFields":["engineering","science"]},{"id":"energy","name":"New energy (renewables, storage, hydrogen, nuclear)","topics":["energy"],"broadFields":["engineering","science"]},{"id":"space","name":"Space and aerospace","topics":["space"],"broadFields":["engineering","science"]},{"id":"robotics","name":"Robotics and autonomous machines","topics":["robotics","ai"],"broadFields":["engineering"]},{"id":"biotech","name":"Biotechnology and medical science","topics":["bio","health"],"broadFields":["science"]},{"id":"minerals","name":"Minerals for batteries and electronics (critical minerals)","topics":["materials","nature"],"broadFields":["engineering","science"]},{"id":"manufacturing","name":"Advanced manufacturing and new materials","topics":["materials","robotics"],"broadFields":["engineering"]}]};


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
  PREPARED: 'ready',
  MINOR_GAP: 'a little to catch up',
  BRIDGE_IT: 'bridging course',
  HARD_GAP: 'a lot to catch up',
  GATED: 'entry rule not met'
};

// 2026-09-23 → 23 Sep 2026. Dates a person reads, not a database.
function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return Number(m[3]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1] + ' ' + m[1];
}
const BAND_CLASS = {
  PREPARED: 's-prep',
  MINOR_GAP: 's-minor',
  BRIDGE_IT: 's-bridge',
  HARD_GAP: 's-hard',
  GATED: 's-gated'
};

let state = decodeState(location.hash);
let stateB = decodeSetB(location.hash);
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
  const next = stateB && isCompleteSelection(stateB) ? encodeCompare(state, stateB) : encodeState(state);
  const want = next ? '#' + next : '';
  if (location.hash !== want) history.replaceState(null, '', (location.pathname + location.search) + want);
}

function resultsHref() {
  const h = encodeState(state);
  return BASE + 'results/' + (h ? '#' + h : '');
}

function subjectsHref() {
  const h = encodeState(state);
  return BASE + 'subjects/' + (h ? '#' + h : '');
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
  // A course no school leaver can start is not a result for anyone (error 18). Held out
  // here, once, so the lists, the counts and the comparison all agree.
  return CATALOGUE.filter(c => !c.notEntryPoint).map(c => {
    const r = readiness(p, c, { gates: GATES, bridging: c._bridging, earlyEntry: EARLY_ENTRY });
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
    wrap.appendChild(el('p', 'hint', 'Pick your year, maths and English, and we’ll start counting your units.'));
    return wrap;
  }
  const pat = validateAtarPattern(profileFrom(state));
  const urow = el('div', 'units');
  const left = el('span');
  left.append('Units: ', el('b', null, String(pat.units)), ' · Subject areas: ', el('b', null, String(pat.areas)));
  const right = el('span', pat.valid ? 'ok' : 'bad');
  right.textContent = pat.valid ? 'Enough for an ATAR' : 'Not enough for an ATAR yet';
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
    prog.textContent = `Step ${step + 1} of ${STEPS.length}`;
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

  const grid = el('div', 'picker-grid');
  grid.appendChild(stepBox('year', 'Which year are you in?', box => {
    const c = el('div', 'chips');
    [11, 12].forEach(y => c.appendChild(chip('Year ' + y, state.year === y, () => { state.year = y; })));
    box.appendChild(c);
  }));

  grid.appendChild(stepBox('maths', 'Which maths?', box => {
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
      box.appendChild(el('p', 'hint', 'Extension 2 is a Year 12 course, so you can’t pick it in Year 11.'));
    }
  }));

  grid.appendChild(stepBox('english', 'Which English?', box => {
    const c = el('div', 'chips');
    ENGLISH.forEach(([k, l]) => c.appendChild(chip(l, state.english[0] === k, () => { state.english = [k]; })));
    box.appendChild(c);
  }));

  grid.appendChild(stepBox('sciences', 'Any sciences?', box => {
    const c = el('div', 'chips');
    subjects.sciences.forEach(s => {
      const label = s.name === 'Earth and Environmental Science' ? 'Earth & env.'
        : s.name === 'Investigating Science' ? 'Investigating' : s.name;
      c.appendChild(chip(label, state.sciences.includes(s.id), () => toggle(state.sciences, s.id)));
    });
    box.appendChild(c);
  }));

  grid.appendChild(stepBox('technology', 'Any technology subjects?', box => {
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

  grid.appendChild(stepBox('other', 'Any other subjects?', box => {
    box.appendChild(el('p', 'hint', 'These don’t change your STEM results. We only count them toward your ATAR.'));
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
  }));
  root.appendChild(grid);
  root.appendChild(unitsPanel());

  if (showCta) {
    const cta = el('div', 'cta-wrap picker-foot');
    const go = el('button', 'btn', 'See my results');
    go.type = 'button';
    go.disabled = !isCompleteSelection(state);
    go.addEventListener('click', () => { writeHash(); location.href = resultsHref(); });
    cta.appendChild(go);
    root.appendChild(cta);
  }

  if (stepped) {
    const nav = el('div', 'step-nav');
    const back = el('button', 'btn ghost', 'Back');
    back.type = 'button';
    back.disabled = step === 0;
    back.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    const next = el('button', 'btn', step === STEPS.length - 1 ? 'See my results' : 'Next');
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
  }
}

function captureDate(course) {
  return course.capturedOn || CAPTURED_ON;
}

/** Display-side whitespace collapse. The stored quote keeps the capture's exact
 * characters so it can be checked against the source; only the rendering is tidied. */
function collapse(s) {
  return String(s).replace(/\s+/g, ' ').trim();
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

  // Why this row sits where it does when results are sorted by interest. A sort that
  // cannot explain itself reads as a recommendation.
  const sortBy = sortingNow();
  if (sortBy.active) {
    const m = matchedTopics(r.course, sortBy.interests, sortBy.industryTopics);
    if (m.length) row.appendChild(el('span', 'tag t-match', 'Matches: ' + m.map(topicLabel).join(', ')));
  }

  // Who may apply at all. A student can hold every assumed subject and still not be able
  // to apply, so this is stated before anything about readiness — and stated in the row,
  // not only on the course page, because the row is what most people read.
  if (r.restrictedTo) {
    row.appendChild(el('p', 'restrict',
      'Only open to ' + r.restrictedTo.who + '. Your subjects don’t change this.'));
    if (r.restrictedTo.quote) row.appendChild(el('p', 'quote', '\u201c' + collapse(r.restrictedTo.quote) + '\u201d'));
  }

  // Labels follow the facts, not the enum: `situational_judgement` is a database value,
  // not something to show a sixteen-year-old.
  (r.hurdles || []).forEach(h => {
    const t = typeof h === 'string'
      ? h.replace(/_/g, ' ')
      : (h.label || String(h.type || h.name || 'extra requirement').replace(/_/g, ' '));
    row.appendChild(el('span', 'tag t-flag', 'Also asks for ' + t));
  });

  if (!r.complete) {
    row.appendChild(el('p', 'why', 'We couldn’t fully read this university’s page, so this result isn’t certain.'));
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
  // "ready now" beside a course the reader cannot apply to is the card contradicting
  // itself — the same defect as promising a bridging course that does not exist. The
  // band is a statement about subjects, so where eligibility is decided elsewhere the
  // label says only what the band actually knows.
  if (r.restrictedTo) return r.bandName === 'PREPARED' ? 'subjects fit' : BAND_LABEL[r.bandName];
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
    // A covered gap already says "runs a bridging course for it (~$cost, timing)" in its own
    // line, from the engine; saying it again here read as two different courses.
    if (!covered.length && gaps.length) {
      row.appendChild(el('p', 'why',
        `This university’s bridging courses cover ${bridging.subjects.join(', ')}, but not ${gaps.join(' or ')}.`));
    }
  }
  const srcs = new Set();
  (r.course?.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
  if (r.gate?.source) srcs.add(r.gate.source);
  if (opts.sources && srcs.size) {
    const p = el('p', 'src');
    const date = captureDate(r.course);
    p.append('Checked ' + niceDate(date) + '. ');
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
  if (state.otherCount) labels.push(state.otherCount + ' other subject' + (state.otherCount > 1 ? 's' : ''));
  return labels;
}

function sortingNow() {
  const interests = state.interests || [];
  const industry = INDUSTRIES.industries.find(x => x.id === state.industry) || null;
  const industryTopics = industry ? industry.topics : [];
  return { interests, industry, industryTopics, active: Boolean(interests.length || industry) };
}

function sortingSentence(sb) {
  const bits = [];
  if (sb.interests.length) bits.push('what you enjoy (' + sb.interests.map(topicLabel).join(', ') + ')');
  if (sb.industry) bits.push('the industry you picked (' + sb.industry.name + ')');
  return bits.join(' and ');
}

function clearSorting() {
  state.interests = [];
  state.industry = null;
  afterChange();
}

function pageHref(slug) {
  const h = encodeState(state);
  return BASE + slug + (h ? '#' + h : '');
}

function renderHome() {
  // Links made before the picker had its own page carried the subjects on the home address.
  if (location.hash.length > 1) { location.replace(BASE + 'subjects/' + location.hash); return; }
  // The doors carry whatever the student has already told us, so the three ways in
  // combine instead of starting over.
  document.querySelectorAll('[data-door="subjects"]').forEach(a => { a.href = pageHref('subjects/'); });
  document.querySelectorAll('[data-door="quiz"]').forEach(a => { a.href = pageHref('quiz/'); });
  document.querySelectorAll('[data-door="industries"]').forEach(a => { a.href = pageHref('industries/'); });
}

function renderSubjects() {
  const now = document.getElementById('doors-now');
  if (now) {
    const sb = sortingNow();
    now.hidden = !sb.active;
    now.replaceChildren();
    if (sb.active) {
      now.append('Your results will be sorted by ' + sortingSentence(sb) + '. Add your subjects below. ');
      const c = el('button', 'btn ghost', 'Clear');
      c.type = 'button';
      c.addEventListener('click', clearSorting);
      now.appendChild(c);
    }
  }
  const picker = document.getElementById('picker');
  picker.dataset.mode = 'steps';
  renderPicker(picker, { showCta: true, stepped: true });
}

let quizAnswers = Array(QUIZ.length).fill(null);

function degreeList(list) {
  const ul = el('ul', 'deglist');
  list.forEach(c => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = courseHref(c.id);
    a.textContent = c.name;
    li.appendChild(a);
    li.appendChild(el('span', 'uni-s', ' ' + c.university));
    if (c.restrictedTo) li.appendChild(el('span', 'tag t-restrict', 'open to some students only'));
    ul.appendChild(li);
  });
  return ul;
}

function renderQuiz() {
  const main = document.getElementById('quiz');
  if (!main) return;
  main.querySelectorAll('.quiz-static').forEach(n => n.remove());
  let box = document.getElementById('quiz-live');
  if (!box) { box = el('div', 'quiz-live'); box.id = 'quiz-live'; main.appendChild(box); }
  box.replaceChildren();

  const answered = quizAnswers.filter(a => a !== null).length;
  box.appendChild(el('p', 'quiz-progress', answered + ' of ' + QUIZ.length + ' answered'));
  const list = el('ol', 'quiz-list');
  QUIZ.forEach((pair, i) => {
    const li = el('li', 'quiz-q');
    const row = el('div', 'quiz-pair');
    pair.forEach((opt, k) => {
      const b = el('button', 'quiz-opt', opt.text);
      b.type = 'button';
      b.setAttribute('aria-pressed', quizAnswers[i] === k ? 'true' : 'false');
      b.addEventListener('click', () => {
        quizAnswers[i] = quizAnswers[i] === k ? null : k;
        renderQuiz();
      });
      row.appendChild(b);
      if (k === 0) row.appendChild(el('span', 'quiz-or', 'or'));
    });
    li.appendChild(row);
    list.appendChild(li);
  });
  box.appendChild(list);

  const top = scoreQuiz(quizAnswers);
  const res = el('section', 'quiz-result');
  if (answered < 3 || !top.length) {
    res.appendChild(el('p', 'hint', 'Answer at least three to see your top areas.'));
    box.appendChild(res);
    return;
  }
  res.appendChild(el('h2', null, 'Your top areas'));
  const chips = el('div', 'chips');
  top.forEach(t => chips.appendChild(el('span', 'chip on', topicLabel(t))));
  res.appendChild(chips);
  res.appendChild(el('p', 'hint', 'Based on a simple count of your picks. It’s a place to start looking, not a label for you.'));

  const use = el('button', 'btn', isCompleteSelection(state) ? 'Sort my results by these' : 'Use these, then add my subjects');
  use.type = 'button';
  use.addEventListener('click', () => {
    state.interests = top;
    location.href = isCompleteSelection(state) ? resultsHref() : subjectsHref();
  });
  res.appendChild(use);

  const { specific, broad } = coursesForTopics(top, CATALOGUE);
  const ranked = sortByInterest(specific.map(c => ({ course: c })), top, []).map(x => x.course);
  res.appendChild(el('h3', null, 'Courses that match these areas (' + ranked.length + ')'));
  res.appendChild(el('p', 'hint', 'Our best guess from each course name. Add your subjects to see which ones you’re ready for.'));
  res.appendChild(degreeList(ranked));
  if (broad.length) {
    const det = document.createElement('details');
    det.className = 'fold';
    const sm = document.createElement('summary');
    sm.append('Broad degrees that can lead here ');
    sm.appendChild(el('span', 'hint', broad.length + ' courses'));
    det.appendChild(sm);
    det.appendChild(el('p', 'hint', 'In these you pick a major later. Check the handbook has one in your area.'));
    det.appendChild(degreeList(broad));
    res.appendChild(det);
  }
  box.appendChild(res);
}

function renderIndustries() {
  // The page is complete without JavaScript. This only carries the student's subjects
  // and interests into the "sort my results" links.
  document.querySelectorAll('a[data-industry]').forEach(a => {
    const next = { ...state, industry: a.dataset.industry };
    const h = encodeState(next);
    a.href = BASE + (isCompleteSelection(state) ? 'results/' : 'subjects/') + (h ? '#' + h : '');
    if (!isCompleteSelection(state)) a.textContent = 'Use this, then add my subjects';
  });
  document.querySelectorAll('.industries a[href^="../course/"]').forEach(a => {
    const h = encodeState(state);
    a.href = a.getAttribute('href').split('#')[0] + (h ? '#' + h : '');
  });
}

function renderResults() {
  const main = document.getElementById('results');
  if (!isCompleteSelection(state)) {
    main.replaceChildren();
    main.appendChild(el('p', 'lede', 'Pick your subjects first, and your results will show here.'));
    const go = el('a', 'btn');
    go.href = subjectsHref();
    go.textContent = 'Pick my subjects';
    go.style.display = 'inline-block';
    go.style.textDecoration = 'none';
    main.appendChild(go);
    return;
  }

  if (stateB && isCompleteSelection(stateB)) {
    renderCompare(main);
    return;
  }

  const p = profileFrom(state);
  const results = runCatalogue(p);
  const order = ['PREPARED', 'MINOR_GAP', 'BRIDGE_IT', 'HARD_GAP', 'GATED'];
  // A course a student cannot apply to is not something they are "ready for", whatever
  // their subjects say, so it is held out of both the gap list and the ready list and
  // counted on its own. Left in the ready list it appeared as a bare link under
  // "Everything else you are ready for", which is a door that is not actually open.
  const focused = applyClassifier(results, { field: state.filterField, university: state.filterUni });
  const restrictedAll = results.filter(r => r.restrictedTo);
  const restricted = applyClassifier(restrictedAll, { field: state.filterField, university: state.filterUni });
  // Interest and industry only reorder. Every list below keeps every course it had.
  const sb = sortingNow();
  const open = sortByInterest(focused.filter(r => !r.restrictedTo), sb.interests, sb.industryTopics);
  const attention = open.filter(r => r.bandName !== 'PREPARED' || !r.complete);
  const prepared = open.filter(r => r.bandName === 'PREPARED' && r.complete);
  const byBand = Object.fromEntries(order.map(b => [b, open.filter(r => r.bandName === b)]));
  const scoped = Boolean(state.filterField || state.filterUni);

  main.replaceChildren();

  const strip = el('div', 'strip');
  const inner = el('div', 'strip-inner');
  subjectChips().forEach(l => {
    const c = el('span', 'chip');
    c.textContent = l;
    inner.appendChild(c);
  });
  const edit = el('button', 'btn ghost', 'Change subjects');
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
      copy.textContent = 'Copy the link from the address bar';
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
    bd.appendChild(el('label', 'q', 'Your expected maths band'));
    bd.appendChild(el('p', 'hint', 'Some courses on your list need a certain maths mark, not just the subject. It’s the only kind of rule in NSW that can turn you away. Skip this if you don’t know yet.'));
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
    'Good news first: most of these courses are open to you. NSW universities mostly list assumed knowledge rather than strict prerequisites, so your subjects rarely stop you getting in. What matters is the shorter list below that needs some catching up, and why.'));

  // Print-only: rows drop their individual source lines to fit one page, so collect the
  // distinct sources once. An artefact a family takes away must stay checkable.
  const printSrc = el('div', 'printsources');
  {
    const unis = new Map();
    results.forEach(r => {
      (r.course?.assumedKnowledge || []).forEach(ak => {
        if (ak.source) unis.set(r.university, ak.source);
      });
      if (r.gate?.source) unis.set(r.university, r.gate.source);
    });
    const bits = [...unis.entries()].map(([u, src]) => u + ' — ' + src.replace(/^https?:\/\//, '').split('/')[0]);
    printSrc.textContent = 'Rules read on ' + niceDate(CAPTURED_ON) + ' from: ' + bits.join(' \u00b7 ') +
      '. Every course has its own page on this site with the university\u2019s exact words and a link.';
  }
  main.appendChild(printSrc);

  const sum = el('div', 'summary');
  order.forEach(b => {
    const n = byBand[b].length;
    if (!n) return;
    const s = el('div', 'stat ' + BAND_CLASS[b]);
    s.appendChild(el('span', 'n', String(n)));
    s.appendChild(el('span', 'l', BAND_LABEL[b]));
    sum.appendChild(s);
  });
  if (restricted.length) {
    const s = el('div', 'stat b-restrict');
    s.appendChild(el('span', 'n', String(restricted.length)));
    s.appendChild(el('span', 'l', 'Open to some students only'));
    sum.appendChild(s);
  }
  main.appendChild(sum);
  main.appendChild(renderClassifier(results, focused));

  if (sb.active) {
    const secI = el('section'); secI.dataset.sec = 'interests';
    const hI = el('div', 'sh');
    hI.appendChild(el('h2', null, 'Best matches for your interests'));
    secI.appendChild(hI);
    const lead = el('p', 'lede');
    lead.append('Sorted by ' + sortingSentence(sb) + '. This only changes the order. Every course is still here, and no result has changed. ');
    const change = el('a', null, 'Change');
    change.href = pageHref(sb.industry && !sb.interests.length ? 'industries/' : 'quiz/');
    lead.appendChild(change);
    lead.append(' · ');
    const clr = el('a', null, 'Clear');
    clr.href = '#';
    clr.addEventListener('click', e => { e.preventDefault(); clearSorting(); });
    lead.appendChild(clr);
    secI.appendChild(lead);
    const close = open.filter(r => interestScore(r.course, sb.interests, sb.industryTopics) > 0);
    if (close.length) {
      const rows = el('div', 'rows');
      close.slice(0, 12).forEach(r => rows.appendChild(courseCard(r, { sources: true })));
      secI.appendChild(rows);
      if (close.length > 12) secI.appendChild(el('p', 'hint', (close.length - 12) + ' more match. They’re at the top of each list below.'));
    } else {
      secI.appendChild(el('p', 'lede', 'No course names here match. Broad degrees like Science or Engineering can still lead there, because you pick a major later.'));
    }
    main.appendChild(secI);
  }

  const sec1 = el('section'); sec1.dataset.sec = 'attention';
  const h1 = el('div', 'sh');
  h1.appendChild(el('h2', null, attention.length ? 'Courses that need some catching up' : 'Nothing to catch up on'));
  h1.appendChild(el('span', 'count', attention.length ? attention.length + ' of ' + results.length : results.length + ' courses, no gaps'));
  sec1.appendChild(h1);
  if (attention.length) {
    const missing = {};
    attention.forEach(r => r.findings.forEach(f => { missing[f.subject] = (missing[f.subject] || 0) + 1; }));
    const parts = Object.entries(missing).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} (${n})`);
    if (parts.length) {
      const l = el('p', 'lede');
      l.textContent = 'What’s missing, and how many courses it affects: ' + parts.join(', ') + '.';
      sec1.appendChild(l);
    }
    const rows = el('div', 'rows');
    attention.forEach(r => rows.appendChild(courseCard(r, { sources: true })));

    // On paper the causes are the payload and the instances are the evidence for them.
    // A profile with 98 gaps printed four pages of course names that all said the same
    // two things; the printed sheet caps the list and says where the rest is, rather
    // than shrinking the type until a careers adviser cannot read it.
    const PRINT_ROW_CAP = 24;
    rows.dataset.many = attention.length > PRINT_ROW_CAP ? '1' : '0';
    if (attention.length > PRINT_ROW_CAP) {
      const byUni = {};
      attention.forEach(r => { byUni[r.university] = (byUni[r.university] || 0) + 1; });
      const more = el('p', 'printmore');
      more.textContent = attention.length + ' courses need some catching up: '
        + Object.entries(byUni).sort((a, b) => b[1] - a[1]).map(([u, n]) => u + ' ' + n).join(', ')
        + '. Every one, with the university\u2019s own words, is on the site at this page\u2019s link.';
      sec1.appendChild(more);
    }
    sec1.appendChild(rows);
  } else {
    sec1.appendChild(el('p', 'lede', 'Your subjects cover the assumed knowledge for every course we could fully check.'));
  }
  main.appendChild(sec1);

  if (restricted.length) {
    const secR = el('section'); secR.dataset.sec = 'restricted';
    const hR = el('div', 'sh');
    hR.appendChild(el('h2', null, 'Open to some students only'));
    hR.appendChild(el('span', 'count', restricted.length + ' of ' + results.length));
    secR.appendChild(hR);
    secR.appendChild(el('p', 'lede',
      'These are real courses, fully open to the students they’re for. They’re listed separately because who can apply depends on something other than your subjects.'));
    const rowsR = el('div', 'rows');
    restricted.forEach(r => rowsR.appendChild(courseCard(r, { sources: true })));
    secR.appendChild(rowsR);
    main.appendChild(secR);
  }

  const schemes = displayableSchemes(EARLY_ENTRY);
  if (schemes.length) {
    const secE = el('section');
    secE.id = 'early-entry';
    secE.dataset.sec = 'early';
    const hE = el('div', 'sh');
    const nEarly = new Set(schemes.map(s => s.university)).size;
    hE.appendChild(el('h2', null, (['One', 'Two', 'Three', 'Four', 'Five', 'Six'][nEarly - 1] || nEarly) + ' of these universities may offer you a place before your ATAR comes out'));
    secE.appendChild(hE);
    secE.appendChild(el('p', 'lede',
      'These are whole-university schemes, not rules for one course. We don’t predict who gets an offer.'));
    const datesP = el('p', 'lede dates-link');
    const datesA = document.createElement('a');
    datesA.href = BASE + 'dates/';
    datesA.id = 'early-dates-link';
    datesA.textContent = 'When to apply: every early-offer date, for starting uni in 2027 or 2028';
    datesP.appendChild(datesA);
    secE.appendChild(datesP);
    schemes.forEach(s => {
      const card = el('article', 'early');
      card.appendChild(el('h3', null, s.university + ' — ' + s.name));
      const reads = usesEnglish(s.uses);
      card.appendChild(el('p', 'why', 'Looks at: ' + reads.join(', ') + '.'));
      card.appendChild(el('p', 'quote', '\u201c' + s.quote + '\u201d'));
      if (s.kind === 'subject_bands') card.appendChild(el('p', 'why', TRUE_REWARD_CAVEAT));
      const stale = staleNote(s, EARLY_ENTRY);
      const meta = el('p', 'src');
      const date = s.capturedOn || EARLY_ENTRY.capturedOn;
      meta.append('Checked ' + niceDate(date) + '. ');
      if (stale) meta.append(stale + '. ');
      if (s.source) {
        const a = document.createElement('a');
        a.href = s.source; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Source';
        meta.appendChild(a);
      }
      card.appendChild(meta);
      secE.appendChild(card);
    });
    main.appendChild(secE);
  }

  const candidates = [
    ...state.sciences.map(s => ({ kind: 'sciences', id: s, label: subjects.sciences.find(x => x.id === s).name })),
    ...state.technology.map(t => ({ kind: 'technology', id: t, label: subjects.technology.find(x => x.id === t).name }))
  ];
  if (state.otherCount > 0) candidates.push({ kind: 'other', id: null, label: 'One other subject' });
  if (candidates.length) {
    const sec2 = el('section'); sec2.dataset.sec = 'drops';
    const h2 = el('div', 'sh');
    h2.appendChild(el('h2', null, 'What if you dropped a subject?'));
    sec2.appendChild(h2);
    sec2.appendChild(el('p', 'lede', 'We re-checked all ' + results.length + ' courses without each of your subjects, one at a time. It’s the big question in Year 11.'));
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
      delta.textContent = worse ? worse + (worse === 1 ? ' course gets' : ' courses get') + ' harder' : 'nothing changes';
      d.appendChild(delta);
      if (!altPat.valid) {
        const w = el('span', 'delta cost');
        w.textContent = '· not enough for an ATAR';
        d.appendChild(w);
      }
      wrap.appendChild(d);
    });
    sec2.appendChild(wrap);
    main.appendChild(sec2);
  }

  if (scoped) {
    const unfamiliar = prepared.filter(r => r.course.offerCount === 1);
    if (unfamiliar.length) {
      const sec3 = el('section'); sec3.dataset.sec = 'unfamiliar';
      const h3 = el('div', 'sh');
      h3.appendChild(el('h2', null, 'Courses you may not have heard of'));
      h3.appendChild(el('span', 'count', unfamiliar.length + ' of ' + prepared.length + ' you’re ready for'));
      sec3.appendChild(h3);
      sec3.appendChild(el('p', 'lede',
        'Only one of the six universities here offers a course with this name. That’s all it means — it says nothing about class size or how hard the course is.'));
      const rows = el('div', 'rows');
      unfamiliar.slice(0, 24).forEach(r => rows.appendChild(courseCard(r)));
      sec3.appendChild(rows);
      main.appendChild(sec3);
    }
    const rest = prepared.filter(r => r.course.offerCount !== 1);
    if (rest.length) foldPrepared(main, rest, 'Everything else you’re ready for here');
  } else if (prepared.length) {
    const secP = el('section');
    secP.dataset.sec = 'browse';
    const hP = el('div', 'sh');
    hP.appendChild(el('h2', null, 'Courses you’re ready for'));
    hP.appendChild(el('span', 'count', prepared.length + ' courses'));
    secP.appendChild(hP);
    secP.appendChild(el('p', 'lede',
      'Your subjects already fit most STEM courses in NSW. Rather than one very long list, pick Engineering, Computing, Science or Health above to see them.'));
    main.appendChild(secP);
  }

  const foot = document.getElementById('foot');
  const srcs = new Set();
  results.forEach(r => {
    (r.course.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
    if (r.gate?.source) srcs.add(r.gate.source);
  });
  foot.replaceChildren();
  foot.appendChild(el('p', null,
    'We’re independent — not UAC or a university. Course rules from ' + niceDate(CAPTURED_ON) + (RECHECKED_ON && RECHECKED_ON > CAPTURED_ON ? ', re-checked ' + niceDate(RECHECKED_ON) : '') + '. Always check UAC and the university’s website before you apply. Your subjects stay in this page’s link and are never sent to us.'));
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

function renderClassifier(allResults, focused) {
  const wrap = el('section');
  wrap.dataset.sec = 'classify';
  wrap.className = 'classify';
  const h = el('div', 'sh');
  h.appendChild(el('h2', null, 'Narrow it down'));
  wrap.appendChild(h);
  wrap.appendChild(el('p', 'lede',
    'Pick an area or a university to see fewer courses. It only changes what’s shown here.'));
  if (state.filterField || state.filterUni) {
    const bits = [];
    const fl = FIELDS.find(x => x.id === state.filterField);
    if (fl) bits.push(fl.label);
    const ulab = UNI_FILTER.find(x => x.id === state.filterUni);
    if (ulab) bits.push(ulab.label);
    wrap.appendChild(el('p', 'lede',
      'Showing ' + focused.length + ' of ' + allResults.length + ' courses — ' + bits.join(' at ') + '.'));
  }
  const areas = el('div', 'classify-grid');
  const fc = fieldCounts(allResults.filter(r => !r.restrictedTo));
  FIELDS.forEach(f => {
    const on = state.filterField === f.id;
    const b = chip(f.label + ' (' + (fc[f.id] || 0) + ')', on, () => {
      state.filterField = on ? null : f.id;
    });
    b.classList.add('classify-chip');
    areas.appendChild(b);
  });
  wrap.appendChild(areas);
  const unis = el('div', 'chips classify-unis');
  const uc = uniCounts(applyClassifier(allResults.filter(r => !r.restrictedTo), { field: state.filterField }));
  UNI_FILTER.forEach(u => {
    const on = state.filterUni === u.id;
    const n = uc[u.id] || 0;
    unis.appendChild(chip(u.label + ' (' + n + ')', on, () => {
      state.filterUni = on ? null : u.id;
    }));
  });
  wrap.appendChild(unis);
  return wrap;
}

function setLead(main, text) {
  const p = el('p', 'compare-lead');
  p.textContent = text;
  main.appendChild(p);
}

function diffCard(pair, which) {
  const r = which === 'a' ? pair.a : pair.b;
  const row = courseCard(r, { sources: true });
  return row;
}

function renderCompare(main) {
  main.replaceChildren();
  const patA = validateAtarPattern(profileFrom(state));
  const patB = validateAtarPattern(profileFrom(stateB));
  if (!patA.valid || !patB.valid) {
    setLead(main, 'We can compare these two subject sets once both are enough for an ATAR.');
    if (!patA.valid) main.appendChild(el('p', 'lede', 'Set A: ' + patA.violations[0]));
    if (!patB.valid) main.appendChild(el('p', 'lede', 'Set B: ' + patB.violations[0]));
    return;
  }
  const left = runCatalogue(profileFrom(state));
  const right = runCatalogue(profileFrom(stateB));
  const cmp = compareResults(left, right);
  setLead(main, cmp.same.length + ' of ' + cmp.total + ' courses are the same either way.');
  const nDiff = cmp.aOpens.length + cmp.bOpens.length;
  if (!nDiff) {
    main.appendChild(el('p', 'lede', 'No difference: both sets lead to the same courses.'));
    return;
  }
  main.appendChild(el('p', 'lede', 'Here are the other ' + nDiff + '. Neither set is “better” — it depends on what you want to study.'));
  if (cmp.aOpens.length) {
    const sec = el('section');
    sec.appendChild(el('h2', null, 'Set A prepares you better for'));
    const rows = el('div', 'rows');
    cmp.aOpens.forEach(p => rows.appendChild(diffCard(p, 'b')));
    sec.appendChild(rows);
    main.appendChild(sec);
  }
  if (cmp.bOpens.length) {
    const sec = el('section');
    sec.appendChild(el('h2', null, 'Set B prepares you better for'));
    const rows = el('div', 'rows');
    cmp.bOpens.forEach(p => rows.appendChild(diffCard(p, 'a')));
    sec.appendChild(rows);
    main.appendChild(sec);
  }
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
  else if (PAGE === 'subjects') renderSubjects();
  else if (PAGE === 'results') renderResults();
  else if (PAGE === 'quiz') renderQuiz();
  else if (PAGE === 'industries') renderIndustries();
}

window.addEventListener('hashchange', () => {
  state = decodeState(location.hash);
  stateB = decodeSetB(location.hash);
  render();
});

render();
