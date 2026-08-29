#!/usr/bin/env node
// Whole-catalogue second check.
//
// docs/PIPELINE.md specified "second-model check on diffs only". That is correct for an
// established catalogue and wrong for a cold start — and the entire catalogue was a cold
// start, so 127 of 130 rows were appended on quote-match alone and never independently
// re-read. Quote-match proves a phrase is real. Completeness proves nothing stated was
// dropped. Neither confirms the phrase was read under the right HEADING.
//
// This audits every stored course against its own capture, not just changed ones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLiteralSubstring } from './quote.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = path.join(ROOT, 'captures');
const COURSES = path.join(ROOT, 'data', 'courses');

function allCaptureTexts() {
  const out = [];
  if (!fs.existsSync(CAP)) return out;
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'text.txt') out.push({ path: p, slug: path.basename(path.dirname(p)), text: fs.readFileSync(p, 'utf8') });
    }
  };
  walk(CAP);
  return out;
}

/**
 * Scope a quote to the course's OWN capture.
 * A short quote like "Mathematics Extension 1" appears on nearly every page in the
 * corpus, so searching the whole corpus finds an arbitrary page and audits the wrong
 * document. The first version of this file did exactly that and produced a false alarm.
 */
function captureFor(texts, sourceUrl) {
  if (!sourceUrl) return null;
  const slug = sourceUrl.replace(/[?#].*$/, '').replace(/\/$/, '').split('/').pop();
  return texts.find(t => t.slug === slug)
      || texts.find(t => slug && t.slug && (t.slug.includes(slug) || slug.includes(t.slug)))
      || null;
}

/** Is the quote sitting under an assumed-knowledge heading, or somewhere else entirely? */
function headingFor(text, quote) {
  const i = text.indexOf(quote);
  if (i < 0) return null;
  const before = text.slice(Math.max(0, i - 400), i).toLowerCase();
  const last = h => before.lastIndexOf(h);
  const marks = {
    assumed: Math.max(last('assumed knowledge'), last('assumes students will have')),
    recommended: last('recommended studies'),
    prerequisite: Math.max(last('prerequisite'), last('entry requirement'))
  };
  const best = Object.entries(marks).sort((a, b) => b[1] - a[1])[0];
  return best[1] < 0 ? 'none' : best[0];
}

export function auditCatalogue() {
  const texts = allCaptureTexts();
  const rows = [];
  for (const f of fs.readdirSync(COURSES).filter(x => x.endsWith('.json'))) {
    const uni = JSON.parse(fs.readFileSync(path.join(COURSES, f), 'utf8'));
    for (const c of uni.courses ?? []) {
      for (const ak of c.assumedKnowledge ?? []) {
        if (!ak.quote) { rows.push({ uni: uni.university, id: c.id, subject: ak.subject, status: 'no-quote' }); continue; }
        const own = captureFor(texts, ak.source);
        if (!own) { rows.push({ uni: uni.university, id: c.id, subject: ak.subject, status: 'no-capture-for-source' }); continue; }
        if (!isLiteralSubstring(own.text, ak.quote)) {
          rows.push({ uni: uni.university, id: c.id, subject: ak.subject, status: 'quote-not-on-its-own-page' }); continue;
        }
        const hit = own;
        const h = headingFor(hit.text, ak.quote);
        rows.push({
          uni: uni.university, id: c.id, subject: ak.subject,
          status: h === 'assumed' ? 'ok' : `under-${h}`
        });
      }
    }
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = auditCatalogue();
  const tally = {};
  rows.forEach(r => tally[r.status] = (tally[r.status] || 0) + 1);
  console.log(`assumed-knowledge entries audited: ${rows.length}`);
  console.log(JSON.stringify(tally, null, 1));
  const bad = rows.filter(r => r.status !== 'ok');
  if (bad.length) {
    console.log('\nNot under an assumed-knowledge heading:');
    for (const b of bad.slice(0, 25)) console.log(`  ${b.status.padEnd(26)} ${b.uni} · ${b.id} · ${b.subject}`);
    if (bad.length > 25) console.log(`  … ${bad.length - 25} more`);
  }
}
