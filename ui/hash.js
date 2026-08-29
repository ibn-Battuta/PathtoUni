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

export function emptyState() {
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
  return state;
}
