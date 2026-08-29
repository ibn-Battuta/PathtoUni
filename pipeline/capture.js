// Stage 1: store the raw artefact.
// PDF tables: a GET is the capture.
// Course pages: render in a headless browser — a GET is an empty shell or a 403.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { USER_AGENT } from './sources.js';
import { renderUrl } from './render.js';
import { discoverCourseLinks, discoverSitemapLocs, isStemUrl, slugFromUrl, pageLooksFailed } from './html-course.js';

export function captureDir(root, sourceId, capturedOn) {
  return path.join(root, sourceId, capturedOn);
}

export function latestCapture(root, sourceId) {
  const dir = path.join(root, sourceId);
  if (!fs.existsSync(dir)) return null;
  const days = fs.readdirSync(dir).filter(d => /^\d{4}-\d{2}-\d{2}/.test(d)).sort();
  if (!days.length) return null;
  return loadCapture(path.join(dir, days[days.length - 1]));
}

export function loadCapture(dir) {
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const textPath = path.join(dir, 'text.txt');
  const bboxPath = path.join(dir, 'bbox.xml');
  const pages = [];
  for (const p of meta.pages ?? []) {
    const base = path.join(dir, 'pages', p.slug);
    const htmlPath = path.join(base, 'source.html');
    const pageText = path.join(base, 'text.txt');
    pages.push({
      url: p.url,
      slug: p.slug,
      html: fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '',
      text: fs.existsSync(pageText) ? fs.readFileSync(pageText, 'utf8') : '',
      failed: Boolean(p.failed)
    });
  }
  return {
    dir,
    meta,
    text: fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : pages.map(p => p.text).join('\n\n'),
    bboxXml: fs.existsSync(bboxPath) ? fs.readFileSync(bboxPath, 'utf8') : null,
    pdfPath: path.join(dir, 'source.pdf'),
    pages
  };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function pdftotext(binArgs) {
  const r = spawnSync('pdftotext', binArgs, { encoding: 'utf8' });
  if (r.error?.code === 'ENOENT') {
    throw new Error('pdftotext not found. Install poppler (e.g. brew install poppler) and re-run capture.');
  }
  if (r.status !== 0) {
    throw new Error(`pdftotext failed: ${r.stderr || r.stdout}`);
  }
  return r;
}

export function extractPdf(pdfPath, dir) {
  const textPath = path.join(dir, 'text.txt');
  const bboxPath = path.join(dir, 'bbox.xml');
  pdftotext(['-layout', pdfPath, textPath]);
  pdftotext(['-bbox', pdfPath, bboxPath]);
  return {
    text: fs.readFileSync(textPath, 'utf8'),
    bboxXml: fs.readFileSync(bboxPath, 'utf8')
  };
}

async function writePage(dir, url, rendered, failed = false) {
  const slug = slugFromUrl(url);
  const base = path.join(dir, 'pages', slug);
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'source.html'), rendered.html ?? '');
  fs.writeFileSync(path.join(base, 'text.txt'), rendered.text ?? '');
  return {
    url,
    slug,
    bytes: (rendered.html ?? '').length,
    failed,
    html: rendered.html ?? '',
    text: rendered.text ?? ''
  };
}

export async function captureHtmlSource(source, {
  root, capturedOn, force = false, renderImpl, delayMs, fetchImpl = fetch
} = {}) {
  const today = capturedOn ?? new Date().toISOString().slice(0, 10);
  const dir = captureDir(root, source.id, today);
  if (!force && fs.existsSync(path.join(dir, 'meta.json'))) {
    return { ...loadCapture(dir), reused: true };
  }
  fs.mkdirSync(dir, { recursive: true });

  const wait = delayMs ?? source.delayMs ?? 1500;
  const budget = source.virtualTimeBudget ?? 12000;
  const urls = [...(source.courses ?? [])];

  if (source.sitemapUrl) {
    const res = await fetchImpl(source.sitemapUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml, text/xml, */*' }
    });
    if (!res.ok) throw new Error(`Sitemap fetch failed ${res.status} for ${source.sitemapUrl}`);
    const xml = await res.text();
    for (const u of discoverSitemapLocs(xml, { linkRe: source.linkRe, excludeRe: source.excludeRe }))
      urls.push(u);
  }

  if (source.listingUrl) {
    const listing = await renderUrl(source.listingUrl, { renderImpl, virtualTimeBudget: budget });
    await writePage(dir, source.listingUrl, listing);
    const found = discoverCourseLinks(listing.html, source.listingUrl, source.linkRe);
    for (const u of found) {
      if (isStemUrl(u) || source.keepNonStem) urls.push(u);
    }
  }

  const unique = [...new Set(urls)];
  const cap = source.maxPages ?? unique.length;
  const chosen = unique.slice(0, cap);
  const pages = [];

  for (let i = 0; i < chosen.length; i++) {
    const url = chosen[i];
    if (i > 0 && wait > 0) await sleep(wait);
    try {
      const rendered = await renderUrl(url, { renderImpl, virtualTimeBudget: budget });
      const failed = pageLooksFailed(rendered.html, rendered.text);
      pages.push(await writePage(dir, url, rendered, failed));
    } catch (err) {
      pages.push(await writePage(dir, url, { html: '', text: String(err.message) }, true));
    }
  }

  const meta = {
    sourceId: source.id,
    kind: source.kind,
    capturedOn: today,
    title: source.title,
    userAgent: USER_AGENT,
    listingUrl: source.listingUrl ?? null,
    pages: pages.map(p => ({ url: p.url, slug: p.slug, bytes: p.bytes, failed: p.failed }))
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const text = pages.map(p => p.text).join('\n\n');
  fs.writeFileSync(path.join(dir, 'text.txt'), text);
  return { dir, meta, text, pages, reused: false };
}

async function capturePdfSource(source, { root, capturedOn, force = false, fetchImpl = fetch } = {}) {
  const today = capturedOn ?? new Date().toISOString().slice(0, 10);
  const dir = captureDir(root, source.id, today);

  if (!force && fs.existsSync(path.join(dir, 'meta.json'))) {
    return { ...loadCapture(dir), reused: true };
  }

  fs.mkdirSync(dir, { recursive: true });
  const pdfPath = path.join(dir, 'source.pdf');

  const res = await fetchImpl(source.url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf' },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Capture failed ${res.status} ${res.statusText} for ${source.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(pdfPath, buf);

  const extracted = extractPdf(pdfPath, dir);
  const meta = {
    sourceId: source.id,
    kind: source.kind ?? 'pdf-table',
    url: source.url,
    capturedOn: today,
    bytes: buf.length,
    title: source.title,
    userAgent: USER_AGENT
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  return { dir, meta, ...extracted, pdfPath, reused: false };
}

export async function captureSource(source, opts = {}) {
  if (source.kind === 'html-courses' || source.kind === 'html') {
    return captureHtmlSource(source, opts);
  }
  return capturePdfSource(source, opts);
}
