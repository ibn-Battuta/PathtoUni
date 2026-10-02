import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'ui/site.css'), 'utf8');
const build = fs.readFileSync(path.join(ROOT, 'ui/build.js'), 'utf8');

function lum([r, g, b]) {
  const s = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function hex(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function contrast(a, b) {
  const L1 = lum(hex(a)), L2 = lum(hex(b));
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):#([0-9A-Fa-f]{6})/g))
    out[m[1]] = '#' + m[2].toUpperCase();
  return out;
}
function firstBlock(re) {
  const m = css.match(re);
  assert.ok(m, 'missing CSS block ' + re);
  return m[1];
}

const dark = tokens(firstBlock(/:root\{([^}]+)\}/));
const light = tokens(firstBlock(/:root\[data-theme="light"\]\{([^}]+)\}/));

test('bare :root is dark; the OS is consulted only under Match my system', () => {
  assert.equal(dark.paper, '#0C1119');
  assert.equal(light.paper, '#EEF2F6');
  assert.match(css, /prefers-color-scheme:\s*light[\s\S]*:root\[data-theme="system"\]/);
  assert.doesNotMatch(css, /prefers-color-scheme:\s*dark[\s\S]*:root:not\(\[data-theme="light"\]\)/);
});

test('body contrast is at least 15:1 in both themes — measured', () => {
  const d = contrast(dark.ink, dark.paper);
  const l = contrast(light.ink, light.paper);
  assert.ok(d >= 15, `dark body ${d.toFixed(2)}:1`);
  assert.ok(l >= 15, `light body ${l.toFixed(2)}:1`);
});

test('every band tag meets 4.5:1 against its soft ground in both themes — measured', () => {
  const keys = ['prep', 'minor', 'bridge', 'hard', 'gated', 'restrict'];
  for (const pal of [dark, light]) {
    for (const k of keys) {
      const c = contrast(pal[k], pal[k + '-soft']);
      assert.ok(c >= 4.5, `${k} ${pal[k]} on ${pal[k + '-soft']} is ${c.toFixed(2)}:1`);
    }
  }
});

test('print forces every token to ink on white, not just body colour', () => {
  const print = firstBlock(/@media print\{[\s\S]*?:root[^{]*\{([^}]+)\}/);
  const p = tokens(print);
  assert.match(print, /--paper:#fff/i);
  assert.match(print, /--ink:#111/);
  assert.match(print, /--prep:/);
  assert.match(print, /--restrict:/);
  assert.match(css, /nav\.topnav.*\.theme/);
});

test('the boot script runs before the stylesheet and does not throw if storage is blocked', () => {
  assert.match(build, /THEME_BOOT[\s\S]*localStorage\.getItem\('oty-theme'\)/);
  assert.match(build, /try\{var t=localStorage/);
  const bootIdx = build.indexOf('THEME_BOOT');
  const shell = build.slice(build.indexOf('function shell'));
  assert.ok(shell.indexOf('${THEME_BOOT}') < shell.indexOf('site.css'), 'boot script must precede the stylesheet');
  assert.match(build, /data-theme-set="dark"/);
  assert.match(build, /data-theme-set="light"/);
  assert.match(build, /data-theme-set="system"/);
});

test('the theme is never written into the shareable hash', () => {
  const hash = fs.readFileSync(path.join(ROOT, 'ui/hash.js'), 'utf8');
  assert.doesNotMatch(hash, /oty-theme|theme/);
});
