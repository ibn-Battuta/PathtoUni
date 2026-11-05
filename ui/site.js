/*__HASH__*/
/*__EARLY__*/
/*__COMPARE__*/
/*__CLASSIFY__*/
/*__TOPICS__*/
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
  PREPARED: 'ready',
  MINOR_GAP: 'a little to catch up',
  BRIDGE_IT: 'bridging course',
  HARD_GAP: 'a lot to catch up',
  GATED: 'entry rule not met'
};

// 2026-09-23 → 23 Sep 2026. Dates a person reads, not a database.
function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return Number(m[3]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1] + ' ' + m[1];
}
const BAND_CLASS = {
  PREPARED: 's-prep',
  MINOR_GAP: 's-minor',
  BRIDGE_IT: 's-bridge',
  HARD_GAP: 's-hard',
  GATED: 's-gated'
};

let state = decodeState(location.hash);
let stateB = decodeSetB(location.hash);
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
  const next = stateB && isCompleteSelection(stateB) ? encodeCompare(state, stateB) : encodeState(state);
  const want = next ? '#' + next : '';
  if (location.hash !== want) history.replaceState(null, '', (location.pathname + location.search) + want);
}

function resultsHref() {
  const h = encodeState(state);
  return BASE + 'results/' + (h ? '#' + h : '');
}

