// Builds the assistant's knowledge from the same files the site is built from — never from
// anything else. One chunk per course, scheme, date, program and guide page. Each chunk
// keeps the site page it came from (so every answer can link back) and the source page the
// fact was quoted from. Unverified records are left out, exactly as the site leaves them out.

import fs from 'node:fs';
import path from 'node:path';

const read = (root, p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const strip = html => String(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();
const list = xs => xs.filter(Boolean).join('; ');

export function buildKnowledge(root) {
  const chunks = [];
  const add = c => chunks.push(c);

  // Courses and institution rules.
  const gates = {};
  const unis = [];
  for (const f of fs.readdirSync(path.join(root, 'data/courses')).filter(x => x.endsWith('.json'))) {
    const u = read(root, path.join('data/courses', f));
    unis.push(u);
    if (u._mathsGate) gates[u._mathsGate.id] = u._mathsGate;
  }
  for (const u of unis) {
    const ir = u.institutionRule;
    if (ir?.quote && ir.verification !== 'unverified')
      add({ id: `uni-${u.university}`, kind: 'institution', title: `${u.university}: does it have subject prerequisites?`,
        page: '/guides/prerequisites/', sources: [ir.source].filter(Boolean),
        text: `${u.university} ${ir.hasSubjectPrerequisites ? 'has some subject prerequisites' : 'says it has no formal subject prerequisites; it publishes assumed knowledge'}. In its words: "${ir.quote}".` });
    if (u.bridging?.quote)
      add({ id: `bridging-${u.university}`, kind: 'bridging', title: `${u.university}: bridging courses`, page: '/guides/assumed-knowledge/',
        sources: [u.bridging.source].filter(Boolean), text: `"${u.bridging.quote}"` });
    for (const c of u.courses ?? []) {
      if (c.verification === 'unverified') continue;
      const gate = (c.hardRules ?? []).map(id => gates[id]).filter(Boolean);
      const ak = (c.assumedKnowledge ?? []).map(a => a.subject);
      const rec = (c.recommendedStudies ?? []).map(a => a.subject);
      const hurdles = (c.extraHurdles ?? []).map(h => h.label);
      const text = [
        `${c.name} at ${u.university}.`,
        gate.length ? `Entry rule (a real prerequisite): "${gate.map(g => g.quote).join('; ')}".` : 'No subject prerequisite is published for this course.',
        ak.length ? `Assumed knowledge (does not stop you applying): ${list(ak)}. The university's words: "${[...new Set((c.assumedKnowledge ?? []).map(a => a.quote))].join('; ')}".` : 'No assumed knowledge is listed.',
        rec.length ? `Recommended studies: ${list(rec)}.` : '',
        hurdles.length ? `Extra steps besides the ATAR: ${list(hurdles)}.` : '',
        c.restrictedTo ? `Open to some students only: ${c.restrictedTo.label ?? 'see the course page'}.` : '',
        c.notEntryPoint ? 'School leavers cannot start this course directly.' : '',
        `Checked ${c.checkedOn ?? c.capturedOn ?? u.capturedOn}. Which band you are in depends on your own subjects — see the Results page.`
      ].filter(Boolean).join(' ');
      add({ id: `course-${c.id}`, kind: 'course', title: `${c.name} — ${u.university}`, page: `/course/${c.id}/`,
        sources: [c.source ?? u.institutionRule?.source].filter(Boolean), text });
    }
  }

  // Reviewed discovery descriptions only.
  const ddir = path.join(root, 'data/discovery');
  if (fs.existsSync(ddir)) for (const f of fs.readdirSync(ddir).filter(x => x.endsWith('.json'))) {
    const d = read(root, path.join('data/discovery', f));
    if (d.reviewed !== true) continue;
    add({ id: `about-${d.courseId}`, kind: 'description', title: `What ${d.courseId.replace(/-/g, ' ')} is really like`,
      page: `/course/${d.courseId}/`, sources: (d.sources ?? []).map(s => s.url ?? s).filter(x => typeof x === 'string'),
      text: [d.firstYear, d.notThis].filter(Boolean).join(' ') });
  }

  // Early-entry schemes.
  const ee = read(root, 'data/early-entry.json');
  for (const s of ee.schemes ?? []) {
    if (s.verification !== 'verified' || !s.quote) continue;
    add({ id: `scheme-${s.id}`, kind: 'scheme', title: `${s.university} — ${s.name} (early offer)`, page: '/dates/',
      sources: [s.source], text: `${s.university} ${s.name}. In its words: "${s.quote}" Checked ${s.capturedOn}. Dates are on the Key dates page.` });
  }

  // Key dates.
  const sch = read(root, 'data/schedule.json');
  const label = Object.fromEntries(sch.cohorts.map(c => [c.id, `${c.label} (${c.who})`]));
  for (const e of sch.events) {
    const who = e.cohorts.map(c => label[c]).join(' and ');
    const text = [
      `${e.org}: ${e.title}. ${e.what}`,
      `Who: ${e.for}`,
      e.opensText ? `Applications open: ${e.opensText}.` : '',
      (e.opens || e.result) ? `Applications close: ${e.dateText}.` : (e.end ? `Dates: ${e.dateText} to ${e.endText}.` : `Date: ${e.dateText}.`),
      e.resultText ? `Offers: ${e.resultText}.` : '',
      e.status ? `Status: ${e.status}.` : '',
      `This date is for: ${who}.`,
      e.repeats ? `For the following year the dates are not published yet; this is last year's date.` : '',
      `Quoted: ${e.quotes.map(q => `"${q.text}"`).join(' ')}`,
      `Checked ${sch.checkedOn}.`
    ].filter(Boolean).join(' ');
    add({ id: `date-${e.id}`, kind: 'date', title: `${e.org} — ${e.title}`, page: `/dates/#ev-${e.cohorts[0]}-${e.id}`,
      sources: [...new Set(e.quotes.map(q => q.url))], text });
  }
  for (const a of sch.afterSchool ?? [])
    add({ id: `after-${a.id}`, kind: 'after-school', title: `${a.name} (${a.provider}) — after Year 12`, page: '/dates/#y2028',
      sources: [...new Set(a.quotes.map(q => q.url))],
      text: `${a.name}, ${a.provider}. ${a.fitsUni ? 'Fits alongside full-time university.' : 'A job with training, instead of full-time university.'} Who: ${a.who} What: ${a.what} When: ${a.when} Quoted: ${a.quotes.map(q => `"${q.text}"`).join(' ')}` });
  for (const n of sch.notes ?? [])
    add({ id: `note-${n.id}`, kind: 'note', title: `${n.org || 'Early offers'}: not on the dates list`, page: '/dates/',
      sources: [...new Set([...(n.quotes ?? []).map(q => q.url), n.source].filter(Boolean))], text: n.text });
  add({ id: 'year11-checklist', kind: 'checklist', title: 'What to do in Year 11', page: '/dates/#y2028', sources: [],
    text: (sch.year11 ?? []).map(y => y.text).join(' ') });

  // Try it (programs for school students).
  const opp = read(root, 'data/opportunities.json');
  const kinds = Object.fromEntries(opp.kinds.map(k => [k.id, k.label]));
  for (const o of opp.opportunities) {
    if (o.verification !== 'verified') continue;
    add({ id: `program-${o.id}`, kind: 'program', title: `${o.name} (${o.provider}) — ${kinds[o.kind]}`, page: `/try-it/#opp-${o.id}`,
      sources: o.sources, text: `${o.name}, run by ${o.provider}. ${kinds[o.kind]}. Who: ${o.who} When: ${o.when} Cost: ${o.cost} Where: ${o.where} How to apply: ${o.how} ${o.status ? 'Right now: ' + o.status : ''} School years: ${o.years.join(', ')}. Checked ${o.checkedOn}.` });
  }

  // Future industries — names and which countries' plans name them.
  const ind = read(root, 'data/industries.json');
  const econ = Object.fromEntries((ind.economies ?? []).map(e => [e.id, e.label ?? e.id]));
  for (const i of ind.industries ?? []) {
    const srcIds = [...new Set((i.evidence ?? []).map(x => x[0]))];
    const srcs = (ind.sources ?? []).filter(s => srcIds.includes(s.id));
    const countries = [...new Set(srcs.map(s => econ[s.economy] ?? s.economy).filter(Boolean))];
    add({ id: `industry-${i.id}`, kind: 'industry', title: `Future industry: ${i.name}`, page: `/industries/#ind-${i.id}`,
      sources: srcs.map(s => s.url).filter(Boolean).slice(0, 3),
      text: `${i.name}. Named in official government investment plans of: ${countries.join(', ') || 'see the Industries page'}. The Industries page lists the NSW courses that lead there.` });
  }

  // Guide pages and About, as built.
  for (const [slug, title] of [['guides/prerequisites', 'Do NSW degrees have subject prerequisites?'], ['guides/assumed-knowledge', 'What assumed knowledge means'], ['guides/dropping-a-subject', 'Dropping a subject'], ['about', 'About this site, privacy and how answers are made']]) {
    const f = path.join(root, 'dist', slug, 'index.html');
    if (!fs.existsSync(f)) continue;
    const html = fs.readFileSync(f, 'utf8');
    const main = (html.match(/<main[\s\S]*?<\/main>/i) || html.match(/<div class="prose">[\s\S]*?<\/div>\s*<footer/i) || [html])[0];
    add({ id: `guide-${slug.replace(/\//g, '-')}`, kind: 'guide', title, page: `/${slug}/`, sources: [], text: strip(main).slice(0, 2500) });
  }

  // How to use the site.
  add({ id: 'site-how', kind: 'help', title: 'How to use Path to Uni', page: '/', sources: [],
    text: 'Three ways to start: Check my subjects (pick HSC subjects and see which STEM courses you are ready for), the Interest quiz, and Future jobs (courses linked to fields governments are investing in). My results puts each course in one of five groups: ready, a little to catch up, bridging course, a lot to catch up, and entry rule not met. The group is about how well your subjects prepare you, not whether you will get in. Key dates lists early offers, UAC rounds, open days and holiday programs for starting university in 2027 or 2028. Try it lists work experience, competitions and programs for school students. The site does not predict an ATAR or an offer.' });

  return { builtFrom: 'data/ and dist/ guide pages', count: chunks.length, chunks };
}
