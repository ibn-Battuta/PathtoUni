// Completeness guard.
//
// Quote-verification proves a quote is REAL. It does not prove the extraction is COMPLETE.
// The quote-match rule catches invention; it is blind to omission — and omission fails
// toward "no requirements found", which the engine reads as PREPARED. That is the
// reassuring direction, which makes it the dangerous one.
//
// So: if a capture states assumed knowledge and the parsed record does not account for it,
// the record is `incomplete`. Incomplete is treated as unknown, never as "nothing required".

/** Every phrasing a NSW university uses to introduce assumed knowledge. Extend as new ones appear. */
export const AK_PHRASES = [
  /assumed knowledge required\s*:/i,
  /assumed knowledge\s*:/i,
  /assumed knowledge is\b/i,
  /it is assumed that you have\b/i,
  /assumed to have (?:completed|studied)\b/i,
  /assumes students will have\b/i
];

/** Pull the assumed-knowledge sentence(s) out of a capture. */
export function assumedKnowledgeSentences(captureText) {
  if (!captureText) return [];
  const out = [];
  for (const re of AK_PHRASES) {
    const g = new RegExp(re.source + '([^.]*\\.)', 'gi');
    let m;
    while ((m = g.exec(captureText)) !== null) {
      const s = (m[0] || '').replace(/\s+/g, ' ').trim();
      if (s && !out.includes(s)) out.push(s);
    }
  }
  return out;
}

/** Subject-ish tokens a human would expect to see parsed out of that sentence. */
export function expectedTokens(sentence) {
  const t = new Set();
  const s = sentence.toLowerCase();
  if (/\bmathematics\b|\bmaths\b/.test(s)) t.add('mathematics');
  if (/\benglish\b/.test(s)) t.add('english');
  if (/\bphysics\b/.test(s)) t.add('physics');
  if (/\bchemistry\b/.test(s)) t.add('chemistry');
  if (/\bbiology\b/.test(s)) t.add('biology');
  if (/\bscience\b/.test(s)) t.add('science');
  return [...t];
}

/** Bands stated in the sentence but not carried onto any parsed entry. */
export function statedBands(sentence) {
  const out = [];
  const re = /band\s+(e?\d)/gi;
  let m;
  while ((m = re.exec(sentence)) !== null) out.push(m[1].toUpperCase());
  return out;
}

/**
 * Audit one course record against its capture.
 * Returns { complete, reasons[] } — reasons are human-readable and go into the record.
 */
export function auditCourse(course, captureText) {
  const sentences = assumedKnowledgeSentences(captureText);
  const reasons = [];
  if (!sentences.length) return { complete: true, reasons, sentences };

  const parsed = (course.assumedKnowledge ?? []).map(a => (a.subject || '').toLowerCase());
  const parsedBlob = parsed.join(' ');

  for (const s of sentences) {
    for (const tok of expectedTokens(s)) {
      const hit = tok === 'science'
        ? /physics|chemistry|biology|science/.test(parsedBlob)
        : parsedBlob.includes(tok);
      if (!hit) reasons.push(`source states "${tok}" in assumed knowledge; not present in the parsed record`);
    }
    for (const b of statedBands(s)) {
      const carried = (course.assumedKnowledge ?? []).some(a => a.minBand !== undefined);
      if (!carried) reasons.push(`source states Band ${b}; no minBand carried onto any entry`);
    }
  }
  return { complete: reasons.length === 0, reasons: [...new Set(reasons)], sentences };
}
