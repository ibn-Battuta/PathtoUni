# Deploy guide

Target: **GitHub Pages**, served from this repo. The site is static, dependency-free and about
200 KB, so there is nothing to provision and nothing to pay for.

Do §1 before §2. The blocking items are not polish — they are the difference between 130 pages
that work and 130 pages that are invisible or misleading.

---

## 1. Blocking — fix before the site goes public

### 1.1 Every course page carries the same meta description

All 130 pages currently share one description:

> "NSW STEM readiness planner. Enter HSC subjects; see which degrees you are prepared for…"

Those pages exist for one reason: to be found by a family searching *"do you need physics for
engineering nsw"*. Identical descriptions across 130 URLs is the single biggest defect in the
build, and the fix is free because the real content is already in the record.

Generate per course, from its own data:

```
Bachelor of Engineering (Honours) at UNSW assumes Mathematics Extension 1 and Physics.
No subject prerequisites. Checked 28 August 2026.
```

### 1.2 Eleven course titles collide

`Bachelor of Engineering (Honours)` appears four times, `Bachelor of Science` three. Include the
university: `Bachelor of Engineering (Honours), UNSW — Open To You`.

### 1.3 No sitemap, no robots.txt

130 pre-rendered pages with no sitemap are found slowly or not at all. Emit both in `build:site`:

- `dist/sitemap.xml` — every page except `/results`, with `<lastmod>` from the capture date
- `dist/robots.txt` — allow everything, point at the sitemap, `Disallow: /results`

### 1.4 `/results` must not be indexed

The hash never reaches the server, so a crawler sees one bare `/results` with no subjects — a
blank page in the index under your name. Add `<meta name="robots" content="noindex">` to that
page only, and give it a real empty state: *"Choose your subjects to see what's open to you"*
with a link back to `/`. Right now it renders nothing useful without a hash.

### 1.5 No link preview

The distribution model is a careers adviser sending a link and a parent forwarding it. With no
Open Graph tags that link previews as a bare URL. Add `og:title`, `og:description`,
`og:type=website`, `og:url` and `twitter:card=summary` to every page, using the same per-page
strings from 1.1. No image is needed; a text preview that says the right thing beats a generic one.

### 1.6 Self-host the fonts

I removed the Google Fonts link because it contradicted the privacy claim — every page load was
handing a third party the visitor's IP and the page they were reading, while `/about` says
nothing leaves their browser. Your machine has network access and mine did not, so this one is
yours: download the four `.woff2` faces (Newsreader 500, Public Sans 400/600/700, IBM Plex Mono
400/600), put them in `ui/fonts/`, emit `@font-face` rules with `font-display: swap`, and copy
them into `dist/`. `ui/site.css` carries the reason at the top — read it before touching this.

**Do not restore the CDN link.** No page may make a third-party request. That is the whole basis
of the claim on `/about`.

### 1.7 No way to report a wrong rule

This project has caught fourteen errors and expects more. A careers adviser who spots a
misreading currently has nowhere to put it. Add a single line to every course page and to
`/about`: *"Think a rule here is wrong? Tell us —"* with a `mailto:` or a GitHub issues link.
Cheap, and it is the only channel through which the error class nothing here can catch gets found.

### 1.8 Housekeeping

`dist-bundle.tgz` and `.stale/` are working artefacts of the review sessions and should not be in
the repo. Add both to `.gitignore` and remove them from tracking.

---

## 2. Deploy

### 2.1 Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push: { branches: [master] }
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm test
      - run: npm run build:site
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`npm test` runs before the build deliberately. A red suite must not reach the public site.

### 2.2 Repository settings

Push to GitHub, then **Settings → Pages → Source: GitHub Actions**. First deploy takes a couple
of minutes.

### 2.3 Base path

A project site serves from `/<repo>/`, not the domain root. Asset paths are already relative
(`../../site.css`), so this works — but **verify it on the live URL**, not locally. If you later
add a custom domain, put it in `dist/CNAME` via the build so it survives redeploys.

### 2.4 `.nojekyll`

Already emitted. Keep it, or GitHub silently drops files beginning with an underscore.

---

## 3. Verify on the live URL

Not locally. Locally everything works.

- [ ] Home loads; the picker works; **See what's open to you** reaches `/results#...`
- [ ] A results link opened in a private window reproduces the same answer
- [ ] Network tab on every page type shows **no third-party request at all**
- [ ] A course page found directly — as a stranger would — says *not UAC*, shows its quote,
      its source link and its capture date above the fold
- [ ] `robots.txt` and `sitemap.xml` resolve; `/results` carries `noindex`
- [ ] A results link pasted into a message previews with real text
- [ ] Print one page of A4 with sources and the date on it
- [ ] Keyboard-only pass from selection to results
- [ ] Light, dark, and system-unstamped all legible

---

## 4. Not in v1 — deliberately

- **No analytics of any kind.** Not Plausible, not GA, nothing. The audience is sixteen-year-olds
  and the privacy claim is absolute. If you later want counts, count at the CDN, not in the page.
- No accounts, no saved profiles, no server.
- No ATAR prediction, no offer prediction.
- No advertising, no affiliate links.

---

## 5. Then stop and get it read

Once it is live, the highest-value remaining work is not code. It is one careers adviser reading
the engineering and computing rule set. Every error class this project can catch mechanically, it
catches. The one it cannot is a rule quoted correctly, filed under the right heading, complete —
and still understood wrongly. Nothing in `test/` will ever find that.
