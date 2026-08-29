// Diff extracted records against last known good. Merge never overwrites verified with unverified.

export function normName(n) {
  return String(n)
    .toLowerCase()
    .replace(/bachelor of /g, '')
    .replace(/master of /g, 'master ')
    .replace(/doctor of /g, 'doctor ')
    .replace(/\(honours\)/g, 'honours')
    .replace(/\bhonours\b/g, 'honours')
    .replace(/chemical and biomolecular/g, 'chemical')
    .replace(/\//g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip stream suffixes the table adds ("Engineering", "biomolecular") so catalogue aliases match. */
function coreName(n) {
  return normName(n)
    .replace(/\bbiomolecular\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ engineering$/g, '')
    .trim();
}

export function namesMatch(a, b) {
  if (normName(a) === normName(b)) return true;
  return coreName(a) === coreName(b);
}

export function findMatch(extracted, catalogue) {
  const byId = catalogue.find(c => c.id === extracted.id);
  if (byId) return byId;
  return catalogue.find(c => namesMatch(c.name, extracted.name)) ?? null;
}

function subjectsOf(list) {
  return (list ?? []).map(x => {
    const band = x.minBand != null ? `>=${x.minBand}` : '';
    return `${x.subject}${band}`;
  }).slice().sort();
}

function rulesOf(c) {
  return {
    verification: c.verification ?? 'unverified',
    hardRules: [...(c.hardRules ?? [])].sort(),
    assumed: subjectsOf(c.assumedKnowledge),
    recommended: subjectsOf(c.recommendedStudies),
    hurdles: (c.extraHurdles ?? []).map(h => h.type ?? h).sort()
  };
}

function sameRules(a, b) {
  return JSON.stringify(rulesOf(a)) === JSON.stringify(rulesOf(b));
}

function ruleChanges(from, to) {
  const A = rulesOf(from), B = rulesOf(to);
  const out = [];
  if (JSON.stringify(A.hardRules) !== JSON.stringify(B.hardRules))
    out.push({ field: 'hardRules', from: A.hardRules, to: B.hardRules });
  if (JSON.stringify(A.assumed) !== JSON.stringify(B.assumed))
    out.push({ field: 'assumedKnowledge', from: A.assumed, to: B.assumed });
  if (JSON.stringify(A.recommended) !== JSON.stringify(B.recommended))
    out.push({ field: 'recommendedStudies', from: A.recommended, to: B.recommended });
  return out;
}

/**
 * Compare extract against catalogue courses.
 * Changes to existing records are flagged, never silently applied.
 */
export function diffExtract(extract, catalogueCourses) {
  const catalogue = catalogueCourses ?? [];
  const matched = new Set();
  const unchanged = [];
  const changed = [];
  const added = [];

  for (const ex of extract.courses) {
    const hit = findMatch(ex, catalogue);
    if (!hit) {
      added.push(ex);
      continue;
    }
    matched.add(hit.id);
    if (sameRules(hit, ex)) unchanged.push({ id: hit.id, name: hit.name });
    else changed.push({
      id: hit.id,
      name: hit.name,
      extractedId: ex.id,
      verification: ex.verification,
      changes: ruleChanges(hit, ex),
      extracted: ex
    });
  }

  const missing = catalogue.filter(c => !matched.has(c.id)).map(c => ({
    id: c.id,
    name: c.name,
    verification: c.verification,
    note: 'In the catalogue, not in this table extract (faculty-level aggregate, renamed, or removed).'
  }));

  return {
    unchanged,
    changed,
    added,
    missing,
    stops: changed.length > 0  // stage 3: a change stops the pipeline and flags it
  };
}

/**
 * Merge policy:
 *  - never overwrite verified with unverified
 *  - never mutate existing verified records (flag only — human applies those)
 *  - --apply may append new *verified* courses
 */
export function mergeCatalogue(uniFile, extract, diff, { apply = false } = {}) {
  const courses = [...(uniFile.courses ?? [])];
  const keptVerified = [];
  const appended = [];
  const skippedUnverified = [];

  for (const ch of diff.changed) {
    const existing = courses.find(c => c.id === ch.id);
    if (existing?.verification === 'verified' && ch.verification !== 'verified') {
      keptVerified.push({ id: ch.id, reason: 'refusing unverified overwrite of verified record' });
      continue;
    }
    if (existing?.verification === 'verified') {
      keptVerified.push({ id: ch.id, reason: 'verified record changed in source — flagged, not overwritten' });
    }
  }

  const repaired = [];
  if (apply) {
    for (const ch of diff.changed) {
      const existing = courses.find(c => c.id === ch.id);
      const incoming = ch.extracted;
      if (!existing || !incoming) continue;
      if (isRepair(existing, incoming)) {
        const idx = courses.findIndex(c => c.id === ch.id);
        const next = toCatalogueCourse(incoming);
        next.id = existing.id;
        next.nameRecognition = existing.nameRecognition ?? next.nameRecognition;
        courses[idx] = next;
        repaired.push(next.id);
      }
    }
    for (const ex of diff.added) {
      if (ex.verification !== 'verified') {
        skippedUnverified.push({ id: ex.id, name: ex.name });
        continue;
      }
      appended.push(toCatalogueCourse(ex));
      courses.push(toCatalogueCourse(ex));
    }
  }

  return {
    university: uniFile.university,
    courses,
    appended,
    repaired,
    keptVerified,
    skippedUnverified,
    wrote: apply && (appended.length > 0 || repaired.length > 0)
  };
}

/** Completeness repair: fill omitted subjects / minBand. Never drop a subject the catalogue already had. */
export function isRepair(existing, incoming) {
  if (incoming.verification !== 'verified') return false;
  const have = existing.assumedKnowledge ?? [];
  const next = incoming.assumedKnowledge ?? [];
  const lost = have.filter(h => !next.some(n => n.subject === h.subject));
  if (lost.length) return false;
  if (existing.verification === 'incomplete') return true;
  if (existing.verification === 'unverified' && incoming.verification === 'verified') return true;
  const gained = next.filter(n => !have.some(h => h.subject === n.subject));
  const gainedBand = next.some(n => n.minBand != null && !have.some(h => h.subject === n.subject && h.minBand != null));
  return gained.length > 0 || gainedBand;
}

/** Shape a pipeline record into the catalogue schema the engine already reads. */
export function toCatalogueCourse(ex) {
  const out = {
    id: ex.id,
    name: ex.name,
    field: ex.field,
    hardRules: ex.hardRules ?? [],
    assumedKnowledge: (ex.assumedKnowledge ?? []).map(a => {
      const row = {
        subject: a.subject,
        quote: a.quote,
        source: a.source,
        tier: a.tier ?? 'A'
      };
      if (a.minBand != null) row.minBand = a.minBand;
      return row;
    }),
    extraHurdles: ex.extraHurdles ?? [],
    nameRecognition: ex.nameRecognition ?? 'low',
    verification: ex.verification,
    capturedOn: ex.capturedOn,
    source: ex.source
  };
  if (ex.recommendedStudies?.length) out.recommendedStudies = ex.recommendedStudies;
  if (ex.assumedChoices?.length) out.assumedChoices = ex.assumedChoices;
  if (ex.reviewed) out.reviewed = ex.reviewed;
  return out;
}
