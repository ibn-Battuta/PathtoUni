// Independent second pass, used only on diffs.
// Re-reads the layout text (not the bbox columns). Agreement keeps verified;
// disagreement marks conflict for human review. A model adapter can replace
// this later for unstructured course pages; the table does not need one.

import { findVerbatim } from './quote.js';

function collapse(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Window of layout text after the course name. If the name cannot be found,
 * return null (cannot confirm or deny).
 */
export function courseWindow(layoutText, courseName, span = 900) {
  const hit = findVerbatim(layoutText, courseName);
  if (!hit) {
    // Combined names wrap; try a distinctive tail in parentheses.
    const m = courseName.match(/\(([^)]+)\)\s*$/);
    if (m) {
      const alt = findVerbatim(layoutText, m[1]);
      if (!alt) return null;
      const i = layoutText.indexOf(alt);
      return layoutText.slice(Math.max(0, i - 80), i + span);
    }
    return null;
  }
  const i = layoutText.indexOf(hit);
  return layoutText.slice(i, i + span);
}

/**
 * Confirm changed fields against the layout-text window.
 * Returns { status: 'agree' | 'conflict' | 'unconfirmed', mismatches[] }.
 */
export function secondCheck(change, layoutText, { wholePage = false } = {}) {
  const ex = change.extracted;
  const window = wholePage ? layoutText : courseWindow(layoutText, ex.name);
  if (window == null) {
    return { status: 'unconfirmed', mismatches: [{ reason: 'course name not found in layout text' }] };
  }
  const mismatches = [];
  for (const ak of ex.assumedKnowledge ?? []) {
    const inWindow = findVerbatim(window, ak.subject)
      || (ak.quote && findVerbatim(window, ak.quote));
    if (!inWindow)
      mismatches.push({ field: 'assumedKnowledge', subject: ak.subject });
  }
  if ((ex.hardRules ?? []).includes('usyd-maths-gate')) {
    if (!findVerbatim(window, 'Mathematics Advanced (Band 4)'))
      mismatches.push({ field: 'hardRules', subject: 'Mathematics Advanced (Band 4)' });
  }
  // A change that *drops* a gate: layout window must not contain the Band 4 phrase
  // sitting as a "Course Prerequisites" cell. Too noisy to prove a negative here;
  // only flag positive claims that the window cannot support.
  return {
    status: mismatches.length ? 'conflict' : 'agree',
    mismatches
  };
}

export function checkDiffs(diff, layoutText, pages = []) {
  return (diff.changed ?? []).map(ch => {
    const src = ch.extracted?.url || ch.extracted?.source;
    const page = pages.find(p => p.url === src);
    if (page?.text || page?.html) {
      return {
        id: ch.id,
        name: ch.name,
        ...secondCheck(ch, page.text || page.html, { wholePage: true })
      };
    }
    return {
      id: ch.id,
      name: ch.name,
      ...secondCheck(ch, layoutText)
    };
  });
}
