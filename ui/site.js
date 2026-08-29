/*__HASH__*/
/*__ENGINE__*/

const PAGE = document.body.dataset.page;
const BASE = document.body.dataset.base || '';

const MATHS = [
  ['standard1', 'Standard 1'],
  ['standard2', 'Standard 2'],
  ['advanced', 'Advanced'],
  ['advanced_ext1', 'Advanced + Ext 1'],
  ['advanced_ext1_ext2', 'Ext 1 + Ext 2']
];
const ENGLISH = [
  ['english_standard', 'Standard'],
  ['english_advanced', 'Advanced'],
  ['english_eald', 'EAL/D']
];
const BAND_LABEL = {
  PREPARED: 'ready now',
  MINOR_GAP: 'small gap',
  BRIDGE_IT: 'bridging course',
  HARD_GAP: 'hard gap',
  GATED: 'blocked'
};
const BAND_CLASS = {
  PREPARED: 's-prep',
  MINOR_GAP: 's-minor',
  BRIDGE_IT: 's-bridge',
  HARD_GAP: 's-hard',
  GATED: 's-gated'
};

let state = decodeState(location.hash);
let step = 0;
const STEPS = ['year', 'maths', 'english', 'sciences', 'technology', 'other'];

function profileFrom(s) {
  const other = Array.from({ length: s.otherCount || 0 }, (_, i) => ({
    name: `Other subject ${i + 1}`, units: 2, area: `other${i}`
  }));
  return {
    year: s.year,
    intakeYear: 2028,
    mathsPathway: s.mathsPathway,
    english: s.english,
    sciences: s.sciences,
    technology: s.technology,
    other,
    bands: s.bands
  };
}

function writeHash() {
  const next = encodeState(state);
  const want = next ? '#' + next : '';
  if (location.hash !== want) history.replaceState(null, '', (location.pathname + location.search) + want);
}

function resultsHref() {
  const h = encodeState(state);
  return BASE + 'results/' + (h ? '#' + h : '');
}

function homeHref() {
  const h = encodeState(state);
  return BASE + (h ? '#' + h : '');
}

