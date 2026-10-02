// The printed sheet is the artefact a family carries into a careers meeting, and it is the
// one part of this site that no unit test can vouch for: §5.8 was reviewed and approved as
// CSS, and printed six pages the first time anyone rendered it. So this check renders a real
// PDF and counts real pages.
//
// It needs a browser. Where none is available it skips loudly rather than passing quietly —
// a print check that silently passes because it never ran is worse than no check at all.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', 'playwright-core', '/opt/node-tools/node_modules/playwright/index.js']) {
  try { chromium = require_(p).chromium; break; } catch { /* keep looking */ }
}

const DIST = 'dist/results/index.html';
const MAX_PAGES = 2;

// Five real subject sets, chosen to span the range: almost no gaps to almost all gaps.
const PROFILES = {
  'ext2, physics and chemistry': '#y=12&m=ext12&e=adv&s=phy,chem&o=1',
  'standard 2 maths, no science': '#y=11&m=std2&e=std&o=3',
  'standard 1 maths, EAL/D, no science': '#y=11&m=std1&e=eald&o=4',
  'advanced maths, biology only': '#y=12&m=adv&e=adv&s=bio&o=2',
  'ext1, all five sciences': '#y=12&m=ext1&e=adv&s=phy,chem,bio,earth,invsci',
  'compare ext2 vs standard 2': '#y=12&m=ext12&e=adv&s=phy,chem&o=1&by=12&bm=std2&be=adv&bs=bio&bo=2'
};

function pdfPageCount(buf) {
  const m = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}

test('the printed sheet never runs past two pages of A4', {
  skip: !chromium ? 'no browser available — run this check where playwright is installed'
    : !fs.existsSync(DIST) ? 'dist/ not built — run npm run build:site first' : false,
  timeout: 120000
}, async () => {
  const url = 'file://' + path.resolve(DIST);
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const [name, hash] of Object.entries(PROFILES)) {
      const page = await browser.newPage();
      await page.goto(url + hash, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      const n = pdfPageCount(pdf);

      // The cause line is the payload and must survive every collapse. Without it the
      // sheet says which courses have gaps but never says what the gaps are.
      const hasCauses = await page.evaluate(() =>
        /Every gap on your list comes down to/.test(document.body.innerText)
        || /no gaps/.test(document.body.innerText));
      await page.close();
      out.push([name, n, hasCauses]);
      assert.ok(n >= 1 && n <= MAX_PAGES, `${name}: printed ${n} pages, limit is ${MAX_PAGES}`);
      assert.ok(hasCauses, `${name}: the gap causes did not survive to the printed sheet`);
    }
  } finally {
    await browser.close();
  }
  for (const [name, n] of out) console.log(`  ${n} page(s)  ${name}`);
});
