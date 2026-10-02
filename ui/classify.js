// View filter, not a band. Choosing Engineering hides Science from this screen;
// it does not delete Science from the catalogue or change any readiness result.

export const FIELDS = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'computing', label: 'Computing' },
  { id: 'science', label: 'Science' },
  { id: 'health', label: 'Health' }
];

export const UNI_FILTER = [
  { id: 'UNSW', label: 'UNSW' },
  { id: 'University of Sydney', label: 'Sydney' },
  { id: 'University of Technology Sydney', label: 'UTS' },
  { id: 'Macquarie University', label: 'Macquarie' },
  { id: 'Western Sydney University', label: 'Western Sydney' },
  { id: 'University of Wollongong', label: 'Wollongong' }
];

export function courseField(r) {
  return r.course?.field || r.field || 'science';
}

export function applyClassifier(results, { field, university } = {}) {
  return (results ?? []).filter(r => {
    if (field && courseField(r) !== field) return false;
    if (university && r.university !== university) return false;
    return true;
  });
}

export function fieldCounts(results) {
  const out = {};
  for (const f of FIELDS) out[f.id] = 0;
  for (const r of results ?? []) {
    const id = courseField(r);
    if (out[id] == null) out[id] = 0;
    out[id]++;
  }
  return out;
}

export function uniCounts(results) {
  const out = {};
  for (const u of UNI_FILTER) out[u.id] = 0;
  for (const r of results ?? []) {
    if (out[r.university] == null) out[r.university] = 0;
    out[r.university]++;
  }
  return out;
}
