// Guards for data/opportunities.json — "Try it before you choose".
// An entry is listed only where the provider's own page says school students can take
// part. Its quotes are string-matched against the live pages by code (see
// docs/review/opportunities.md); these checks make sure the file cannot say more than
// that: every quote cites one of the entry's own sources, nothing unverified ships, and
// topics are the same ones the quiz and course pages use.

export function validateOpportunities(data, topicIds = []) {
  const errors = [];
  const kinds = new Set((data?.kinds ?? []).map(k => k.id));
  const ids = new Set();
  for (const o of data?.opportunities ?? []) {
    const at = o.id || '(no id)';
    if (ids.has(o.id)) errors.push(`duplicate opportunity ${o.id}`);
    ids.add(o.id);
    if (!kinds.has(o.kind)) errors.push(`${at}: unknown kind ${o.kind}`);
    for (const f of ['name', 'provider', 'who', 'when', 'cost', 'where', 'how'])
      if (!o[f]) errors.push(`${at}: ${f} is required`);
    if (!Array.isArray(o.years) || !o.years.length || o.years.some(y => !Number.isInteger(y) || y < 7 || y > 12))
      errors.push(`${at}: years must be school years 7–12`);
    if (!(o.sources ?? []).length) errors.push(`${at}: no sources`);
    for (const s of o.sources ?? []) if (!/^https:\/\//.test(s)) errors.push(`${at}: source must be https`);
    if (!(o.quotes ?? []).length) errors.push(`${at}: no quotes — an entry without the provider's own words is a guess`);
    for (const q of o.quotes ?? []) {
      if (!q.text) errors.push(`${at}: empty quote`);
      if (!(o.sources ?? []).includes(q.url)) errors.push(`${at}: quote cites ${q.url}, which is not one of its sources`);
      // Error 25: "COST AUD $25." matched a page that says "$25.90 per student".
      if (/\$[\d,]+\.$/.test(String(q.text ?? '').trim())) errors.push(`${at}: quote "${q.text}" may stop in the middle of a price`);
    }
    if (o.anyTopic && (o.topics ?? []).length) errors.push(`${at}: anyTopic and topics are exclusive`);
    if (!o.anyTopic && !(o.topics ?? []).length) errors.push(`${at}: no topics and not anyTopic`);
    for (const t of o.topics ?? []) if (topicIds.length && !topicIds.includes(t)) errors.push(`${at}: unknown topic ${t}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.checkedOn ?? '')) errors.push(`${at}: checkedOn date missing`);
    if (o.verification !== 'verified') errors.push(`${at}: not verified — an unverified entry is treated as absent`);
  }
  return errors;
}

/** Entries that name at least one of these topics. anyTopic entries are left out: they fit
 *  everyone, so listing them beside a course would say nothing about that course. */
export function opportunitiesForTopics(data, topicIds = []) {
  return (data?.opportunities ?? []).filter(o => !o.anyTopic && (o.topics ?? []).some(t => topicIds.includes(t)));
}

/** True when an entry was checked longer ago than the file allows. Dates change every year. */
export function isStale(o, today, days = 365) {
  const checked = Date.parse(o.checkedOn + 'T00:00:00Z');
  const now = Date.parse(today + 'T00:00:00Z');
  return Number.isFinite(checked) && Number.isFinite(now) && (now - checked) / 86400000 > days;
}
