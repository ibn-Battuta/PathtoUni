// Assembles the key-dates timeline for one cohort. Deterministic: same file in, same list out.
//
// The one rule that matters: a later cohort never gets a date nobody has published. When
// the 2027 round of a scheme has not been announced, the 2028 view shows the 2026 date as
// what it is — "last year's date" — placed in the matching month a year on so the timeline
// reads in order, and labelled "around <month>", never as a day.

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shiftYear(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(y + n).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function monthKey(iso) { return iso.slice(0, 7); }

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function aroundLabel(iso) {
  const [y, m] = iso.split('-').map(Number);
  return { short: `Around ${MONTHS_SHORT[m - 1]}`, year: String(y), long: `around ${MONTHS_LONG[m - 1]} ${y}` };
}

/** The items shown for one cohort, in date order.
 *  kind 'confirmed' — a published date for this cohort.
 *  kind 'last-year' — the previous cohort's date, shown for planning only. */
export function cohortView(data, cohortId) {
  const ids = (data?.cohorts ?? []).map(c => c.id).sort();
  const idx = ids.indexOf(cohortId);
  const prev = idx > 0 ? ids[idx - 1] : null;
  const items = [];
  for (const e of data?.events ?? []) {
    if ((e.cohorts ?? []).includes(cohortId)) {
      items.push({ event: e, kind: 'confirmed', sortDate: e.date, endDate: e.end || e.date });
    } else if (prev && e.repeats && (e.cohorts ?? []).includes(prev)) {
      const sortDate = shiftYear(e.date, 1);
      items.push({ event: e, kind: 'last-year', sortDate, endDate: shiftYear(e.end || e.date, 1), around: aroundLabel(sortDate) });
    }
  }
  items.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.event.title.localeCompare(b.event.title));
  return items;
}

/** Items grouped by month, in order: [{ key, label, items }]. */
export function byMonth(items) {
  const groups = [];
  for (const it of items) {
    const key = monthKey(it.sortDate);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, label: monthLabel(key), items: [] }; groups.push(g); }
    g.items.push(it);
  }
  return groups;
}

/** Confirmed items whose last day is on or after today and that are not already closed,
 *  soonest first — "coming up" means something you can still act on. */
export function upcoming(items, todayIso, n = 3) {
  return items.filter(it => it.kind === 'confirmed' && !it.event.status && it.endDate >= todayIso).slice(0, n);
}
