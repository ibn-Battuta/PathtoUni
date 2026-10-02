// Familiarity is how many of the six universities offer a degree of that name.
// It is computed from the catalogue, not written per course. A name that appears
// once is uncommon; a name that appears at all six is not a discovery candidate.
// This is a Tier C judgement and is never a band.

export function nameKey(name) {
  let n = String(name || '')
    .toLowerCase()
    .replace(/bachelor of /g, '')
    .replace(/master of /g, 'm ')
    .replace(/doctor of /g, 'd ')
    .replace(/\(honours\)/g, 'honours')
    .replace(/\bhonours\b/g, 'honours')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  n = n.split(/ and /)[0].trim();
  const cores = [
    'advanced computing',
    'computer science',
    'information technology',
    'medical science',
    'advanced science',
    'engineering',
    'nursing',
    'science'
  ];
  for (const core of cores) {
    if (n === core || n.startsWith(core + ' ')) return core;
  }
  return n;
}

export function offerCounts(courses) {
  const byKey = new Map();
  for (const c of courses) {
    const k = nameKey(c.name);
    if (!k) continue;
    const unis = byKey.get(k) ?? new Set();
    unis.add(c.university);
    byKey.set(k, unis);
  }
  const counts = new Map();
  for (const [k, unis] of byKey) counts.set(k, unis.size);
  return counts;
}

export function attachOfferCount(courses) {
  const counts = offerCounts(courses);
  return courses.map(c => ({
    ...c,
    offerCount: counts.get(nameKey(c.name)) ?? 1
  }));
}

export function uncommonIds(courses) {
  return attachOfferCount(courses).filter(c => c.offerCount === 1).map(c => c.id);
}
