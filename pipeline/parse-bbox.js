// Reconstruct a landscape table from pdftotext -bbox XML (word x/y). No PDF library.

const WORD_RE = /<word\s+([^>]*)>([^<]*)<\/word>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;
const PAGE_SPLIT = /<page\b/i;

const COURSE_START = /^(Bachelor|Diploma|Master|Doctor)\b/;

const SKIP_LINE = [
  /^Course Prerequisites, Assumed/,
  /^\(as referenced/,
  /^Note: Assumed/,
  /^subjects or higher/,
  /^Graduate Studies Committee/,
  /^APPROVAL\b/,
  /^Page \d/,
  /^\*/,
  /^ESL:/,
  /^EALD:/
];

const FACULTY_RE = /^(Faculty of|The University of Sydney School|The University of Sydney Business|The University of Sydney Law|Sydney Conservatorium|Extended Bachelor)/;

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(ATTR_RE)) out[m[1]] = m[2];
  return out;
}

export function parseBboxXml(xml) {
  const chunks = xml.split(PAGE_SPLIT);
  const pages = [];
  for (const chunk of chunks.slice(1)) {
    const words = [];
    WORD_RE.lastIndex = 0;
    let m;
    while ((m = WORD_RE.exec(chunk))) {
      const a = attrs(m[1]);
      const t = decode(m[2]).trim();
      if (!t) continue;
      words.push({
        t,
        x0: parseFloat(a.xMin),
        y0: parseFloat(a.yMin),
        y1: parseFloat(a.yMax)
      });
    }
    pages.push({ words });
  }
  return pages;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export function colOf(x, columns) {
  let chosen = columns[0].name;
  for (const c of columns) {
    if (x + 0.5 >= c.x) chosen = c.name;
    else break;
  }
  return chosen;
}

function clusterLines(words, tol = 3.5) {
  const sorted = [...words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows = [];
  for (const w of sorted) {
    if (rows.length && Math.abs(w.y0 - rows[rows.length - 1].y) < tol)
      rows[rows.length - 1].words.push(w);
    else rows.push({ y: w.y0, words: [w] });
  }
  return rows;
}

function join(words) {
  return words.slice().sort((a, b) => a.x0 - b.x0).map(w => w.t).join(' ');
}

/** A wrapped course name is not finished while parens are open or it ends in "and"/"of". */
export function courseNameComplete(name) {
  const t = name.trim();
  if (!t) return false;
  const opens = (t.match(/\(/g) || []).length;
  const closes = (t.match(/\)/g) || []).length;
  if (opens !== closes) return false;
  if (/\b(and|of)$/i.test(t)) return false;
  if (/\band (Bachelor|Master|Doctor)$/i.test(t)) return false;
  return true;
}

/**
 * Build one logical row per course from bbox words + column left-edges.
 */
export function tableRows(pages, columns) {
  let faculty = null;
  const records = [];
  let current = null;

  const flush = () => {
    if (current?.course?.trim()) records.push(current);
    current = null;
  };

  for (let pi = 0; pi < pages.length; pi++) {
    const words = pages[pi].words.map(w => ({ ...w, col: colOf(w.x0, columns) }));
    for (const line of clusterLines(words)) {
      const text = join(line.words);
      if (!text) continue;
      if (SKIP_LINE.some(re => re.test(text))) continue;
      if (/Page \d+\s+of\s+\d+/.test(text)) continue;

      if (FACULTY_RE.test(text) && line.words[0].x0 < 90) {
        faculty = text.replace(/\s+/g, ' ').split(/\s+Course\b/)[0].trim();
        continue;
      }
      if (line.words[0].t === 'Course' && line.words.some(w => /^Prerequisites/.test(w.t)))
        continue;

      const courseWords = line.words.filter(w => w.col === 'course');
      const courseText = join(courseWords);
      const start = Boolean(courseText)
        && COURSE_START.test(courseText)
        && (current === null || courseNameComplete(current.course));

      if (start) {
        flush();
        current = {
          faculty,
          page: pi + 1,
          course: courseText,
          prereq: '',
          assumed: '',
          recommended: '',
          special: '',
          date: ''
        };
      } else if (!current) {
        continue;
      }

      const buckets = {};
      for (const w of line.words) (buckets[w.col] ??= []).push(w);
      for (const col of ['course', 'prereq', 'assumed', 'recommended', 'special', 'date']) {
        const extra = join(buckets[col] ?? []);
        if (!extra) continue;
        if (col === 'course' && start) continue;
        current[col] = current[col] ? `${current[col]} ${extra}` : extra;
      }
    }
  }
  flush();

  for (const r of records) {
    for (const k of ['course', 'prereq', 'assumed', 'recommended', 'special', 'date'])
      r[k] = (r[k] || '').replace(/\s+/g, ' ').trim();
    const dm = r.date.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i);
    r.reviewed = dm ? dm[1] : '';
  }
  return records;
}
