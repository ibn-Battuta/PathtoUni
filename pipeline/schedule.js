// Guards for data/schedule.json — the key-dates page. Every date there is quoted from the
// university's, UAC's or the provider's own page and was matched word for word in the
// desktop browser (docs/review/schedule-2026-11-05.md). These checks make sure the file
// cannot say more than that:
//  - every event carries its own quotes, from https pages;
//  - a written date ("Thu 23 Jul 2026") agrees with its ISO date, weekday included — a
//    typo in either is caught, and two pages that disagree must be shown as disagreeing;
//  - a quote may not stop in the middle of a price (error 25: "COST AUD $25." matched a
//    page that says "$25.90 per student");
//  - only a date from the earlier year may stand in for the later one, and only as
//    "last year's date" (see ui/schedule.js) — never as a date for the year ahead.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WRITTEN = /^(?:Week of )?(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})/;

/** A quote that ends on a money amount and a full stop may be a truncated price. */
export function truncatedPrice(text) {
  return /\$[\d,]+\.$/.test(String(text ?? '').trim());
}

/** Errors when a written date ("Thu 23 Jul 2026, 11.59pm") disagrees with its ISO date.
 *  Text that does not start with a weekday (a month, "27 or 28 Apr") is not checked. */
export function writtenDateErrors(text, iso, label = 'date') {
  const m = WRITTEN.exec(String(text ?? ''));
  if (!m) return [];
  if (!ISO.test(iso ?? '')) return [`${label}: "${text}" has no ISO date to agree with`];
  const [y, mo, d] = iso.split('-').map(Number);
  const errs = [];
  if (Number(m[4]) !== y || MONTHS.indexOf(m[3]) !== mo - 1 || Number(m[2]) !== d)
    errs.push(`${label}: "${text}" is not ${iso}`);
  const weekday = DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  if (weekday !== m[1]) errs.push(`${label}: "${text}" — ${iso} is a ${weekday}`);
  return errs;
}

export function validateSchedule(data, opportunities = null) {
  const errors = [];
  const cohorts = new Set((data?.cohorts ?? []).map(c => c.id));
  const sections = new Set((data?.sections ?? []).map(s => s.id));
  for (const s of data?.sections ?? []) if (s.hint && s.hint.length > 70) errors.push(`section ${s.id}: hint should fit on one line (70 characters)`);
  const oppIds = new Set((opportunities?.opportunities ?? []).map(o => o.id));
  const firstCohort = [...cohorts].sort()[0];
  if (!ISO.test(data?.checkedOn ?? '')) errors.push('checkedOn missing');
  const ids = new Set();
  for (const e of data?.events ?? []) {
    const at = e.id || '(no id)';
    if (ids.has(e.id)) errors.push(`duplicate event ${e.id}`);
    ids.add(e.id);
    if (!(e.cohorts ?? []).length) errors.push(`${at}: no cohorts`);
    for (const c of e.cohorts ?? []) if (!cohorts.has(c)) errors.push(`${at}: unknown cohort ${c}`);
    if (!sections.has(e.section)) errors.push(`${at}: unknown section ${e.section}`);
    for (const f of ['org', 'title', 'what', 'for', 'dateText'])
      if (!e[f]) errors.push(`${at}: ${f} is required`);
    if (!ISO.test(e.date ?? '')) errors.push(`${at}: date must be YYYY-MM-DD`);
    for (const [k, t] of [['opens', 'opensText'], ['end', 'endText'], ['result', 'resultText']]) {
      if (e[k] && !ISO.test(e[k])) errors.push(`${at}: ${k} must be YYYY-MM-DD`);
      if (Boolean(e[k]) !== Boolean(e[t])) errors.push(`${at}: ${k} and ${t} go together`);
    }
    if (!e.precision || e.precision === 'day') {
      errors.push(...writtenDateErrors(e.dateText, e.date, `${at} dateText`));
      errors.push(...writtenDateErrors(e.endText, e.end, `${at} endText`));
      errors.push(...writtenDateErrors(e.opensText, e.opens, `${at} opensText`));
      errors.push(...writtenDateErrors(e.resultText, e.result, `${at} resultText`));
    }
    if (e.opens && e.opens > e.date) errors.push(`${at}: opens after it closes`);
    if (e.end && e.end < e.date) errors.push(`${at}: ends before it starts`);
    if (e.result && e.result < e.date) errors.push(`${at}: offers before applications close`);
    if (e.repeats && !(e.cohorts ?? []).includes(firstCohort))
      errors.push(`${at}: only a ${firstCohort} date can stand in as last year's date`);
    if (e.opportunity && opportunities && !oppIds.has(e.opportunity))
      errors.push(`${at}: unknown opportunity ${e.opportunity}`);
    if (!(e.quotes ?? []).length) errors.push(`${at}: no quotes — a date without the page's own words is a guess`);
    for (const q of e.quotes ?? []) {
      if (!q.text) errors.push(`${at}: empty quote`);
      if (!/^https:\/\//.test(q.url ?? '')) errors.push(`${at}: quote source must be https`);
      if (truncatedPrice(q.text)) errors.push(`${at}: quote "${q.text}" may stop in the middle of a price`);
    }
  }
  for (const n of data?.notes ?? []) {
    const at = n.id || '(note)';
    if (!n.text) errors.push(`${at}: note text required`);
    const quoted = (n.quotes ?? []).length > 0;
    if (!quoted && !(n.basis && /^https:\/\//.test(n.source ?? '')))
      errors.push(`${at}: a note needs quotes, or a stated basis and a source`);
  }
  for (const a of data?.afterSchool ?? []) {
    const at = a.id || '(after-school)';
    for (const f of ['name', 'provider', 'who', 'what', 'when'])
      if (!a[f]) errors.push(`${at}: ${f} is required`);
    if (typeof a.fitsUni !== 'boolean') errors.push(`${at}: fitsUni must say whether it fits alongside full-time university`);
    if (!(a.quotes ?? []).length) errors.push(`${at}: no quotes`);
    for (const q of a.quotes ?? []) {
      if (!/^https:\/\//.test(q.url ?? '')) errors.push(`${at}: quote source must be https`);
      if (truncatedPrice(q.text)) errors.push(`${at}: quote "${q.text}" may stop in the middle of a price`);
    }
  }
  for (const id of data?.anytime ?? [])
    if (opportunities && !oppIds.has(id)) errors.push(`anytime: unknown opportunity ${id}`);
  for (const y of data?.year11 ?? []) {
    if (!y.text) errors.push('year11: empty item');
    for (const r of y.refs ?? []) if (!ids.has(r)) errors.push(`year11: unknown event ${r}`);
  }
  return errors;
}