function courseHref(id) {
  const h = encodeState(state);
  return BASE + 'course/' + id + '/' + (h ? '#' + h : '');
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function chip(label, on, onClick, opts = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = label;
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (opts.disabled) {
    b.disabled = true;
    if (opts.title) b.title = opts.title;
  } else {
    b.addEventListener('click', () => { onClick(); afterChange(); });
  }
  return b;
}

function toggle(arr, v) {
  const i = arr.indexOf(v);
  if (i < 0) arr.push(v); else arr.splice(i, 1);
}

function runCatalogue(p) {
  return CATALOGUE.map(c => {
    const r = readiness(p, c, { gates: GATES, bridging: c._bridging });
    return { ...r, university: c.university, course: c };
  });
}

function afterChange() {
  if (state.year === 11 && state.mathsPathway === 'advanced_ext1_ext2')
    state.mathsPathway = 'advanced_ext1';
  writeHash();
  render();
}

function unitsPanel() {
  const wrap = el('div', 'pk');
  wrap.dataset.units = '1';
  if (!state.mathsPathway || !state.english.length || !state.year) {
    wrap.appendChild(el('p', 'hint', 'Choose year, mathematics and English to start counting units.'));
    return wrap;
  }
  const pat = validateAtarPattern(profileFrom(state));
  const urow = el('div', 'units');
  const left = el('span');
  left.append('Units ', el('b', null, String(pat.units)), ' · subject areas ', el('b', null, String(pat.areas)));
  const right = el('span', pat.valid ? 'ok' : 'bad');
  right.textContent = pat.valid ? 'ATAR pattern OK' : 'ATAR pattern fails';
  urow.append(left, right);
  wrap.appendChild(urow);
  if (!pat.valid && pat.violations[0]) {
    const v = el('p', 'hint fail');
    v.textContent = pat.violations[0];
    wrap.appendChild(v);
  }
  return wrap;
}

function renderPicker(root, opts = {}) {
  const { showCta = true, stepped = false } = opts;
  root.replaceChildren();
  if (stepped) {
    const prog = el('div', 'progress');
    prog.textContent = `Question ${step + 1} of ${STEPS.length}`;
    root.appendChild(prog);
  }

  function stepBox(id, title, body) {
    const box = el('div', 'step pk');
    box.dataset.step = id;
    if (stepped && STEPS[step] === id) box.classList.add('is-on');
    box.appendChild(el('label', 'q', title));
    body(box);
    return box;
  }

  root.appendChild(stepBox('year', 'Year', box => {
    const c = el('div', 'chips');
    [11, 12].forEach(y => c.appendChild(chip('Year ' + y, state.year === y, () => { state.year = y; })));
    box.appendChild(c);
  }));

  root.appendChild(stepBox('maths', 'Which mathematics?', box => {
    const c = el('div', 'chips');
    MATHS.forEach(([k, l]) => {
      const locked = k === 'advanced_ext1_ext2' && state.year === 11;
      c.appendChild(chip(l, state.mathsPathway === k, () => { state.mathsPathway = k; }, {
        disabled: locked,
        title: locked ? 'Extension 2 is a Year 12 course' : ''
      }));
    });
    box.appendChild(c);
    if (state.year === 11) {
      box.appendChild(el('p', 'hint', 'Extension 2 is a Year 12 course, so it is not available in Year 11.'));
    }
  }));

  root.appendChild(stepBox('english', 'English', box => {
    const c = el('div', 'chips');
    ENGLISH.forEach(([k, l]) => c.appendChild(chip(l, state.english[0] === k, () => { state.english = [k]; })));
    box.appendChild(c);
  }));

  root.appendChild(stepBox('sciences', 'Sciences', box => {
    const c = el('div', 'chips');
    subjects.sciences.forEach(s => {
      const label = s.name === 'Earth and Environmental Science' ? 'Earth & env.'
        : s.name === 'Investigating Science' ? 'Investigating' : s.name;
      c.appendChild(chip(label, state.sciences.includes(s.id), () => toggle(state.sciences, s.id)));
    });
    box.appendChild(c);
  }));

  root.appendChild(stepBox('technology', 'Technology', box => {
    const c = el('div', 'chips');
    subjects.technology.forEach(t => {
      const label = t.name === 'Engineering Studies' ? 'Eng. Studies'
        : t.name === 'Software Engineering' ? 'Software Eng.'
          : t.name === 'Enterprise Computing' ? 'Enterprise Comp.'
            : t.name === 'Design and Technology' ? 'Design & Tech' : t.name;
      c.appendChild(chip(label, state.technology.includes(t.id), () => toggle(state.technology, t.id)));
    });
    box.appendChild(c);
  }));

  const other = stepBox('other', 'Anything else', box => {
    box.appendChild(el('p', 'hint', 'No effect on STEM readiness — only counted for your ATAR pattern.'));
    const row = el('div', 'units');
    const st = el('div', 'stepper');
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−';
    minus.setAttribute('aria-label', 'One fewer other subject');
    minus.addEventListener('click', () => { state.otherCount = Math.max(0, state.otherCount - 1); afterChange(); });
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+';
    plus.setAttribute('aria-label', 'One more other subject');
    plus.addEventListener('click', () => { state.otherCount = Math.min(4, state.otherCount + 1); afterChange(); });
    const n = el('b', null, String(state.otherCount));
    st.append(minus, n, plus);
    row.append(el('span', 'mono', 'other 2-unit subjects'), st);
    box.appendChild(row);
    if (showCta) {
      const cta = el('div', 'cta-wrap');
      const go = el('button', 'btn', "See what's open to you");
      go.type = 'button';
      go.disabled = !isCompleteSelection(state);
      go.addEventListener('click', () => { writeHash(); location.href = resultsHref(); });
      cta.appendChild(go);
      box.appendChild(cta);
    }
  });
  root.appendChild(other);
  root.appendChild(unitsPanel());

  if (stepped) {
    const nav = el('div', 'step-nav');
    const back = el('button', 'btn ghost', 'Back');
    back.type = 'button';
    back.disabled = step === 0;
    back.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    const next = el('button', 'btn', step === STEPS.length - 1 ? "See what's open to you" : 'Next');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (step === STEPS.length - 1) {
        if (!isCompleteSelection(state)) return;
        writeHash();
        location.href = resultsHref();
        return;
      }
      step = Math.min(STEPS.length - 1, step + 1);
      render();
    });
    if (step === STEPS.length - 1) next.disabled = !isCompleteSelection(state);
    nav.append(back, next);
    root.appendChild(nav);
  } else if (showCta) {
    const cta = el('div', 'cta-wrap');
    const go = el('button', 'btn', "See what's open to you");
    go.type = 'button';
    go.disabled = !isCompleteSelection(state);
    go.addEventListener('click', () => { writeHash(); location.href = resultsHref(); });
    cta.appendChild(go);
    root.appendChild(cta);
  }
}