function subjectsHref() {
  const h = encodeState(state);
  return BASE + 'subjects/' + (h ? '#' + h : '');
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
  // A course no school leaver can start is not a result for anyone (error 18). Held out
  // here, once, so the lists, the counts and the comparison all agree.
  return CATALOGUE.filter(c => !c.notEntryPoint).map(c => {
    const r = readiness(p, c, { gates: GATES, bridging: c._bridging, earlyEntry: EARLY_ENTRY });
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
    wrap.appendChild(el('p', 'hint', 'Pick your year, maths and English, and we’ll start counting your units.'));
    return wrap;
  }
  const pat = validateAtarPattern(profileFrom(state));
  const urow = el('div', 'units');
  const left = el('span');
  left.append('Units: ', el('b', null, String(pat.units)), ' · Subject areas: ', el('b', null, String(pat.areas)));
  const right = el('span', pat.valid ? 'ok' : 'bad');
  right.textContent = pat.valid ? 'Enough for an ATAR' : 'Not enough for an ATAR yet';
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
    prog.textContent = `Step ${step + 1} of ${STEPS.length}`;
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

  const grid = el('div', 'picker-grid');
  grid.appendChild(stepBox('year', 'Which year are you in?', box => {
    const c = el('div', 'chips');
    [11, 12].forEach(y => c.appendChild(chip('Year ' + y, state.year === y, () => { state.year = y; })));
    box.appendChild(c);
  }));

  grid.appendChild(stepBox('maths', 'Which maths?', box => {
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
      box.appendChild(el('p', 'hint', 'Extension 2 is a Year 12 course, so you can’t pick it in Year 11.'));
    }
  }));

  grid.appendChild(stepBox('english', 'Which English?', box => {
    const c = el('div', 'chips');
    ENGLISH.forEach(([k, l]) => c.appendChild(chip(l, state.english[0] === k, () => { state.english = [k]; })));
    box.appendChild(c);
  }));

  grid.appendChild(stepBox('sciences', 'Any sciences?', box => {
    const c = el('div', 'chips');
    subjects.sciences.forEach(s => {
      const label = s.name === 'Earth and Environmental Science' ? 'Earth & env.'
        : s.name === 'Investigating Science' ? 'Investigating' : s.name;
      c.appendChild(chip(label, state.sciences.includes(s.id), () => toggle(state.sciences, s.id)));
    });
    box.appendChild(c);
  }));

  grid.appendChild(stepBox('technology', 'Any technology subjects?', box => {
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

  grid.appendChild(stepBox('other', 'Any other subjects?', box => {
    box.appendChild(el('p', 'hint', 'These don’t change your STEM results. We only count them toward your ATAR.'));
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
  }));
  root.appendChild(grid);
  root.appendChild(unitsPanel());

  if (showCta) {
    const cta = el('div', 'cta-wrap picker-foot');
    const go = el('button', 'btn', 'See my results');
    go.type = 'button';
    go.disabled = !isCompleteSelection(state);
    go.addEventListener('click', () => { writeHash(); location.href = resultsHref(); });
    cta.appendChild(go);
    root.appendChild(cta);
  }

  if (stepped) {
    const nav = el('div', 'step-nav');
    const back = el('button', 'btn ghost', 'Back');
    back.type = 'button';
    back.disabled = step === 0;
    back.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    const next = el('button', 'btn', step === STEPS.length - 1 ? 'See my results' : 'Next');
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
  }
}

function captureDate(course) {
  return course.capturedOn || CAPTURED_ON;
}

/** Display-side whitespace collapse. The stored quote keeps the capture's exact
 * characters so it can be checked against the source; only the rendering is tidied. */
function collapse(s) {
  return String(s).replace(/\s+/g, ' ').trim();
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

  // Why this row sits where it does when results are sorted by interest. A sort that
  // cannot explain itself reads as a recommendation.
  const sortBy = sortingNow();
  if (sortBy.active) {
    const m = matchedTopics(r.course, sortBy.interests, sortBy.industryTopics);
    if (m.length) row.appendChild(el('span', 'tag t-match', 'Matches: ' + m.map(topicLabel).join(', ')));
  }

  // Who may apply at all. A student can hold every assumed subject and still not be able
  // to apply, so this is stated before anything about readiness — and stated in the row,
  // not only on the course page, because the row is what most people read.
  if (r.restrictedTo) {
    row.appendChild(el('p', 'restrict',
      'Only open to ' + r.restrictedTo.who + '. Your subjects don’t change this.'));
    if (r.restrictedTo.quote) row.appendChild(el('p', 'quote', '\u201c' + collapse(r.restrictedTo.quote) + '\u201d'));
  }

  // Labels follow the facts, not the enum: `situational_judgement` is a database value,
  // not something to show a sixteen-year-old.
  (r.hurdles || []).forEach(h => {
    const t = typeof h === 'string'
      ? h.replace(/_/g, ' ')
      : (h.label || String(h.type || h.name || 'extra requirement').replace(/_/g, ' '));
    row.appendChild(el('span', 'tag t-flag', 'Also asks for ' + t));
  });

  if (!r.complete) {
    row.appendChild(el('p', 'why', 'We couldn’t fully read this university’s page, so this result isn’t certain.'));
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
  // "ready now" beside a course the reader cannot apply to is the card contradicting
  // itself — the same defect as promising a bridging course that does not exist. The
  // band is a statement about subjects, so where eligibility is decided elsewhere the
  // label says only what the band actually knows.
  if (r.restrictedTo) return r.bandName === 'PREPARED' ? 'subjects fit' : BAND_LABEL[r.bandName];
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
    // A covered gap already says "runs a bridging course for it (~$cost, timing)" in its own
    // line, from the engine; saying it again here read as two different courses.
    if (!covered.length && gaps.length) {
      row.appendChild(el('p', 'why',
        `This university’s bridging courses cover ${bridging.subjects.join(', ')}, but not ${gaps.join(' or ')}.`));
    }
  }
  const srcs = new Set();
  (r.course?.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
  if (r.gate?.source) srcs.add(r.gate.source);
  if (opts.sources && srcs.size) {
    const p = el('p', 'src');
    const date = captureDate(r.course);
    p.append('Checked ' + niceDate(date) + '. ');
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
  if (state.otherCount) labels.push(state.otherCount + ' other subject' + (state.otherCount > 1 ? 's' : ''));
  return labels;
}

function sortingNow() {
  const interests = state.interests || [];
  const industry = INDUSTRIES.industries.find(x => x.id === state.industry) || null;
  const industryTopics = industry ? industry.topics : [];
  return { interests, industry, industryTopics, active: Boolean(interests.length || industry) };
}

function sortingSentence(sb) {
  const bits = [];
  if (sb.interests.length) bits.push('what you enjoy (' + sb.interests.map(topicLabel).join(', ') + ')');
  if (sb.industry) bits.push('the industry you picked (' + sb.industry.name + ')');
  return bits.join(' and ');
}

function clearSorting() {
  state.interests = [];
  state.industry = null;
  afterChange();
}

function pageHref(slug) {
  const h = encodeState(state);
  return BASE + slug + (h ? '#' + h : '');
}

function renderHome() {
  // Links made before the picker had its own page carried the subjects on the home address.
  if (location.hash.length > 1) { location.replace(BASE + 'subjects/' + location.hash); return; }
  // The doors carry whatever the student has already told us, so the three ways in
  // combine instead of starting over.
  document.querySelectorAll('[data-door="subjects"]').forEach(a => { a.href = pageHref('subjects/'); });
  document.querySelectorAll('[data-door="quiz"]').forEach(a => { a.href = pageHref('quiz/'); });
  document.querySelectorAll('[data-door="industries"]').forEach(a => { a.href = pageHref('industries/'); });
}

function renderSubjects() {
  const now = document.getElementById('doors-now');
  if (now) {
    const sb = sortingNow();
    now.hidden = !sb.active;
    now.replaceChildren();
    if (sb.active) {
      now.append('Your results will be sorted by ' + sortingSentence(sb) + '. Add your subjects below. ');
      const c = el('button', 'btn ghost', 'Clear');
      c.type = 'button';
      c.addEventListener('click', clearSorting);
      now.appendChild(c);
    }
  }
  const picker = document.getElementById('picker');
  picker.dataset.mode = 'steps';
  renderPicker(picker, { showCta: true, stepped: true });
}

let quizAnswers = Array(QUIZ.length).fill(null);

function degreeList(list) {
  const ul = el('ul', 'deglist');
  list.forEach(c => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = courseHref(c.id);
    a.textContent = c.name;
    li.appendChild(a);
    li.appendChild(el('span', 'uni-s', ' ' + c.university));
    if (c.restrictedTo) li.appendChild(el('span', 'tag t-restrict', 'open to some students only'));
    ul.appendChild(li);
  });
  return ul;
}

function renderQuiz() {
  const main = document.getElementById('quiz');
  if (!main) return;
  main.querySelectorAll('.quiz-static').forEach(n => n.remove());
  let box = document.getElementById('quiz-live');
  if (!box) { box = el('div', 'quiz-live'); box.id = 'quiz-live'; main.appendChild(box); }
  box.replaceChildren();

  const answered = quizAnswers.filter(a => a !== null).length;
  box.appendChild(el('p', 'quiz-progress', answered + ' of ' + QUIZ.length + ' answered'));
  const list = el('ol', 'quiz-list');
  QUIZ.forEach((pair, i) => {
    const li = el('li', 'quiz-q');
    const row = el('div', 'quiz-pair');
    pair.forEach((opt, k) => {
      const b = el('button', 'quiz-opt', opt.text);
      b.type = 'button';
      b.setAttribute('aria-pressed', quizAnswers[i] === k ? 'true' : 'false');
      b.addEventListener('click', () => {
        quizAnswers[i] = quizAnswers[i] === k ? null : k;
        renderQuiz();
      });
      row.appendChild(b);
      if (k === 0) row.appendChild(el('span', 'quiz-or', 'or'));
    });
    li.appendChild(row);
    list.appendChild(li);
  });
  box.appendChild(list);

  const top = scoreQuiz(quizAnswers);
  const res = el('section', 'quiz-result');
  if (answered < 3 || !top.length) {
    res.appendChild(el('p', 'hint', 'Answer at least three to see your top areas.'));
    box.appendChild(res);
    return;
  }
  res.appendChild(el('h2', null, 'Your top areas'));
  const chips = el('div', 'chips');
  top.forEach(t => chips.appendChild(el('span', 'chip on', topicLabel(t))));
  res.appendChild(chips);
  res.appendChild(el('p', 'hint', 'Based on a simple count of your picks. It’s a place to start looking, not a label for you.'));

  const use = el('button', 'btn', isCompleteSelection(state) ? 'Sort my results by these' : 'Use these, then add my subjects');
  use.type = 'button';
  use.addEventListener('click', () => {
    state.interests = top;
    location.href = isCompleteSelection(state) ? resultsHref() : subjectsHref();
  });
  res.appendChild(use);

  const { specific, broad } = coursesForTopics(top, CATALOGUE);
  const ranked = sortByInterest(specific.map(c => ({ course: c })), top, []).map(x => x.course);
  res.appendChild(el('h3', null, 'Courses that match these areas (' + ranked.length + ')'));
  res.appendChild(el('p', 'hint', 'Our best guess from each course name. Add your subjects to see which ones you’re ready for.'));
  res.appendChild(degreeList(ranked));
  if (broad.length) {
    const det = document.createElement('details');
    det.className = 'fold';
    const sm = document.createElement('summary');
    sm.append('Broad degrees that can lead here ');
    sm.appendChild(el('span', 'hint', broad.length + ' courses'));
    det.appendChild(sm);
    det.appendChild(el('p', 'hint', 'In these you pick a major later. Check the handbook has one in your area.'));
    det.appendChild(degreeList(broad));
    res.appendChild(det);
  }
  box.appendChild(res);
}

function renderIndustries() {
  // The page is complete without JavaScript. This only carries the student's subjects
  // and interests into the "sort my results" links.
  document.querySelectorAll('a[data-industry]').forEach(a => {
    const next = { ...state, industry: a.dataset.industry };
    const h = encodeState(next);
    a.href = BASE + (isCompleteSelection(state) ? 'results/' : 'subjects/') + (h ? '#' + h : '');
    if (!isCompleteSelection(state)) a.textContent = 'Use this, then add my subjects';
  });
  document.querySelectorAll('.industries a[href^="../course/"]').forEach(a => {
    const h = encodeState(state);
    a.href = a.getAttribute('href').split('#')[0] + (h ? '#' + h : '');
  });
}

function renderResults() {
  const main = document.getElementById('results');
  if (!isCompleteSelection(state)) {
    main.replaceChildren();
    main.appendChild(el('p', 'lede', 'Pick your subjects first, and your results will show here.'));
    const go = el('a', 'btn');
    go.href = subjectsHref();
    go.textContent = 'Pick my subjects';
    go.style.display = 'inline-block';
    go.style.textDecoration = 'none';
    main.appendChild(go);
    return;
  }

  if (stateB && isCompleteSelection(stateB)) {
    renderCompare(main);
    return;
  }

  const p = profileFrom(state);
  const results = runCatalogue(p);
  const order = ['PREPARED', 'MINOR_GAP', 'BRIDGE_IT', 'HARD_GAP', 'GATED'];
  // A course a student cannot apply to is not something they are "ready for", whatever
  // their subjects say, so it is held out of both the gap list and the ready list and
  // counted on its own. Left in the ready list it appeared as a bare link under
  // "Everything else you are ready for", which is a door that is not actually open.
  const focused = applyClassifier(results, { field: state.filterField, university: state.filterUni });
  const restrictedAll = results.filter(r => r.restrictedTo);
  const restricted = applyClassifier(restrictedAll, { field: state.filterField, university: state.filterUni });
  // Interest and industry only reorder. Every list below keeps every course it had.
  const sb = sortingNow();
  const open = sortByInterest(focused.filter(r => !r.restrictedTo), sb.interests, sb.industryTopics);
  const attention = open.filter(r => r.bandName !== 'PREPARED' || !r.complete);
  const prepared = open.filter(r => r.bandName === 'PREPARED' && r.complete);
  const byBand = Object.fromEntries(order.map(b => [b, open.filter(r => r.bandName === b)]));
  const scoped = Boolean(state.filterField || state.filterUni);

  main.replaceChildren();

  const strip = el('div', 'strip');
  const inner = el('div', 'strip-inner');
  subjectChips().forEach(l => {
    const c = el('span', 'chip');
    c.textContent = l;
    inner.appendChild(c);
  });
  const edit = el('button', 'btn ghost', 'Change subjects');
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
      copy.textContent = 'Copy the link from the address bar';
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
    bd.appendChild(el('label', 'q', 'Your expected maths band'));
    bd.appendChild(el('p', 'hint', 'Some courses on your list need a certain maths mark, not just the subject. It’s the only kind of rule in NSW that can turn you away. Skip this if you don’t know yet.'));
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
    'Good news first: most of these courses are open to you. NSW universities mostly list assumed knowledge rather than strict prerequisites, so your subjects rarely stop you getting in. What matters is the shorter list below that needs some catching up, and why.'));

  // Print-only: rows drop their individual source lines to fit one page, so collect the
  // distinct sources once. An artefact a family takes away must stay checkable.
  const printSrc = el('div', 'printsources');
  {
    const unis = new Map();
    results.forEach(r => {
      (r.course?.assumedKnowledge || []).forEach(ak => {
        if (ak.source) unis.set(r.university, ak.source);
      });
      if (r.gate?.source) unis.set(r.university, r.gate.source);
    });
    const bits = [...unis.entries()].map(([u, src]) => u + ' — ' + src.replace(/^https?:\/\//, '').split('/')[0]);
    printSrc.textContent = 'Rules read on ' + niceDate(CAPTURED_ON) + ' from: ' + bits.join(' \u00b7 ') +
      '. Every course has its own page on this site with the university\u2019s exact words and a link.';
  }
  main.appendChild(printSrc);

  const sum = el('div', 'summary');
  order.forEach(b => {
    const n = byBand[b].length;
    if (!n) return;
    const s = el('div', 'stat ' + BAND_CLASS[b]);
    s.appendChild(el('span', 'n', String(n)));
    s.appendChild(el('span', 'l', BAND_LABEL[b]));
    sum.appendChild(s);
  });
  if (restricted.length) {
    const s = el('div', 'stat b-restrict');
    s.appendChild(el('span', 'n', String(restricted.length)));
    s.appendChild(el('span', 'l', 'Open to some students only'));
    sum.appendChild(s);
  }
  main.appendChild(sum);
  main.appendChild(renderClassifier(results, focused));

  if (sb.active) {
    const secI = el('section'); secI.dataset.sec = 'interests';
    const hI = el('div', 'sh');
    hI.appendChild(el('h2', null, 'Best matches for your interests'));
    secI.appendChild(hI);
    const lead = el('p', 'lede');
    lead.append('Sorted by ' + sortingSentence(sb) + '. This only changes the order. Every course is still here, and no result has changed. ');
    const change = el('a', null, 'Change');
    change.href = pageHref(sb.industry && !sb.interests.length ? 'industries/' : 'quiz/');
    lead.appendChild(change);
    lead.append(' · ');
    const clr = el('a', null, 'Clear');
    clr.href = '#';
    clr.addEventListener('click', e => { e.preventDefault(); clearSorting(); });
    lead.appendChild(clr);
    secI.appendChild(lead);
    const close = open.filter(r => interestScore(r.course, sb.interests, sb.industryTopics) > 0);
    if (close.length) {
      const rows = el('div', 'rows');
      close.slice(0, 12).forEach(r => rows.appendChild(courseCard(r, { sources: true })));
      secI.appendChild(rows);
      if (close.length > 12) secI.appendChild(el('p', 'hint', (close.length - 12) + ' more match. They’re at the top of each list below.'));
    } else {
      secI.appendChild(el('p', 'lede', 'No course names here match. Broad degrees like Science or Engineering can still lead there, because you pick a major later.'));
    }
    main.appendChild(secI);
  }

  const sec1 = el('section'); sec1.dataset.sec = 'attention';
  const h1 = el('div', 'sh');
  h1.appendChild(el('h2', null, attention.length ? 'Courses that need some catching up' : 'Nothing to catch up on'));
  h1.appendChild(el('span', 'count', attention.length ? attention.length + ' of ' + results.length : results.length + ' courses, no gaps'));
  sec1.appendChild(h1);
  if (attention.length) {
    const missing = {};
    attention.forEach(r => r.findings.forEach(f => { missing[f.subject] = (missing[f.subject] || 0) + 1; }));
    const parts = Object.entries(missing).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} (${n})`);
    if (parts.length) {
      const l = el('p', 'lede');
      l.textContent = 'What’s missing, and how many courses it affects: ' + parts.join(', ') + '.';
      sec1.appendChild(l);
    }
    const rows = el('div', 'rows');
    attention.forEach(r => rows.appendChild(courseCard(r, { sources: true })));

    // On paper the causes are the payload and the instances are the evidence for them.
    // A profile with 98 gaps printed four pages of course names that all said the same
    // two things; the printed sheet caps the list and says where the rest is, rather
    // than shrinking the type until a careers adviser cannot read it.
    const PRINT_ROW_CAP = 24;
    rows.dataset.many = attention.length > PRINT_ROW_CAP ? '1' : '0';
    if (attention.length > PRINT_ROW_CAP) {
      const byUni = {};
      attention.forEach(r => { byUni[r.university] = (byUni[r.university] || 0) + 1; });
      const more = el('p', 'printmore');
      more.textContent = attention.length + ' courses need some catching up: '
        + Object.entries(byUni).sort((a, b) => b[1] - a[1]).map(([u, n]) => u + ' ' + n).join(', ')
        + '. Every one, with the university\u2019s own words, is on the site at this page\u2019s link.';
      sec1.appendChild(more);
    }
    sec1.appendChild(rows);
  } else {
    sec1.appendChild(el('p', 'lede', 'Your subjects cover the assumed knowledge for every course we could fully check.'));
  }
  main.appendChild(sec1);

  if (restricted.length) {
    const secR = el('section'); secR.dataset.sec = 'restricted';
    const hR = el('div', 'sh');
    hR.appendChild(el('h2', null, 'Open to some students only'));
    hR.appendChild(el('span', 'count', restricted.length + ' of ' + results.length));
    secR.appendChild(hR);
    secR.appendChild(el('p', 'lede',
      'These are real courses, fully open to the students they’re for. They’re listed separately because who can apply depends on something other than your subjects.'));
    const rowsR = el('div', 'rows');
    restricted.forEach(r => rowsR.appendChild(courseCard(r, { sources: true })));
    secR.appendChild(rowsR);
    main.appendChild(secR);
  }

  const schemes = displayableSchemes(EARLY_ENTRY);
  if (schemes.length) {
    const secE = el('section');
    secE.id = 'early-entry';
    secE.dataset.sec = 'early';
    const hE = el('div', 'sh');
    const nEarly = new Set(schemes.map(s => s.university)).size;
    hE.appendChild(el('h2', null, (['One', 'Two', 'Three', 'Four', 'Five', 'Six'][nEarly - 1] || nEarly) + ' of these universities may offer you a place before your ATAR comes out'));
    secE.appendChild(hE);
    secE.appendChild(el('p', 'lede',
      'These are whole-university schemes, not rules for one course. We don’t predict who gets an offer.'));
    const datesP = el('p', 'lede dates-link');
    const datesA = document.createElement('a');
    datesA.href = BASE + 'dates/';
    datesA.id = 'early-dates-link';
    datesA.textContent = 'When to apply: every early-offer date, for starting uni in 2027 or 2028';
    datesP.appendChild(datesA);
    secE.appendChild(datesP);
    schemes.forEach(s => {
      const card = el('article', 'early');
      card.appendChild(el('h3', null, s.university + ' — ' + s.name));
      const reads = usesEnglish(s.uses);
      card.appendChild(el('p', 'why', 'Looks at: ' + reads.join(', ') + '.'));
      card.appendChild(el('p', 'quote', '\u201c' + s.quote + '\u201d'));
      if (s.kind === 'subject_bands') card.appendChild(el('p', 'why', TRUE_REWARD_CAVEAT));
      const stale = staleNote(s, EARLY_ENTRY);
      const meta = el('p', 'src');
      const date = s.capturedOn || EARLY_ENTRY.capturedOn;
      meta.append('Checked ' + niceDate(date) + '. ');
      if (stale) meta.append(stale + '. ');
      if (s.source) {
        const a = document.createElement('a');
        a.href = s.source; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Source';
        meta.appendChild(a);
      }
      card.appendChild(meta);
      secE.appendChild(card);
    });
    main.appendChild(secE);
  }

  const candidates = [
    ...state.sciences.map(s => ({ kind: 'sciences', id: s, label: subjects.sciences.find(x => x.id === s).name })),
    ...state.technology.map(t => ({ kind: 'technology', id: t, label: subjects.technology.find(x => x.id === t).name }))
  ];
  if (state.otherCount > 0) candidates.push({ kind: 'other', id: null, label: 'One other subject' });
  if (candidates.length) {
    const sec2 = el('section'); sec2.dataset.sec = 'drops';
    const h2 = el('div', 'sh');
    h2.appendChild(el('h2', null, 'What if you dropped a subject?'));
    sec2.appendChild(h2);
    sec2.appendChild(el('p', 'lede', 'We re-checked all ' + results.length + ' courses without each of your subjects, one at a time. It’s the big question in Year 11.'));
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
      delta.textContent = worse ? worse + (worse === 1 ? ' course gets' : ' courses get') + ' harder' : 'nothing changes';
      d.appendChild(delta);
      if (!altPat.valid) {
        const w = el('span', 'delta cost');
        w.textContent = '· not enough for an ATAR';
        d.appendChild(w);
      }
      wrap.appendChild(d);
    });
    sec2.appendChild(wrap);
    main.appendChild(sec2);
  }

  if (scoped) {
    const unfamiliar = prepared.filter(r => r.course.offerCount === 1);
    if (unfamiliar.length) {
      const sec3 = el('section'); sec3.dataset.sec = 'unfamiliar';
      const h3 = el('div', 'sh');
      h3.appendChild(el('h2', null, 'Courses you may not have heard of'));
      h3.appendChild(el('span', 'count', unfamiliar.length + ' of ' + prepared.length + ' you’re ready for'));
      sec3.appendChild(h3);
      sec3.appendChild(el('p', 'lede',
        'Only one of the six universities here offers a course with this name. That’s all it means — it says nothing about class size or how hard the course is.'));
      const rows = el('div', 'rows');
      unfamiliar.slice(0, 24).forEach(r => rows.appendChild(courseCard(r)));
      sec3.appendChild(rows);
      main.appendChild(sec3);
    }
    const rest = prepared.filter(r => r.course.offerCount !== 1);
    if (rest.length) foldPrepared(main, rest, 'Everything else you’re ready for here');
  } else if (prepared.length) {
    const secP = el('section');
    secP.dataset.sec = 'browse';
    const hP = el('div', 'sh');
    hP.appendChild(el('h2', null, 'Courses you’re ready for'));
    hP.appendChild(el('span', 'count', prepared.length + ' courses'));
    secP.appendChild(hP);
    secP.appendChild(el('p', 'lede',
      'Your subjects already fit most STEM courses in NSW. Rather than one very long list, pick Engineering, Computing, Science or Health above to see them.'));
    main.appendChild(secP);
  }

  const foot = document.getElementById('foot');
  const srcs = new Set();
  results.forEach(r => {
    (r.course.assumedKnowledge || []).forEach(ak => { if (ak.source) srcs.add(ak.source); });
    if (r.gate?.source) srcs.add(r.gate.source);
  });
  foot.replaceChildren();
  foot.appendChild(el('p', null,
    'We’re independent — not UAC or a university. Course rules from ' + niceDate(CAPTURED_ON) + (RECHECKED_ON && RECHECKED_ON > CAPTURED_ON ? ', re-checked ' + niceDate(RECHECKED_ON) : '') + '. Always check UAC and the university’s website before you apply. Your subjects stay in this page’s link and are never sent to us.'));
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

function renderClassifier(allResults, focused) {
  const wrap = el('section');
  wrap.dataset.sec = 'classify';
  wrap.className = 'classify';
  const h = el('div', 'sh');
  h.appendChild(el('h2', null, 'Narrow it down'));
  wrap.appendChild(h);
  wrap.appendChild(el('p', 'lede',
    'Pick an area or a university to see fewer courses. It only changes what’s shown here.'));
  if (state.filterField || state.filterUni) {
    const bits = [];
    const fl = FIELDS.find(x => x.id === state.filterField);
    if (fl) bits.push(fl.label);
    const ulab = UNI_FILTER.find(x => x.id === state.filterUni);
    if (ulab) bits.push(ulab.label);
    wrap.appendChild(el('p', 'lede',
      'Showing ' + focused.length + ' of ' + allResults.length + ' courses — ' + bits.join(' at ') + '.'));
  }
  const areas = el('div', 'classify-grid');
  const fc = fieldCounts(allResults.filter(r => !r.restrictedTo));
  FIELDS.forEach(f => {
    const on = state.filterField === f.id;
    const b = chip(f.label + ' (' + (fc[f.id] || 0) + ')', on, () => {
      state.filterField = on ? null : f.id;
    });
    b.classList.add('classify-chip');
    areas.appendChild(b);
  });
  wrap.appendChild(areas);
  const unis = el('div', 'chips classify-unis');
  const uc = uniCounts(applyClassifier(allResults.filter(r => !r.restrictedTo), { field: state.filterField }));
  UNI_FILTER.forEach(u => {
    const on = state.filterUni === u.id;
    const n = uc[u.id] || 0;
    unis.appendChild(chip(u.label + ' (' + n + ')', on, () => {
      state.filterUni = on ? null : u.id;
    }));
  });
  wrap.appendChild(unis);
  return wrap;
}

function setLead(main, text) {
  const p = el('p', 'compare-lead');
  p.textContent = text;
  main.appendChild(p);
}

function diffCard(pair, which) {
  const r = which === 'a' ? pair.a : pair.b;
  const row = courseCard(r, { sources: true });
  return row;
}

function renderCompare(main) {
  main.replaceChildren();
  const patA = validateAtarPattern(profileFrom(state));
  const patB = validateAtarPattern(profileFrom(stateB));
  if (!patA.valid || !patB.valid) {
    setLead(main, 'We can compare these two subject sets once both are enough for an ATAR.');
    if (!patA.valid) main.appendChild(el('p', 'lede', 'Set A: ' + patA.violations[0]));
    if (!patB.valid) main.appendChild(el('p', 'lede', 'Set B: ' + patB.violations[0]));
    return;
  }
  const left = runCatalogue(profileFrom(state));
  const right = runCatalogue(profileFrom(stateB));
  const cmp = compareResults(left, right);
  setLead(main, cmp.same.length + ' of ' + cmp.total + ' courses are the same either way.');
  const nDiff = cmp.aOpens.length + cmp.bOpens.length;
  if (!nDiff) {
    main.appendChild(el('p', 'lede', 'No difference: both sets lead to the same courses.'));
    return;
  }
  main.appendChild(el('p', 'lede', 'Here are the other ' + nDiff + '. Neither set is “better” — it depends on what you want to study.'));
  if (cmp.aOpens.length) {
    const sec = el('section');
    sec.appendChild(el('h2', null, 'Set A prepares you better for'));
    const rows = el('div', 'rows');
    cmp.aOpens.forEach(p => rows.appendChild(diffCard(p, 'b')));
    sec.appendChild(rows);
    main.appendChild(sec);
  }
  if (cmp.bOpens.length) {
    const sec = el('section');
    sec.appendChild(el('h2', null, 'Set B prepares you better for'));
    const rows = el('div', 'rows');
    cmp.bOpens.forEach(p => rows.appendChild(diffCard(p, 'a')));
    sec.appendChild(rows);
    main.appendChild(sec);
  }
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
  else if (PAGE === 'subjects') renderSubjects();
  else if (PAGE === 'results') renderResults();
  else if (PAGE === 'quiz') renderQuiz();
  else if (PAGE === 'industries') renderIndustries();
}

window.addEventListener('hashchange', () => {
  state = decodeState(location.hash);
  stateB = decodeSetB(location.hash);
  render();
});

render();
