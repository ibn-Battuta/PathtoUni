// Discovery prose is drafted, human-reviewed, and never a rule.
// Neighbours are computed from the catalogue, not written by a model.

import { nameKey } from './familiarity.js';

export const REQUIREMENT_CLAIM = /\brequir|prerequisite|assumed knowledge|you (?:must|need to|should) have|essential that|expected to have|necessary background|strong background in|need a solid/i;

export function computeNeighbours(course, catalogue, limit = 3) {
  const mine = new Set((course.assumedKnowledge ?? []).map(a => a.subject));
  const scored = [];
  for (const other of catalogue) {
    if (other.id === course.id) continue;
    if (other.university === course.university) continue;
    if (other.notEntryPoint) continue;
    if ((other.field || '') !== (course.field || '')) continue;
    const theirs = (other.assumedKnowledge ?? []).map(a => a.subject);
    const overlap = theirs.filter(s => mine.has(s)).length;
    scored.push({ id: other.id, overlap, name: other.name });
  }
  // With nothing in common every candidate ties at zero and the alphabet picks the
  // neighbours (Agricultural Science beside Data Science). No shared subject, no neighbour.
  scored.sort((a, b) => b.overlap - a.overlap || a.name.localeCompare(b.name));
  return scored.filter(s => s.overlap > 0).slice(0, limit).map(s => s.id);
}

export function validateDiscovery(entry, catalogue) {
  const errors = [];
  if (!entry || typeof entry !== 'object') return ['entry is not an object'];
  const ids = new Set(catalogue.map(c => c.id));
  if (!ids.has(entry.courseId)) errors.push(`courseId ${entry.courseId} is not in the catalogue`);
  const self = catalogue.find(c => c.id === entry.courseId);
  if (self?.notEntryPoint) errors.push(`courseId ${entry.courseId} is not a school-leaver entry point; a description would make error 18 louder`);
  for (const field of ['firstYear', 'notThis']) {
    const text = entry[field];
    if (typeof text === 'string' && REQUIREMENT_CLAIM.test(text))
      errors.push(`${field} contains a requirement claim: ${text.slice(0, 80)}`);
  }
  for (const n of entry.neighbours ?? []) {
    if (!ids.has(n)) errors.push(`neighbour ${n} is not in the catalogue`);
  }
  return errors;
}

export { nameKey };
