// Institution-level early-entry schemes. Not a band. No likelihood, no score, no colour.

export const USES_ENGLISH = {
  year11_academic: 'Year 11 academic results',
  extracurricular: 'extracurricular activities',
  casual_work: 'casual work',
  community_involvement: 'community involvement',
  hsc_subject_bands: 'HSC subject band outcomes',
  year11_studies: 'Year 11 studies',
  school_ratings: 'school ratings',
  year11_results: 'Year 11 results',
  skills_experience: 'skills and experience'
};

export function usesEnglish(uses) {
  return (uses ?? []).map(u => USES_ENGLISH[u] || u.replace(/_/g, ' '));
}

export function universityMatches(courseUniversity, schemeUniversity) {
  const a = String(courseUniversity || '').toLowerCase();
  const b = String(schemeUniversity || '').toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function isDisplayableScheme(s) {
  return Boolean(s && s.verification === 'verified' && s.quote);
}

export function displayableSchemes(file) {
  return (file?.schemes ?? []).filter(isDisplayableScheme);
}

export function schemesForUniversity(university, file) {
  return displayableSchemes(file).filter(s => universityMatches(university, s.university));
}

/** Present-tense vs "as at <date> — confirm…" once past stalenessDays. Capture date is always shown. */
export function staleNote(scheme, file, now = new Date()) {
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

export const TRUE_REWARD_CAVEAT =
  'Western Sydney may admit you on ATAR release day on specific HSC subject band outcomes rather than on the ATAR. Which bands, for which course, is published by the university — we have not captured that table. Your subject bands are what it reads.';
