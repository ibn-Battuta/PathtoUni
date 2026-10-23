// Guards for data/industries.json. The quotes themselves are string-matched against the
// live sources (see docs/review/industries.md). These checks make sure the file cannot
// say more than the quotes do: an industry may only list a source whose quote actually
// names that industry.

const ECONOMIES = new Set(['au', 'us', 'eu', 'uk', 'cn', 'in', 'jp', 'kr']);

export function termMatches(quote, term) {
  // Terms written with \b are case-sensitive word matches ("AI"); others are plain,
  // case-insensitive substrings.
  if (term.includes('\\b')) return new RegExp(term).test(quote);
  return quote.toLowerCase().includes(term.toLowerCase());
}

export function validateIndustries(data, topicIds = []) {
  const errors = [];
  const sources = new Map();
  for (const s of data?.sources ?? []) {
    if (sources.has(s.id)) errors.push(`duplicate source ${s.id}`);
    sources.set(s.id, s);
    if (!ECONOMIES.has(s.economy)) errors.push(`${s.id}: unknown economy ${s.economy}`);
    if (!(data.economies ?? []).some(e => e.id === s.economy)) errors.push(`${s.id}: economy ${s.economy} is not in the economies list`);
    if (!/^https:\/\//.test(s.url ?? '')) errors.push(`${s.id}: url must be https`);
    if (!s.publisher || !s.title) errors.push(`${s.id}: publisher and title are required`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.checkedOn ?? '')) errors.push(`${s.id}: checkedOn date missing`);
    if (s.verification !== 'verified') errors.push(`${s.id}: not verified — an unverified quote is treated as absent`);
    if (!s.quotes || !Object.keys(s.quotes).length) errors.push(`${s.id}: no quotes`);
  }
  for (const e of data?.economies ?? []) {
    if (!e.short || !e.long) errors.push(`${e.id}: short and long names are required (the page text is built from them)`);
  }
  for (const ind of data?.industries ?? []) {
    if (!ind.terms?.length) errors.push(`${ind.id}: no terms to check evidence against`);
    for (const t of ind.topics ?? []) if (topicIds.length && !topicIds.includes(t)) errors.push(`${ind.id}: unknown topic ${t}`);
    if (!ind.evidence?.length) errors.push(`${ind.id}: no evidence`);
    for (const [sid, qid] of ind.evidence ?? []) {
      const s = sources.get(sid);
      const q = s?.quotes?.[qid];
      if (!q) { errors.push(`${ind.id}: evidence ${sid}/${qid} does not exist`); continue; }
      if (!ind.terms.some(t => termMatches(q, t)))
        errors.push(`${ind.id}: quote ${sid}/${qid} does not name this industry`);
    }
  }
  return errors;
}

/** Economies that name an industry, in the file's order, each with its evidence. */
export function evidenceByEconomy(data, industry) {
  const sources = new Map((data.sources ?? []).map(s => [s.id, s]));
  return (data.economies ?? []).map(e => ({
    economy: e,
    items: (industry.evidence ?? [])
      .map(([sid, qid]) => ({ source: sources.get(sid), quote: sources.get(sid)?.quotes?.[qid] }))
      .filter(x => x.source?.economy === e.id && x.quote)
  })).filter(x => x.items.length);
}

/**
 * The economies as one phrase for page text: "Australia, the US, … and South Korea".
 * Built from the file so the page can never name a different list from the data —
 * it did, by hand, until 23 Oct 2026.
 */
export function economyList(data, form = 'short') {
  const names = (data?.economies ?? []).map(e => e[form] ?? e.label);
  if (names.length < 2) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

/** Earliest and latest checkedOn across the sources, for "checked between" lines. */
export function checkedRange(data) {
  const dates = (data?.sources ?? []).map(s => s.checkedOn).filter(Boolean).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}