function captureDate(course) {
  return course.capturedOn || CAPTURED_ON;
}

function courseCard(r, opts = {}) {
  const row = el('article', 'row b-' + r.bandName);
  const hd = el('div', 'hd');
  const nm = el('span', 'nm');
  const a = document.createElement('a');
  a.href = courseHref(r.courseId);
  a.textContent = r.courseName;
  nm.appendChild(a);
  const right = el('span', 'uni');
  right.appendChild(el('span', 'tag t-' + r.bandName, bandLabel(r)));
  right.appendChild(document.createTextNode(' ' + r.university));
  hd.append(nm, right);
  row.appendChild(hd);

  (r.hurdles || []).forEach(h => {
    const t = typeof h === 'string' ? h : (h.type || h.name || 'extra requirement');
    row.appendChild(el('span', 'tag t-flag', t));
  });

  if (!r.complete) {
    row.appendChild(el('p', 'why', 'We could not fully read this university’s page — this is not a clear result.'));
  }
  r.findings.forEach(f => {
    row.appendChild(el('p', 'why', f.why));
    if (f.quote) row.appendChild(el('p', 'quote', '“' + f.quote + '”'));
  });
  (r.satisfiedBy || []).forEach(s => {
    row.appendChild(el('p', 'pass', s.why));
  });
  // Only mention the university's bridging courses when they actually cover the missing
  // subject. Saying "no bridging course for this subject" and then listing the university's
  // bridging courses in the next line reads as a contradiction to the person it is for.

/**
 * The band is BRIDGE_IT whenever a Tier C gap is capped there, whether or not this
 * university actually offers bridging in the missing subject. Labelling it "bridging course"
 * when no such course exists promises a remedy that is not on offer, so the label follows
 * the facts rather than the enum.
 */
function bandLabel(r) {
  if (r.bandName !== 'BRIDGE_IT') return BAND_LABEL[r.bandName];
  const subs = r.course?._bridging?.subjects || [];
  const gaps = (r.findings || []).map(f => f.subject);
  const covered = gaps.some(g => subs.some(b => g.toLowerCase().includes(b.toLowerCase())));
  return covered ? 'bridging course' : 'harder first year';
}

  const bridging = r.course?._bridging;
  if (r.bandName === 'BRIDGE_IT' && bridging?.subjects?.length) {
    const gaps = (r.findings || []).map(f => f.subject);
    const covered = gaps.filter(g => bridging.subjects.some(b => g.toLowerCase().includes(b.toLowerCase())));
    if (covered.length) {
      row.appendChild(el('p', 'why',
        `Bridging is offered in ${covered.join(' and ')} (about $${bridging.costAud}, ${bridging.timing || 'timing unpublished'}).`));
    } else if (gaps.length) {
      row.appendChild(el('p', 'why',
        `This university's bridging courses cover ${bridging.subjects.join(', ')} — not ${gaps.join(' or ')}.`));
    }
  }
  const srcs = new Set();
  (r.course?.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
  if (r.gate?.source) srcs.add(r.gate.source);
  if (opts.sources && srcs.size) {
    const p = el('p', 'src');
    const date = captureDate(r.course);
    p.append('Captured ' + date + '. ');
    [...srcs].slice(0, 2).forEach((u, i) => {
      if (i) p.append(' ');
      const l = document.createElement('a');
      l.href = u; l.target = '_blank'; l.rel = 'noopener';
      l.textContent = 'Source';
      p.appendChild(l);
    });
    row.appendChild(p);
  }
  return row;
}

function subjectChips() {
  const labels = [];
  if (state.year) labels.push('Year ' + state.year);
  const ml = MATHS.find(([k]) => k === state.mathsPathway);
  if (ml) labels.push(ml[1]);
  const elab = ENGLISH.find(([k]) => k === state.english[0]);
  if (elab) labels.push('English ' + elab[1]);
  state.sciences.forEach(id => {
    const s = subjects.sciences.find(x => x.id === id);
    if (s) labels.push(s.name);
  });
  state.technology.forEach(id => {
    const t = subjects.technology.find(x => x.id === id);
    if (t) labels.push(t.name);
  });
  if (state.otherCount) labels.push(state.otherCount + ' other');
  return labels;
}

function renderHome() {
  const picker = document.getElementById('picker');
  picker.dataset.mode = 'steps';
  renderPicker(picker, { showCta: true, stepped: true });
}

function renderResults() {
  const main = document.getElementById('results');
  if (!isCompleteSelection(state)) {
    main.replaceChildren();
    main.appendChild(el('p', 'lede', "Choose your subjects to see what's open to you."));
    const go = el('a', 'btn');
    go.href = homeHref();
    go.textContent = 'Choose your subjects';
    go.style.display = 'inline-block';
    go.style.textDecoration = 'none';
    main.appendChild(go);
    return;
  }

  const p = profileFrom(state);
  const results = runCatalogue(p);
  const order = ['PREPARED', 'MINOR_GAP', 'BRIDGE_IT', 'HARD_GAP', 'GATED'];
  const attention = results.filter(r => r.bandName !== 'PREPARED' || !r.complete);
  const prepared = results.filter(r => r.bandName === 'PREPARED' && r.complete);
  const byBand = Object.fromEntries(order.map(b => [b, results.filter(r => r.bandName === b)]));

  main.replaceChildren();

  const strip = el('div', 'strip');
  const inner = el('div', 'strip-inner');
  subjectChips().forEach(l => {
    const c = el('span', 'chip');
    c.textContent = l;
    inner.appendChild(c);
  });
  const edit = el('button', 'btn ghost', 'Edit subjects');
  edit.type = 'button';
  edit.addEventListener('click', () => {
    const d = document.getElementById('editor');
    d.hidden = !d.hidden;
    if (!d.hidden) {
      d.replaceChildren();
      renderPicker(d, { showCta: false, stepped: false });
    }
  });
  const copy = el('button', 'btn ghost', 'Copy link');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy link'; }, 1500);
    } catch {
      copy.textContent = 'Copy the address bar';
    }
  });
  inner.append(edit, copy);
  strip.appendChild(inner);
  main.appendChild(strip);

  const editor = el('div', 'drawer');
  editor.id = 'editor';
  editor.hidden = true;
  main.appendChild(editor);

  const gatedAsk = results.some(r => r.needsInput.some(x => /band/i.test(x)));
  if (gatedAsk) {
    const bd = el('div', 'bandask');
    bd.appendChild(el('label', 'q', 'Expected maths band'));
    bd.appendChild(el('p', 'hint', 'A course on your list is gated on a mark, not a subject. This is the only thing in NSW that can turn you away. You can skip this if you do not know yet.'));
    const target = state.mathsPathway === 'advanced_ext1_ext2' ? 'Mathematics Extension 1'
      : state.mathsPathway === 'advanced_ext1' ? 'Mathematics Extension 1'
        : 'Mathematics Advanced';
    const scale = /Extension/.test(target) ? 'extension' : 'hsc';
    const opts = scale === 'extension'
      ? [['E4', 4], ['E3', 3], ['E2', 2]]
      : [['Band 6', 6], ['Band 5', 5], ['Band 4', 4], ['Band 3', 3]];
    const c = el('div', 'chips');
    opts.forEach(([lbl, v]) => c.appendChild(chip(lbl, state.bands[target]?.band === v, () => {
      state.bands = { ...state.bands };
      if (state.bands[target]?.band === v) delete state.bands[target];
      else state.bands[target] = { band: v, scale };
    })));
    bd.appendChild(c);
    main.appendChild(bd);
  }

  main.appendChild(el('p', 'honest',
    'Most of what follows is open to you. That is the normal answer in New South Wales — universities publish assumed knowledge rather than hard prerequisites, so subjects rarely stop you being admitted. What matters is the short list that is not open, and why.'));

  const sum = el('div', 'summary');
  order.forEach(b => {
    const n = byBand[b].length;
    if (!n) return;
    const s = el('div', 'stat ' + BAND_CLASS[b]);
    s.appendChild(el('span', 'n', String(n)));
    s.appendChild(el('span', 'l', BAND_LABEL[b]));
    sum.appendChild(s);
  });
  main.appendChild(sum);

  const sec1 = el('section');
  const h1 = el('div', 'sh');
  h1.appendChild(el('h2', null, attention.length ? 'What needs attention' : 'Nothing needs attention'));
  h1.appendChild(el('span', 'count', attention.length ? attention.length + ' of ' + results.length : results.length + ' courses, no gaps'));
  sec1.appendChild(h1);
  if (attention.length) {
    const missing = {};
    attention.forEach(r => r.findings.forEach(f => { missing[f.subject] = (missing[f.subject] || 0) + 1; }));
    const parts = Object.entries(missing).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} (${n})`);
    if (parts.length) {
      const l = el('p', 'lede');
      l.textContent = 'Every gap on your list comes down to: ' + parts.join(', ') + '.';
      sec1.appendChild(l);
    }
    const rows = el('div', 'rows');
    attention.forEach(r => rows.appendChild(courseCard(r, { sources: true })));
    sec1.appendChild(rows);
  } else {
    sec1.appendChild(el('p', 'lede', 'Your subject set meets the published assumed knowledge for every fully captured course in the catalogue.'));
  }
  main.appendChild(sec1);

  const candidates = [
    ...state.sciences.map(s => ({ kind: 'sciences', id: s, label: subjects.sciences.find(x => x.id === s).name })),
    ...state.technology.map(t => ({ kind: 'technology', id: t, label: subjects.technology.find(x => x.id === t).name }))
  ];
  if (state.otherCount > 0) candidates.push({ kind: 'other', id: null, label: 'One other subject' });
  if (candidates.length) {
    const sec2 = el('section');
    const h2 = el('div', 'sh');
    h2.appendChild(el('h2', null, 'If you dropped one'));
    sec2.appendChild(h2);
    sec2.appendChild(el('p', 'lede', 'Each subject re-run against all ' + results.length + ' courses. This is the question Year 11 actually has to answer.'));
    const wrap = el('div', 'drops');
    candidates.forEach(c => {
      const altState = {
        ...state,
        sciences: c.kind === 'sciences' ? state.sciences.filter(x => x !== c.id) : state.sciences,
        technology: c.kind === 'technology' ? state.technology.filter(x => x !== c.id) : state.technology,
        otherCount: c.kind === 'other' ? Math.max(0, state.otherCount - 1) : state.otherCount
      };
      const alt = profileFrom(altState);
      const after = runCatalogue(alt);
      let worse = 0;
      after.forEach((a, i) => { if (a.band > results[i].band) worse++; });
      const altPat = validateAtarPattern(alt);
      const d = el('div', 'drop');
      d.appendChild(el('b', null, c.label));
      const delta = el('span', 'delta ' + (worse ? 'cost' : 'free'));
      delta.textContent = worse ? worse + ' courses worse' : 'nothing changes';
      d.appendChild(delta);
      if (!altPat.valid) {
        const w = el('span', 'delta cost');
        w.textContent = '· ATAR pattern fails';
        d.appendChild(w);
      }
      wrap.appendChild(d);
    });
    sec2.appendChild(wrap);
    main.appendChild(sec2);
  }

  const hasRecognition = CATALOGUE.some(c => c.nameRecognition);
  if (hasRecognition) {
    const unfamiliar = prepared.filter(r => r.course.nameRecognition === 'low');
    if (unfamiliar.length) {
      const sec3 = el('section');
      const h3 = el('div', 'sh');
      h3.appendChild(el('h2', null, 'Open to you, and probably unfamiliar'));
      h3.appendChild(el('span', 'count', unfamiliar.length + ' of ' + prepared.length + ' ready now'));
      sec3.appendChild(h3);
      sec3.appendChild(el('p', 'lede', 'Narrower degrees mean smaller cohorts and fewer exits if you change your mind. You cannot search for a degree whose name you have never heard.'));
      const rows = el('div', 'rows');
      unfamiliar.slice(0, 24).forEach(r => rows.appendChild(courseCard(r)));
      sec3.appendChild(rows);
      main.appendChild(sec3);
    }
    const rest = prepared.filter(r => r.course.nameRecognition !== 'low');
    if (rest.length) foldPrepared(main, rest, 'Everything else you are ready for');
  } else if (prepared.length) {
    foldPrepared(main, prepared, 'Everything else you are ready for');
  }

  const foot = document.getElementById('foot');
  const srcs = new Set();
  results.forEach(r => {
    (r.course.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
    if (r.gate?.source) srcs.add(r.gate.source);
  });
  foot.replaceChildren();
  foot.appendChild(el('p', null,
    'Not UAC and not a university. Rules as at ' + CAPTURED_ON + '. Confirm every preference on UAC and the university handbook before you apply. Your subjects stay in the address hash — they are never sent to a server.'));
  const ul = document.createElement('ul');
  [...srcs].slice(0, 12).forEach(u => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = u; a.textContent = u;
    li.appendChild(a);
    ul.appendChild(li);
  });
  if (srcs.size) foot.appendChild(ul);
}

function foldPrepared(main, list, title) {
  const det = document.createElement('details');
  det.className = 'fold';
  const sm = document.createElement('summary');
  sm.appendChild(document.createTextNode(title));
  sm.appendChild(el('span', 'hint', list.length + ' courses'));
  det.appendChild(sm);
  const body = el('div', 'foldbody');
  const unis = [...new Set(list.map(r => r.university))].sort();
  unis.forEach(u => {
    const g = el('div', 'unigroup');
    g.appendChild(el('h3', null, u));
    const cl = el('div', 'clist');
    list.filter(r => r.university === u).forEach(r => {
      const a = document.createElement('a');
      a.href = courseHref(r.courseId);
      a.textContent = r.courseName.replace(/^Bachelor of /, '');
      cl.appendChild(a);
    });
    g.appendChild(cl);
    body.appendChild(g);
  });
  det.appendChild(body);
  const sec = el('section');
  sec.appendChild(det);
  main.appendChild(sec);
}

function render() {
  if (PAGE === 'home') renderHome();
  else if (PAGE === 'results') renderResults();
}

window.addEventListener('hashchange', () => {
  state = decodeState(location.hash);
  render();
});

render();
