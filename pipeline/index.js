#!/usr/bin/env node
// Refresh pipeline. Models may extract; this process verifies, diffs, and never
// silently overwrites a verified catalogue row with an unverified one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, HTML_SOURCES } from './sources.js';
import { captureSource, latestCapture } from './capture.js';
import { extractUsydTable } from './usyd-table.js';
import { extractHtmlCourses } from './html-course.js';
import { diffExtract, mergeCatalogue } from './diff.js';
import { checkDiffs } from './check.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURES = path.join(ROOT, 'captures');
const COURSES = path.join(ROOT, 'data', 'courses');

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const rest = args.filter(a => !a.startsWith('--') && a !== 'help');
  let sourceIds = rest;
  if (flags.has('--html') || rest[0] === 'html') {
    sourceIds = HTML_SOURCES.map(s => s.id);
  }
  if (sourceIds.length === 0) sourceIds = ['usyd-table'];
  return {
    sourceIds,
    apply: flags.has('--apply'),
    offline: flags.has('--offline'),
    forceCapture: flags.has('--force-capture'),
    json: flags.has('--json'),
    help: flags.has('--help') || args.includes('help')
  };
}

function help() {
  return `Usage: node pipeline/index.js [source...] [flags]

Sources
  usyd-table     University of Sydney Academic Board PDF table
  unsw-courses   UNSW STEM course pages (sitemap index + headless Chrome)
  uts-courses    UTS STEM course pages (headless Chrome)
  mq-courses     Macquarie STEM course pages (headless Chrome; GET is 403)
  wsu-courses    Western Sydney STEM course pages (headless Chrome)
  uow-courses    Wollongong STEM course pages (headless Chrome)
  html           All HTML universities (UNSW, UTS, Macquarie, WSU, UOW)

  --html         Same as source "html"
  --offline      Reuse the latest capture; do not fetch or render
  --force-capture
                 Fetch/render even if today's capture exists
  --apply        Append NEW verified STEM courses. Never overwrites a verified row.
  --json         Print the report as JSON
  --help         This text

HTML course pages are JS-rendered. Capture uses Chrome --dump-dom, not GET.
Captures land in captures/ (gitignored). Catalogue writes only happen with --apply.
`;
}

function loadUni(source) {
  const p = path.join(COURSES, source.universityFile);
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function printReport(report) {
  const { extract, diff, checks, merge } = report;
  const lines = [];
  lines.push(`${extract.source.title}`);
  lines.push(`source: ${extract.source.url ?? extract.source.listingUrl ?? extract.source.id}`);
  lines.push(`capturedOn: ${extract.capturedOn}${extract.approved ? `  approved: ${extract.approved}` : ''}`);
  lines.push(`rows: ${extract.rows}   STEM: ${extract.stemRows}   verified: ${extract.verified}   unverified: ${extract.unverified}`);
  lines.push('');
  lines.push(`diff vs ${path.basename(report.cataloguePath)}`);
  lines.push(`  unchanged ${diff.unchanged.length}`);
  lines.push(`  changed   ${diff.changed.length}${diff.stops ? '  ← pipeline stops (flag only; verified rows are not overwritten)' : ''}`);
  lines.push(`  new       ${diff.added.length}`);
  lines.push(`  missing   ${diff.missing.length}  (in catalogue, not in table)`);
  if (diff.changed.length) {
    lines.push('');
    lines.push('Changed (flagged):');
    for (const ch of diff.changed) {
      const chk = checks.find(c => c.id === ch.id);
      lines.push(`  ${ch.id}  extract=${ch.verification}  second-check=${chk?.status ?? '?'}`);
      for (const c of ch.changes)
        lines.push(`    ${c.field}: [${c.from.join(', ')}] → [${c.to.join(', ')}]`);
    }
  }
  if (diff.missing.length) {
    lines.push('');
    lines.push('Catalogue-only:');
    for (const m of diff.missing) lines.push(`  ${m.id}  ${m.name}`);
  }
  if (diff.added.length) {
    lines.push('');
    lines.push(`New STEM rows (${diff.added.filter(a => a.verification === 'verified').length} verified):`);
    for (const a of diff.added.slice(0, 12))
      lines.push(`  ${a.verification === 'verified' ? '✓' : '?'} ${a.id}`);
    if (diff.added.length > 12) lines.push(`  … ${diff.added.length - 12} more`);
  }
  lines.push('');
  if (merge.wrote) {
    lines.push(`Applied: appended ${merge.appended.length} verified courses, repaired ${merge.repaired?.length ?? 0} incomplete rows.`);
  } else if (report.apply) {
    lines.push(`Apply ran: appended ${merge.appended.length}, repaired ${merge.repaired?.length ?? 0}. Existing verified rows kept (${merge.keptVerified.length}).`);
  } else {
    lines.push('No catalogue write. Pass --apply to append new verified STEM courses or repair incomplete rows.');
  }
  return lines.join('\n');
}

function extractFromCapture(source, capture, capturedOn) {
  const on = capture.meta?.capturedOn ?? capturedOn;
  if (source.kind === 'html-courses' || source.kind === 'html') {
    return extractHtmlCourses({ pages: capture.pages, source, capturedOn: on });
  }
  return extractUsydTable({
    bboxXml: capture.bboxXml,
    text: capture.text,
    source,
    capturedOn: on
  });
}

export async function run(opts) {
  const sourceId = opts.sourceId ?? opts.sourceIds?.[0];
  const source = SOURCES[sourceId];
  if (!source) throw new Error(`Unknown source: ${sourceId}. Known: ${Object.keys(SOURCES).join(', ')}`);

  const capturedOn = new Date().toISOString().slice(0, 10);
  let capture;
  if (opts.offline) {
    capture = latestCapture(CAPTURES, source.id);
    const hasPdf = Boolean(capture?.bboxXml && capture?.text);
    const hasHtml = Boolean(capture?.pages?.length);
    if (!hasPdf && !hasHtml)
      throw new Error(`No capture under captures/${source.id}/ — run without --offline first.`);
  } else {
    capture = await captureSource(source, {
      root: CAPTURES,
      capturedOn,
      force: opts.forceCapture,
      renderImpl: opts.renderImpl,
      delayMs: opts.delayMs
    });
  }

  const extract = extractFromCapture(source, capture, capturedOn);
  const uni = loadUni(source);
  const diff = diffExtract(extract, uni.data.courses ?? []);
  const checks = checkDiffs(diff, capture.text, capture.pages ?? []);
  for (const ch of diff.changed) {
    const chk = checks.find(c => c.id === ch.id);
    if (chk?.status === 'conflict') {
      ch.verification = 'conflict';
      if (ch.extracted) ch.extracted.verification = 'conflict';
    }
  }

  const merged = mergeCatalogue(uni.data, extract, diff, { apply: opts.apply });
  if (merged.wrote) {
    const next = { ...uni.data, courses: merged.courses };
    fs.writeFileSync(uni.path, JSON.stringify(next, null, 2) + '\n');
  }

  return {
    extract,
    diff,
    checks,
    merge: merged,
    apply: opts.apply,
    cataloguePath: uni.path,
    captureDir: capture.dir
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    process.stdout.write(help());
    return;
  }
  let stopped = false;
  for (const sourceId of opts.sourceIds) {
    const report = await run({ ...opts, sourceId });
    if (opts.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else process.stdout.write(printReport(report) + '\n\n');
    if (report.diff.stops) stopped = true;
  }
  if (stopped) process.exitCode = 2;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
