// Encode the subject set in the URL hash fragment, never the query string.
// A query string is transmitted to the server on every request and lands in access logs.
// A hash fragment is never sent. That is the difference between "we promise not to store
// your subjects" and "your subjects were never sent anywhere".

export const MATHS_TO_HASH = {
  standard1: 'std1',
  standard2: 'std2',
  advanced: 'adv',
  advanced_ext1: 'ext1',
  advanced_ext1_ext2: 'ext12'
};
export const HASH_TO_MATHS = {
  std1: 'standard1',
  std2: 'standard2',
  adv: 'advanced',
  ext1: 'advanced_ext1',
  ext12: 'advanced_ext1_ext2'
};

export const ENG_TO_HASH = {
  english_standard: 'std',
  english_advanced: 'adv',
  english_eald: 'eald'
};
export const HASH_TO_ENG = {
  std: 'english_standard',
  adv: 'english_advanced',
  eald: 'english_eald'
};

export const SCI_TO_HASH = {
  physics: 'phy',
  chemistry: 'chem',
  biology: 'bio',
  earth_env: 'earth',
  investigating_science: 'invsci'
};
export const HASH_TO_SCI = {
  phy: 'physics',
  chem: 'chemistry',
  bio: 'biology',
  earth: 'earth_env',
  invsci: 'investigating_science'
};

export const TECH_TO_HASH = {
  engineering_studies: 'engstud',
  software_engineering: 'softeng',
  enterprise_computing: 'entcomp',
  design_technology: 'dt'
};
export const HASH_TO_TECH = {
  engstud: 'engineering_studies',
  softeng: 'software_engineering',
  entcomp: 'enterprise_computing',
  dt: 'design_technology'
};

export const BAND_KEY_TO_SUBJECT = {
  adv: 'Mathematics Advanced',
  ext1: 'Mathematics Extension 1',
  ext2: 'Mathematics Extension 2'
};
export const SUBJECT_TO_BAND_KEY = {
  'Mathematics Advanced': 'adv',
  'Mathematics Extension 1': 'ext1',
  'Mathematics Extension 2': 'ext2'
};

export const FIELD_TO_HASH = {
  engineering: 'eng',
  computing: 'comp',
  science: 'sci',
  health: 'health'
};
export const HASH_TO_FIELD = {
  eng: 'engineering',
  comp: 'computing',
  sci: 'science',
  health: 'health'
};
export const UNI_TO_HASH = {
  UNSW: 'unsw',
  'University of Sydney': 'usyd',
  'University of Technology Sydney': 'uts',
  'Macquarie University': 'mq',
  'Western Sydney University': 'wsu',
  'University of Wollongong': 'uow'
};
export const HASH_TO_UNI = Object.fromEntries(Object.entries(UNI_TO_HASH).map(([k, v]) => [v, k]));

export function emptyState() {
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

export function isCompleteSelection(state) {
  return Boolean(state?.year && state?.mathsPathway && state.english?.length);
}

export function encodeState(state) {
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

export function decodeState(hash) {
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

export function encodeCompare(a, b) {
  const p = new URLSearchParams(encodeState(a));
  if (!isCompleteSelection(b)) return p.toString();
  const right = new URLSearchParams(encodeState(b));
  for (const [k, v] of right.entries()) {
    const pk = B_PREFIX[k];
    if (pk) p.set(pk, v);
  }
  return p.toString();
}

export function decodeSetB(hash) {
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
