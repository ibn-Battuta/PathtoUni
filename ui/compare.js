// Two subject sets, no winner. Restricted and incomplete courses are unknown on both sides.

export function compareResults(left, right) {
  const byId = new Map(right.map(r => [r.courseId, r]));
  const usable = [];
  const skipped = [];
  for (const a of left) {
    const b = byId.get(a.courseId);
    if (!b) continue;
    if (a.restrictedTo || b.restrictedTo) { skipped.push(a.courseId); continue; }
    if (!a.complete || !b.complete) { skipped.push(a.courseId); continue; }
    usable.push({ a, b, course: a.course });
  }
  const same = usable.filter(p => p.a.band === p.b.band);
  const aOpens = usable.filter(p => p.a.band < p.b.band);
  const bOpens = usable.filter(p => p.b.band < p.a.band);
  return {
    total: usable.length,
    same,
    aOpens,
    bOpens,
    skipped: skipped.length
  };
}
