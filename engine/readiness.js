// The readiness engine. Deterministic. NO model call in this path, ever.
// readiness(profile, course, ctx) -> { band, gateStatus, findings[], hurdles[], needsInput[], sources[] }
import { subjectsHeld, mathsLevel, MATHS_SUBJECT_LEVEL, englishLevel, ENGLISH_SUBJECT_LEVEL } from './units.js';

export const BAND = { PREPARED: 0, MINOR_GAP: 1, BRIDGE_IT: 2, HARD_GAP: 3, GATED: 4 };
export const BAND_NAME = ['PREPARED', 'MINOR_GAP', 'BRIDGE_IT', 'HARD_GAP', 'GATED'];

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
export function evaluateGate(profile, gate) {
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
  const cost = canBridge && bridging.costAud ? ` (~$${bridging.costAud}, ${bridging.timing})` : '';
  return {
    subject, tier: 'C',
    band: BAND.BRIDGE_IT,
    why: canBridge
      ? `Assumed but not held. A bridging course is offered${cost}.`
      : `Assumed but not held. No bridging course listed for this subject - expect a harder first year.`
  };
}

export function readiness(profile, course, ctx = {}) {
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
export function subjectChangeImpact(profileBefore, profileAfter, courses, ctx) {
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
export function shortlist(profile, courses, ctx) {
  return courses
    .map(c => readiness(profile, c, ctx))
    .sort((a, b) => a.band - b.band || a.courseName.localeCompare(b.courseName));
}
