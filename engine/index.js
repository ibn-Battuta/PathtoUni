import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export * from './units.js';
export * from './readiness.js';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

/** Load every university file into a flat course list plus the gate registry. */
export function loadCatalogue() {
  const files = fs.readdirSync(path.join(DATA, 'courses')).filter(f => f.endsWith('.json'));
  const courses = [];
  const gates = {};
  const byUniversity = {};
  for (const f of files) {
    const uni = JSON.parse(fs.readFileSync(path.join(DATA, 'courses', f), 'utf8'));
    byUniversity[uni.university] = uni;
    if (uni._mathsGate) gates[uni._mathsGate.id] = uni._mathsGate;
    for (const c of uni.courses ?? [])
      courses.push({ ...c, university: uni.university, _bridging: uni.bridging });
  }
  return { courses, gates, byUniversity };
}

/** Context for one course: its university's bridging offer plus the gate registry. */
export function contextFor(course, gates) {
  return { gates, bridging: course._bridging };
}

/** Same degree name, different assumed knowledge across universities. The product's best demo. */
export function crossUniversityContrasts(courses) {
  const norm = n => n.toLowerCase().replace(/bachelor of |\(honours\)|\(|\)/g, '').replace(/science /, '').trim();
  const groups = {};
  for (const c of courses) (groups[norm(c.name)] ??= []).push(c);
  return Object.entries(groups)
    .filter(([, g]) => g.length > 1)
    .map(([name, g]) => ({
      degree: name,
      variants: g.map(c => ({
        university: c.university,
        assumed: (c.assumedKnowledge ?? []).map(a => a.subject)
      }))
    }))
    .filter(g => {
      const sets = g.variants.map(v => v.assumed.slice().sort().join('|'));
      return new Set(sets).size > 1;
    });
}
