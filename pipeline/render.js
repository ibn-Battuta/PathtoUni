// Headless Chrome dump-dom. Course pages are JS shells; a GET is not a capture.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { USER_AGENT } from './sources.js';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
].filter(Boolean);

export function findChrome() {
  for (const p of CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  for (const bin of ['google-chrome', 'chromium', 'chromium-browser']) {
    const r = spawnSync('which', [bin], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

/** Visible text for section parsing. Quote checks still run on this + the raw HTML. */
export function htmlToText(html) {
  return String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|header)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2013;|&#8211;/gi, '–')
    .replace(/&#x2019;|&#8217;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Render a URL to HTML. `renderImpl` is for tests; live runs spawn Chrome --dump-dom.
 * virtualTimeBudget lets scripts run before the DOM is serialised.
 */
export async function renderUrl(url, {
  renderImpl,
  chromePath,
  virtualTimeBudget = 12000,
  timeoutMs = 35000
} = {}) {
  if (renderImpl) return await renderImpl(url);

  const chrome = chromePath || findChrome();
  if (!chrome) {
    throw new Error(
      'No Chrome/Chromium found for headless capture. Set CHROME_PATH, or install Chrome. A GET of these pages is an empty shell or a 403.'
    );
  }

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--mute-audio',
    `--virtual-time-budget=${virtualTimeBudget}`,
    `--timeout=${timeoutMs}`,
    `--user-agent=${USER_AGENT}`,
    '--dump-dom',
    url
  ];
  const r = spawnSync(chrome, args, {
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
    timeout: timeoutMs + 5000
  });
  if (r.error) throw new Error(`Headless render failed for ${url}: ${r.error.message}`);
  const html = r.stdout || '';
  if (html.length < 500) {
    throw new Error(`Headless render produced too little HTML (${html.length} bytes) for ${url}`);
  }
  return { html, text: htmlToText(html) };
}
