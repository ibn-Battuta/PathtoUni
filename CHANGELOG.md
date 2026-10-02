# Changelog

How this project evolved, and — more usefully — **what it got wrong and how that surfaced.**

The mechanical changes are the least interesting part of this history. The reversals are the
point: this is a product about not telling families things that aren't true, and it has been
wrong eighteen times so far — three times by opening a door that was shut. Each one is recorded below with what caused it and what
now prevents it.

Three running sections carry the real value:

- **[Decision log](#decision-log)** — every standing decision, and every one that was reversed
- **[Errors caught](#errors-caught)** — what was wrong, who caught it, what prevents a repeat
- **[Open questions](#open-questions)** — decided by omission so far, still owed an answer

## Maintaining this file

Every commit adds an entry under the current phase. An entry that only lists files changed is
not worth writing — say what became true that was not true before. If a commit reverses an
earlier decision, update the decision log rather than leaving both entries to contradict each
other, and add a line to **Errors caught** if something was actually wrong rather than merely
superseded.

---

## Phase 25 — Three ways in: subjects, a quiz, and where the world is investing

Ajay asked (26 Sep) for the home page to offer several doors, usable alone or together: the
subjects view, a quiz about what the student enjoys, and courses tied to future industries,
judged by where major economies are putting money — not only Australia.

**Became true**
- The home page opens with three doors: **Start with my subjects**, **What do I enjoy?**
  and **Where is the world investing?** The picker is unchanged below them.
- **`/quiz/`** — ten this-or-that picks. `scoreQuiz` counts picks per topic and keeps the
  top three. The answers stay on the page; only the three topic ids go in the hash (`i=`).
  The page lists degrees whose names match, plus broad degrees in a fold.
- **`/industries/`** — nine areas (AI, quantum, chips, new energy, space, robotics,
  biotech, critical minerals, advanced manufacturing). Each lists which of Australia, the
  US, the EU, the UK, China and India name it, with the government's own words, a link and
  the date checked, then the degrees that can lead there. The page is complete without
  JavaScript. "Sort my results by this" puts the industry in the hash (`x=`).
- **35 quotes from 14 official sources**, each matched word for word by code against the
  live page or the PDF's text on 2 Oct (`docs/review/industries.md`). The build refuses
  `data/industries.json` if an industry cites a quote that does not name it, or if any
  source is not verified (`pipeline/industries.js`).
- **Results sort, never filter.** With interests or an industry in the hash, a new
  *Closest to what you told us* section leads, every list puts matches first, and each
  matching row says why (*Matches: Space and flight*). Same courses, same counts, same bands.
  The three doors carry the hash between them, so they combine.
- **Topics come from the degree's own name** (`ui/topics.js`), with plain rules anyone can
  read. A degree whose name names no area — Bachelor of Science, Engineering (Honours) — is
  *broad*: never scored, never sunk, listed apart with "check the handbook offers a major in
  this area". Project Management is neither: it matches nothing and stays in every list.
- `test/doors.test.js`, nine tests. Dropping `topics` from the build payload and making the
  sort drop zero-score courses each turned the suite red; both were restored.
- Opened in a browser at desktop and phone width, dark and light: no horizontal scroll, no
  console error, **no third-party request** on any of the new pages.

**Judgement, labelled as such** — which degree leads to which industry is ours, from the
degree name. The page says so beside every list. The quiz questions are questions, not
claims. Neither has been reviewed by a person yet; see the review sheet.

**Not true yet**
- Japan and South Korea are not covered. "Not found in what we read" is shown, never "not
  investing".
- No industry description prose: names only, until someone reviews a description.
- Course pages do not yet show their topics.

---

## Phase 24 — Error 18 fixed; a model's check is not a review

A second-pass review by Grok (26 Sep) confirmed error 18 and found four catalogue problems
the discovery batch had inherited. Checked against the files before acting: four held, two
did not (see below).

**Became true**
- **`notEntryPoint`**, a quoted flag for a course no school leaver can start. The HTML
  extractor finds it (an honours year after a degree; an add-on degree) and keeps it only when
  the sentence is found verbatim in the capture. Across all 68 saved course pages it matches
  exactly the two courses in error 18 — nothing else.
- Those two are held out of every result list, count and comparison: the results page says
  *Showing 13 of 128*. Their course pages say *"Not a course you start straight from school"*
  above the subjects, with the university's sentence, drop the *Am I prepared for this?* link,
  and the search snippet leads with it. The build refuses a description for either.
- **UNSW Information Systems (Co-op)** is `computing`, not `science` (`fieldOf` now reads
  "information systems"), and carries its separate Co-op application as a quoted hurdle, so a
  student who never opens the description still sees it on the result row.
- **Neighbours need a shared subject.** With nothing in common, every candidate tied and the
  alphabet chose — Agricultural Science beside Data Science. Now those courses have no
  neighbours rather than wrong ones. Neighbours are still not rendered.
- `docs/review/discovery.md` gains four rules: check sentences against the page, not a
  summary; later-year topics must be on the current unit table; whole-degree `firstYear` only
  when no first-year list exists; and **`reviewedBy` is a person**. Grok's check of the three
  rewrites is recorded in the review sheet, and they stay `reviewed: false` until Ajay reads
  them. The page tells readers a person reviewed each description; a model's check would make
  that untrue.
- `test/entry-point.test.js`, ten tests. The build-copy and extractor checks were each
  confirmed by breaking the code they guard. Opened in a browser: both course pages, the
  results page (Computing tile, Co-op row with its hurdle), no third-party request, no console
  error.

**Checked and not acted on**
- *"The unfamiliar cut is meaningless because 122 of 130 are `low`."* The field is stale in the
  data, but the build maps `low` to `null` and the cut has used `offerCount` since Phase 19
  (46 of 130). Not a defect in what ships.
- *"UOW Mathematics and WSU Data Science really assume 2-unit maths."* No source was given. Not
  entered until it is captured from the page.
- Project Management stays `engineering`: that is the faculty and the tile a student browsing
  engineering would look under. With neighbours now needing a shared subject, the tag no longer
  produces wrong neighbours. A `business` field is a scope decision, not made here.

---

## Phase 23 — First discovery drafts, waiting for review

The discovery slot from Phase 19 had been built and left empty. This fills the first batch —
not all 46 at once, because review is the bottleneck and unreviewed prose ships nowhere.

**Became true**
- Eight entries in `data/discovery/` for computing, maths and data degrees: UNSW Advanced
  Computer Science, UNSW Information Systems (Co-op), Sydney Advanced Computing, Sydney
  Mathematical Sciences, Sydney Project Management, UTS Computing Science, Western Sydney Data
  Science, Wollongong Mathematics. Each lists the university pages it was drawn from.
- All eight are `reviewed: false`. The build ships **0**, and the drafted text appears nowhere
  in `dist/` (checked with grep). Flipping one to `reviewed: true` in a scratch build made it
  appear under *"What this is like — written by this site, not the university"*, then it was
  flipped back.
- `docs/review/discovery-batch-1.md` is the review sheet: each entry, its sources, what could
  not be confirmed, and a checkbox.

**Not true yet**
- Nothing is reviewed, so nothing is public.
- Two courses were not drafted because they are not entry points for a school leaver
  (error 18).
- Computed neighbours are poor where a course has no assumed knowledge: everything in the field
  ties and the alphabet decides. Neighbours are not rendered yet; fix before they are.

**Review, same day** — Ajay checked every claim against the live pages.
- **Five reviewed and shipping:** UNSW Advanced Computer Science, UNSW Information Systems
  (Co-op), Sydney Advanced Computing, Sydney Mathematical Sciences, Western Sydney Data Science.
  The build now ships 5, and only those five course pages carry the block.
- **Three revised, waiting for a second look.** Each was wrong in the same quiet way: a
  sentence that sounded like the source but was not on it.
  - Sydney Project Management listed later units from 2021–22 wording (risk, statistics,
    organisational behaviour). The live table has none of those as units, and Project Finance
    is an elective, not core. Rewritten from the live unit table.
  - UTS Computing Science said the university describes its focus as algorithms, AI and systems
    design. The course page does not say that. Softened to what the subject list shows.
  - Wollongong Mathematics said you can "start undecided". The cited pages do not say that.
    Removed; the content list now uses the page's own words.
- The lesson for the next batch: a draft is checked phrase by phrase against the page it
  cites, not against a summary of the page. Two of the three misses came from summaries.

---

## Phase 22 — Results are classified, not dumped

A realistic profile still returns most of the catalogue as PREPARED. Listing 100 courses is
not a decision aid. The page now asks **which area** you want to look at.

**Became true**
- Engineering, Computing, Science and Health are view filters with counts. University chips
  sit under them. Neither is a band and neither deletes a course from the catalogue.
- Until an area is chosen, ready-now courses are not listed as a wall of names — only the
  gaps (what needs attention) and the four area tiles. Pick Engineering and that list appears.
- The filter lives in the hash (`f=eng`, `u=unsw`) so a careers adviser can send *just
  engineering at UNSW*. An old link without those keys still means every area.

**Housekeeping** — `ui/prototype.html` is regenerated by `npm run build:site` and had not been
committed since Phase 15. It now carries the Phase 18 early-entry field and the Phase 19
discovery slot, matching `engine/readiness.js`. No behaviour changed; the committed engine and
site already had both.

---

## Phase 21 — The landing page was a skinny column on a wide screen

After the site went live, the first family-facing complaint was not a wrong rule. It was that
the page was hard to read: 15px type, a 76rem shell, and the subject picker as a single stack
of short chip rows with empty space down the right.

**Became true**
- The shell is `min(110rem, 96vw)` so results and course pages use most of a desktop screen.
- Body type is 20px. Chips, course names, quotes and labels were lifted with it. Print still
  uses point sizes so a careers sheet is not blown out.
- The landing picker is a two-column grid of question cards (three columns above 90rem). Each
  choice is a full-width button in its cell, not a pill on the left of an empty card.
- Intro copy and the four trust points sit side by side on the home page.

This is the same class of miss as errors 12–16: it was visible in thirty seconds of using the
page, and no unit test would have caught it.

---

## Phase 20 — Compare two subject sets, lead with what does not change

The fourth piece of `docs/MANIFEST-V2.md`. Year 11 confirmation is *these two or those two*.

**Became true**
- Set B lives under prefixed hash keys (`by`, `bm`, `be`…). An old single-set link still
  decodes as a normal result.
- The compare view leads with **"N of M courses are the same either way"** in the largest
  type on the page, then what each set is more prepared for, with reasons and quotes.
  There is no winner and no score.
- A set that fails the ATAR pattern is not comparable on courses; that is said first.
- Restricted and incomplete records are excluded from both sides.

---

## Phase 19 — Discovery: familiarity is computed, prose does not ship unreviewed

The third piece of `docs/MANIFEST-V2.md`. Error 17: `nameRecognition: 'low'` was a
placeholder meaning unassessed, then read as a finding about Bachelor of Science.

**Became true**
- Extractors write `nameRecognition: null`. Familiarity is how many of the six universities
  offer that family of name. The unfamiliar cut is the names that appear at **one** of six
  (46 of 130), and the lede says that — not a claim about cohort size.
- `data/discovery/` is the reviewed-prose slot. `reviewed: false` is excluded from `dist/`.
  A requirement-claim regex and an unknown neighbour id fail the build; both were verified
  by adding a bad entry in tests.
- Neighbours are computed from the catalogue (same field, overlapping assumed knowledge,
  different university). Review path: `docs/review/discovery.md`.

**Not drafted** — 46 uncommon names. Review is the bottleneck; no bulk prose.

---

## Phase 18 — Early entry, stated not scored

The second piece of `docs/MANIFEST-V2.md`. Three universities may admit before the ATAR;
none of those schemes is a readiness band.

**Became true**
- Results carry a section *"Three of these universities may admit you before the ATAR"* —
  quote, what it reads in English, capture date, source. No score, no likelihood, no colour.
- Western Sydney HSC True Reward is `kind: subject_bands` and says we have not captured the
  per-course band table. Macquarie Leaders and Achievers and UOW Early Admission are
  `kind: holistic`.
- `wsu-srs` was `verified` with an empty quote (rule 1). It is now `unverified` and is not
  displayed.
- `stalenessDays: 180` degrades the wording to *"as at &lt;date&gt; — confirm the current
  round with the university"* once that age is passed.
- The engine carries `earlyEntry` the same way as `restrictedTo`: out to the page, never into
  the band. A test asserts five profiles' bands do not move.

**Not true** — we still do not have True Reward's band table, so we cannot say which courses
it would actually admit. Capturing that table is now listed as the next source in
`docs/PIPELINE.md`.

---

## Phase 17 — Dark by default

The first piece of `docs/MANIFEST-V2.md`. Dark is the design; light is still available.

**Became true**
- Bare `:root` is the dark palette. A first-time reader with OS light, no storage, and no
  JavaScript lands on dark.
- A three-state control — Dark · Light · Match my system — sits in the top navigation on
  every page. Choice is stored as `oty-theme` in `localStorage` and is not in the shareable
  hash. Absent or blocked storage resolves to dark without throwing.
- An inline script in `<head>`, before the stylesheet, applies a stored light/system choice
  so the page does not flash.
- Print forces every token, not just `background` and `color`, to ink on white.
- `/about` now says the theme choice is the only thing kept in the browser.

**Measured** — body contrast ≥ 15:1 in both themes; every band tag ≥ 4.5:1 in both. `--bridge`
in light was 4.30:1 and was darkened; `--hard` in dark was shifted toward red-orange and the
hard-gap tag also carries an outline so the two oranges stay distinct by shape.

---

## Phase 16 — Manifest v2 · planned, not built

`docs/MANIFEST-V2.md` — four pieces of work specified for the next build, in order. Nothing
in this phase is implemented yet; the entry exists so the reasoning is on the record before
the code, rather than reconstructed after it.

**1. Dark by default, light still available.** The site has full light/dark support and
**no way to choose** — `data-theme` is honoured by the CSS and set by nothing, so a reader
follows their operating system and cannot disagree. Dark becomes the base palette on bare
`:root`; light is `[data-theme="light"]`; the OS is consulted only under an explicit *Match
my system*. A three-state control in the top navigation, persisted in `localStorage`, applied
by an inline script in `<head>` so the page does not repaint in front of the reader.

The cost is written down rather than waved past: readers who set their OS to light often do
so for a reason — astigmatism makes light-on-dark harder, not easier — and making dark
unconditional overrides that until they find the control. The mitigation is that the control
is findable, not that the cost is small.

Two things fall out and are specified with it: the print path must be forced light on every
token, not just `background` and `color`, or the careers sheet prints dark; and `/about`
gains a sentence about the one thing now kept in the browser, because a page describing
storage it does not mention is how error 12 happened.

**2. Early entry.** `data/early-entry.json` has been captured since Phase 2 and never
surfaced. Four schemes across three universities, and they are **two different kinds of
thing**: Western Sydney's HSC True Reward reads *subject bands* — the only NSW admission route
this tool's own inputs feed — while the other three read Year 11 results, extracurricular
activity, casual work and community involvement, which this tool has never asked about and
must never pretend to score. No scheme produces a likelihood, a score or a band. The manifest
also records that we hold the True Reward scheme but **not** its per-course band table, so the
honest version says what it reads and stops there.

Two defects in the existing data found while specifying it: `wsu-srs` carries
`verification: "verified"` with an **empty quote**, which violates rule 1 outright, and the
file has no freshness rule — early entry has deadlines attached, so a stale claim there is
worse than a stale prerequisite.

**3. Discovery.** The half specified in Phase 3 and never built. The governing risk is
narrow and severe: a model drafting a course description will write *"students need a strong
mathematics background"*, which is a requirement claim sitting next to a quoted university
rule saying the opposite, in the one direction this product exists to prevent. So drafted
prose is rejected at build time by a regular expression, neighbours are computed from the
catalogue rather than written by a model, and `reviewed: false` does not ship — otherwise
"human-reviewed" is a claim the product does not meet.

Specifying its scope turned up **error 17**, below.

**4. Compare two subject sets.** `subjectChangeImpact` already exists; this is a second view
and a hash format. It leads with the count that is **unchanged** — in NSW most swaps change
nothing, and a comparison UI that leads with differences manufactures a decision that is not
there, which is decision 1 inverted. Two directions, never a winner. Existing single-set links
must keep resolving, since careers advisers paste them.

---

## Phase 15 — What the printer showed

Grok's deploy report marked three checks as written but not personally verified: keyboard,
themes, print. Keyboard passed (44 controls, zero without a focus ring). Themes passed (all
four light/dark states resolve, 15.7:1 and 16.1:1). **Print failed at six pages against a
spec that said one**, and fixing it turned up two defects the tests had no reason to look
for, and then a third that had nothing to do with printing at all.

**Print** — rows collapse to name and band, per-row quotes and reasoning come off, the
teaching paragraph and the unfamiliar-courses section come off, and the sources move to one
compact line carrying the distinct university domains and the capture date. `@page` margin
9mm. `test/print.test.js` renders real PDFs across five subject profiles and counts real
pages; removing the row cap makes it fail at four pages, which is how it was checked.

**`situational_judgement` printed on a card.** A raw database value reached the page as a
visible tag on the Veterinary Biology row. Extra hurdles now carry a written label, a
verbatim quote and a source — and none is stored without a quote, which they had never had.

**Two courses were listed as open when they are not.** See error 16. This is the one that
matters.

**Spec amended, deliberately.** `docs/UI-BUILD.md` §5.8 said *"One page of A4."* Rendered
across five real profiles, the sheet runs 1 page at 3 gaps and 4 at 98 — one page is only
reachable by truncating or by shrinking type past readability. The rule is now at most two
pages with the causes always in full: above 24 gap rows the sheet prints the cause line, a
per-university count, and where the rest is. At 98 gaps the individual names all say the
same two things anyway.

---

## Phase 14 — Public site, actually public

`docs/DEPLOY.md` listed eight things that would make 130 pages invisible or misleading. They
are fixed, fonts are self-hosted, and the site deploys from GitHub Actions to GitHub Pages.

**Blocking**
- Each course page has its own title (`…, UNSW — Open To You`) and description built from
  assumed knowledge, whether a mark rule exists, and the capture date
- `sitemap.xml` and `robots.txt` (`Disallow: /results`)
- `/results` is `noindex` and has a real empty state
- Open Graph + Twitter summary on every page
- Newsreader, Public Sans and IBM Plex Mono served from `/fonts/*.woff2` — no Google Fonts,
  no other third party
- “Think a rule here is wrong?” on every course page and About
- `dist-bundle.tgz` and `.stale/` stay gitignored; `dist/` is built in CI, not committed

**Deploy** — `.github/workflows/deploy.yml` runs `npm test` then `build:site` then Pages.
A red suite cannot go live.

---

## Phase 14 — Adviser review pack · `f783827`

**Added** — `docs/review/ADVISER-PACK.md` and a published nineteen-item review pack.

The only error class this repo cannot catch mechanically is a rule quoted correctly, filed under
the right heading, complete, and still understood wrongly. Quote-matching, completeness and the
heading audit all pass on such a rule. Nothing in `test/` will ever fail on it.

**Design**
- **Claims, not records.** An adviser reading `assumedKnowledge: ["Physics"]` nods; one reading
  *"a student without Physics can still be admitted, with a $380 bridging course"* reacts. The
  error lives in the interpretation, so the interpretation is what gets shown.
- **Grouped by rule, not by course** — 130 courses is unreviewable, the distinct rules are about
  a dozen. Nineteen items, twenty minutes.
- **Opens with our own two errors**, so the reader knows what shape of mistake we are hunting.
- Part E is free text and is the most valuable section — particularly *what matters more than
  subject choice that we do not ask about at all?*
- No server. Answers in `localStorage`, output as plain text to paste into an email. Same privacy
  posture as the product; works offline; prints.

Nothing else in the project can produce this finding, which is why it is the last thing built
rather than the first.

---

## Phase 13 — Deploy guide · `eafc46a`

**Added** — `docs/DEPLOY.md`: eight blocking pre-launch fixes, a GitHub Pages workflow, a
live-URL verification list, and an explicit v1 non-goals section.

**Found while writing it — the pre-rendered pages are close to invisible**
- **All 130 course pages carry one identical meta description.** Those pages exist for exactly
  one purpose, to be found by a family searching *"do you need physics for engineering nsw"*, and
  they are currently indistinguishable to a search engine. The real content is already in each
  record; the fix is free.
- **Eleven titles collide** — `Bachelor of Engineering (Honours)` four times, because the same
  degree name exists at four universities. No university in the title.
- **No sitemap and no robots.txt.** 130 pages, none advertised.
- **`/results` is indexable.** The hash never reaches a crawler, so Google would index one blank
  results page under the site's name. Needs `noindex` and a real empty state.
- **No link previews.** The distribution model is an adviser sending a link; without Open Graph
  tags it previews as a bare URL.
- **No way to report a wrong rule.** Fourteen errors caught so far and more expected, and a
  careers adviser who spots a misreading has nowhere to put it.

The build was correct and the site was invisible. Those are different tests, and only one of them
had been run.

**Also** — fonts are Grok's to self-host (its machine has network, mine did not), and
`dist-bundle.tgz` / `.stale/` are review artefacts now gitignored.

---

## Phase 12 — The browser pass · `c7edf07`

Grok built the static site into `dist/` (139 files, two pages, hash state, 130 pre-rendered
course pages) and said plainly that it had not opened it in a browser. This is that pass, run
with headless Chromium against a served `dist/`.

**Passed**
- First heading on the results page is *What needs attention* — the green wall was avoided
- Counts, gap totalling, and the band question all behave as specified
- Course pages keep assumed knowledge and recommended studies apart; Biology renders under
  recommended for Biomedical Engineering, which is the twice-made error not being made
- Source links and capture dates present; dark mode resolves; no horizontal scroll at 390px
- Mobile is a real stepped flow — *Question 1 of 6* with Back/Next

**Three defects found**

### 12. The privacy claim was false on every page load
The About page says a visitor's subjects never leave their browser. True of the subjects — and
irrelevant, because every page fetched webfonts from `fonts.googleapis.com`, handing a third
party the visitor's IP and the page they were reading. For a site aimed at sixteen-year-olds
that is the claim failing on its own terms, and §11 of the build guide had asked for exactly
this check: *nothing transmitted on load beyond static assets*.
**Fixed** — no external request on any page. Typography is a deliberate system stack until the
`.woff2` files can be self-hosted; `ui/site.css` carries the reason and the upgrade path so the
next person does not "restore" the CDN link.

### 13. A card contradicted itself
> Assumed but not held. No bridging course listed for this subject.
> A bridging course is listed in Physics, Chemistry, Mathematics.

Both sentences were true — the first about Biology, the second about the university in general —
and together they were unreadable. **Fixed**: the offer only appears when it covers the gap;
otherwise the card says which subjects it does cover, and that Biology is not one of them.

### 14. A band label promised a remedy that did not exist
Tier C gaps are capped at `BRIDGE_IT`, which the UI labelled *bridging course* — including on
courses where no bridging covers the missing subject. **Fixed**: the label follows the facts, not
the enum, and reads *harder first year* when nothing is on offer.

---

## Phase 11 — Two pages, plainer words, and a build guide · `257abd9`

**Added**
- `docs/UI-BUILD.md` — the full site specification for Grok. Routes, URL-state contract,
  page-by-page layout, canonical copy, design tokens, accessibility, traps, acceptance checklist.

**Changed — the site is two pages, not one**
Subject selection gets its own page; results get their own. Results become a *link* a careers
adviser can send and a parent can bookmark; the results page gets the whole viewport, which is
what the prototype's cramped rows were asking for; and selection (calm, one thing at a time) and
results (dense scan) stop fighting over one layout.

Live recalculation is not lost. State lives in the URL and the results page carries an editable
subject strip that rewrites it, so editing still updates instantly.

**The privacy detail that decided the encoding**
State goes in the **hash fragment**, never the query string. A query string is transmitted on
every request and lands in access logs; a hash fragment is never sent. That is the difference
between *"we promise not to store your subjects"* and *"your subjects were never sent anywhere"*.
The second is the claim the About page makes, and the encoding has to earn it.

**Changed — copy**
The header was four claims compressed into one dense paragraph. Split into a plain statement of
what the tool does, then four separately-worded promises: independent · quoted not summarised ·
private by design · not the last word. The results page now opens by teaching the central fact
before showing any number — *most of this is open, because NSW publishes assumed knowledge
rather than prerequisites; what matters is the short list that is not*.

---

## Phase 10 — Working prototype · `0f70ca6`

**Decided** — planner plus pre-rendered course pages · dense view as default, stepped on mobile ·
prototype before production.

**Added**
- `ui/prototype.template.html` and `ui/build.js`. The build **inlines the real engine source**,
  stripping only its import lines, so the page computes with the same `units.js` and
  `readiness.js` the 72 tests exercise. No reimplementation, no drift.
- `ui/prototype.html` — one self-contained file, no build step, no server, no dependencies.

**Two facts that settled the stack**
- The whole 130-course catalogue is **5 KB gzipped**.
- Of 387 engine lines, only `index.js` (48, the file loader) is Node-only.

So the production site can be static, client-side, and dependency-free — which converts
decision 9 from a promise into a structural fact: with no server, a student's subject list
never leaves their browser. Say that on the About page; it is stronger than a privacy policy.

**The design problem the data created**
For the profile this was built against, the engine returns 110 PREPARED out of 130. A results
list that is 85% green is wallpaper, not information. So the layout leads with the exceptions:
counts, then *What needs attention* with every gap named and totalled, then *If you dropped one*
re-running the whole catalogue per subject, then the unfamiliar courses, and only then a folded
list of everything else. The reassuring answer is still the true one — it just cannot be the
loudest thing on the page.

---

## Phase 10 — Static site

The planner is now a two-page static site in `dist/`, built from the same engine the tests run.

**Added**
- `/` subject selection and `/results` with the subject set in the **hash fragment**, never the query string
- Pre-rendered `/course/<id>` for every catalogue row, plus guides and About
- `npm run build:site` — no bundler; the engine is inlined with imports stripped

**Why two pages.** A results URL is something a careers adviser can send. The prototype's live recalculation survives: the results strip rewrites the hash and re-renders.

**Not done in this step.** End-to-end click-through in a real browser still needs a human. The acceptance list in `docs/UI-BUILD.md` §11 is the script for that.

---

## Phase 9 — UNSW filled via the pipeline

UNSW was the largest destination for this cohort and the thinnest file: three hand-seeded
rows, one of them inherited and unverified. The pipeline now treats it like the other
JS-rendered universities.

**Added**
- `unsw-courses` source: published study sitemap as the index (a GET of XML), then Chrome
  `--dump-dom` on each STEM degree page
- Sitemap discovery drops Canberra, Bengaluru, commerce/arts/law primaries
- `isRepair` upgrades an unverified inherited row when the course page confirms it

**Changed**
- HTML second-check reads the *page* capture, not a 900-character window of concatenated
  nav chrome. That window was why renewable energy stayed unverified even after a clean extract.
- Repair keeps the existing course id, so tests and notes do not silently rename a row

**Catalogue** — UNSW from 3 rows (1 unverified) to 31 verified. Engineering (Honours) and
Medical Science unchanged (the product demo). Renewable Energy is now page-quoted
(Extension 1, Physics), not inherited. **130 courses.**

**Verified in review** — the two seeded UNSW facts still hold: Engineering assumes Ext 1 +
Physics; Medical Science does not assume Biology.

---

## Phase 9 — UNSW filled; the second check had never run · `8d8ed34`

**Added (Grok)**
- UNSW via the same HTML pipeline: published study sitemap as index (XML, a GET is fine),
  Chrome `--dump-dom` per degree page. Canberra, Bengaluru and non-STEM primaries dropped.
  **3 hand-seeded rows → 31 verified.** Catalogue is 130 courses.
- `unsw-renewable-energy-engineering` upgraded from inherited faculty text to a page quote —
  the last unverified record from Phase 5 is gone.
- HTML second-check now reads the whole course capture. It had been searching 900 characters
  after the `<h1>`, which on a 50k rendered page is the navigation menu.

**Found in review**
- **The second check had never run on 127 of 130 courses.** `checkDiffs` maps over
  `diff.changed`; new rows are appended on quote-match alone. `docs/PIPELINE.md` specified
  "second-model check on diffs only" — correct for an established catalogue, wrong for a cold
  start, and the whole catalogue was a cold start. This is a spec hole, not an implementation
  one. `pipeline/audit.js` now second-checks every stored row against its own capture.
- **Three Macquarie records asserted requirements that do not exist.** See
  [error 11](#11-reading-past-assumed-knowledge-none).

**Also** — the first version of `audit.js` searched the whole corpus for each quote and
reported 132 of 212 entries misfiled. That was the audit being wrong, not the data: a quote
like "Mathematics Extension 1" appears on nearly every page, so it matched an arbitrary one.
Scoped per course, the real count was 13. Recorded because it is the same mistake this project
keeps catching in others, made here by the reviewer, and caught only by checking a flagged
page by hand before reporting it.

---

## Phase 8 — WSU extractor fixed; two bugs in the fix · `27ee84f`

The nine incomplete records were a precise worklist and the extractor now clears them. Reviewing
the fix found two defects in the new band logic — one latent, one a silence.

**Added (Grok)**
- Sixth assumed-knowledge phrasing: UOW's "assumes students will have"
- Every subject in a sentence is kept: English → `English Standard`, Science → `any two units of
  Science` (not exploded into named sciences), Mathematics → `Mathematics Advanced`
- `minBand` carried onto assumed-knowledge entries. WSU engineering is Band 5 on four records:
  `wsu-engineering-honours`, materials, advanced manufacturing, construction
- Engine: a missing band is `needsInput`; a recorded band below the assumption is a gap

**Fixed in review**
- **The band branch bypassed the tier cap.** A band shortfall is still a severity *claim*, so a
  Tier C subject two bands short reached `HARD_GAP` — violating standing decision 6. Now capped
  exactly as a missing subject is. No live data triggered it; a band on Chemistry or Physics
  would have.
- **A reasoned pass was reaching the user as silence.** An Extension 2 student never sits
  Mathematics Advanced, so WSU's Band 5 assumption was skipped by name mismatch and the course
  read `PREPARED` with nothing recorded. The pass is right — a higher course in the same subject
  is never a gap — but it was an accident of string comparison, not a decision. Results now carry
  `satisfiedBy`, so a non-obvious pass says why. 45 of 102 courses have one.

**Catalogue** — all 15 WSU courses verified, none incomplete. The single remaining unverified
record is a hand-seeded UNSW row, correctly flagged since Phase 5. **102 courses, 67 tests.**

**Verified in review** — the completeness guard was *strengthened*, not loosened: the only change
was adding a phrase, which widens what gets audited.

---

## Phase 7 — The completeness guard · `0e2d083`

Headless capture landed for the four JS-rendered universities, and reviewing it exposed a hole
in the verification rule that had governed the project since Phase 2.

**Added**
- `pipeline/render.js` — Chrome `--headless=new --dump-dom`, `CHROME_PATH` override
- `capture.js` branches by source kind: the Sydney PDF stays a GET, HTML sources always render
- `pipeline/completeness.js` — audits a parsed record against its capture
- Rule 7 in `.grok/rules/data-integrity.md`

**Changed**
- `engine/readiness.js` — a record that is not fully captured can never read as a clean
  `PREPARED`. It returns `complete: false` and names what is missing.
- 9 Western Sydney records marked `incomplete` rather than silently empty

**Catalogue** — UTS 6, Macquarie 5, Western Sydney 15, Wollongong 5. **102 courses, 59 tests.**

**Why it mattered.** Western Sydney publishes assumed knowledge in six phrasings; the extractor
matched two, and inside those kept only the first subject of a list. Eleven WSU courses parsed
to nothing. Every quote was genuine and every string match passed — the extraction simply was
not whole. See [error 5](#5-quote-verification-is-blind-to-omission).

---

## Phase 6 — Sydney refresh pipeline · `9b00f2b`

First real data pipeline, built by Grok against the brief. It immediately caught two errors in
the hand-seeded catalogue.

**Added**
- `pipeline/` — capture → quote-verify → diff → second-check → merge (8 modules)
- 111 rows parsed from the real Academic Board PDF; 67 STEM rows, all quote-verified
- 62 new verified Sydney courses appended

**Changed**
- Three seeded rows corrected after the pipeline flagged them and human re-check confirmed it
- `engine/units.js` — English modelled as a hierarchy, as maths already was

**Verified in review** — `quote.js` does code-side string matching, not model self-assessment.
`engine/` carries zero network or model references. The merge stops rather than overwriting.

---

## Phase 5 — Engine, data and tests · `3d2a9dc`

The correctness-critical half written by hand so the volume work could be delegated safely.

**Added**
- `engine/units.js`, `engine/readiness.js`, `engine/index.js` — no dependencies
- `data/subjects.json`, six university files, `data/early-entry.json`
- 22 tests, each encoding a fact verified against a primary source
- `AGENTS.md`, `.grok/rules/data-integrity.md`, `docs/RULES-NSW.md`, `docs/PIPELINE.md`

**Division of labour** — rules engine and NESA arithmetic written by hand because being wrong
there closes a real door for a real family. Scraping, UI and catalogue volume delegated.

---

## Phase 4 — The week-one manual pass

Before any code, the whole product was run by hand against one real Year 11 profile:
English Advanced, Mathematics Advanced + Extension 1, Physics, Chemistry, Engineering Studies,
Modern History. 13 units.

**Findings that changed the build**
- Start the pipeline at Sydney's published table, not per-course pages — one fetch yielded more
  verified rows than an afternoon of course pages
- The maths band input is the only gate that exists for this profile; ship it with the engine
- No home in the schema for "same degree name, different assumed knowledge across universities"
- Unit validation is a first-class engine constraint, not picker politeness
- **Demo replaced.** The original spec's hero — drop Physics, watch Engineering die — does not
  fire anywhere in NSW. Replaced with UNSW Medical Science (Chemistry + Maths Advanced) versus
  Sydney Medical Science (Chemistry + Biology): same student, same degree name, two answers.

Then Extension 2 was confirmed for Year 12, and the drop advice reversed — see
[error 6](#6-the-extension-2-unit-recount).

---

## Phase 3 — Discovery layer

Correction from the user: *"before readiness, discovery comes."* A family cannot assess
readiness for a degree they have never heard of.

**Resolved** by recognising that readiness is what makes discovery possible, not a competitor to
it. Roughly 200 STEM degrees is unbrowsable; the ~40 a student is prepared for is a real list.

**The loop** — `Subjects → Readiness (prunes) → Discovery (reveals) → Interest (sorts) → Shortlist`

Every other careers tool runs this backwards: ask what the student wants, then find out whether
it is available. That order manufactures disappointment.

**Also decided** — the input model is four questions, not a hundred checkboxes, because only
about nine NESA subjects carry any STEM readiness signal.

---

## Phase 2 — Architecture

**Decided** — LLM in the refresh pipeline and never in the answer path · all STEM including
health · all three views (one function called three ways) · own child's decision first ·
five readiness bands · evidence tiers A/B/C · hurdles are a flag, never a band.

---

## Phase 1 — Spec review

The original specification was reviewed and its central mechanism found to be built on a rule
that does not exist. See [error 1](#1-the-premise-nsw-has-almost-no-subject-prerequisites).

**Reframed** from *eligibility* ("can I get in?" — in NSW, almost always yes) to *readiness*
("what does this cost me?"). Deliberately not called prerequisites: parents hear that word as
"gate", which is false in NSW.

---

## Phase 0 — Original specification

`docs/source-specs/PathwayPlan_NSW_Website_Specification.docx`. A subject-to-course eligibility
planner with three traffic lights: Open / Assumed gap / Blocked. Modelled on VTAC's Victorian
prerequisite explorer.

---

# Decision log

| # | Decision | Status |
|---|---|---|
| 1 | Product answers "what does this cost me", not "can I get in" | Standing (Phase 1) |
| 2 | Called **readiness**, never prerequisites | Standing (Phase 1) |
| 3 | LLM in the refresh pipeline, never in the answer path | Standing (Phase 2) |
| 4 | All STEM including health | Standing (Phase 2) |
| 5 | Five bands; hurdles are a flag, never a band | Standing (Phase 2) |
| 6 | Evidence tiers A/B/C; Tier C alone can never produce HARD_GAP | Standing (Phase 2) — **nearly broken** Phase 8 by a new code path that bypassed the cap; held after a fix |
| 7 | Front door is subjects; interest sorts but never hides | **Revised** Phase 25 — three doors (subjects, quiz, industries) by Ajay's call; *interest sorts but never hides* stands and is now enforced by a test |
| 8 | Year 11/12 only — no reverse (goal → subjects) engine yet | Standing (Phase 3) |
| 9 | Public site: paraphrase, deep-link, rate-limit, store nothing about students | Standing — **strengthened** Phase 10: a static client-side site makes "stores nothing" structural rather than promised |
| 10 | Three traffic lights (Open / Gap / Blocked) | **Reversed** Phase 1 — one colour would have been 95% of output |
| 11 | Physics-off as the hero demo | **Reversed** Phase 4 — it does not fire anywhere in NSW |
| 12 | Hand-curate ~80 courses; cut scope to 25 | **Reversed** Phase 2 — an extraction pipeline makes breadth nearly free |
| 13 | Only one of History or Engineering Studies can be dropped | **Reversed** Phase 4 — Extension 2 adds a unit; both can go |
| 14 | Quote-matching is sufficient verification | **Reversed** Phase 7 — it is blind to omission |
| 16 | Planner + pre-rendered course pages; dense view default, stepped on mobile | Standing (Phase 10) |
| 17 | Selection and results are separate pages; state in the URL **hash**, never the query string | Standing (Phase 11) |
| 15 | "If a test fails, the code is wrong, not the test" | Standing, **refined** Phase 6 — protects verified *facts*; a test pinning a transient data state may be rewritten to assert the invariant |
| 18 | Eligibility to apply is an axis of its own — never folded into the band | Standing (Phase 15) — established by `restrictedTo`; early entry takes the same shape |
| 19 | Dark is the design; light is a choice the reader can make and keep | Standing (Phase 16) — the cost to readers who set their OS to light is recorded, not waived |
| 20 | Early entry is stated and quoted, never scored | Standing (Phase 16) — three of four schemes read things this tool never asks about |
| 21 | Discovery prose may not contain a requirement claim, enforced in code | Standing (Phase 16) |
| 22 | Comparison leads with what is unchanged, and never names a winner | Standing (Phase 16) — decision 1 applied to a second view |
| 23 | A placeholder value is `null`, never a plausible-looking default | Standing (Phase 16) — after error 17 |
| 24 | A course no school leaver can start is not a result for anyone; its page says so first | Standing (Phase 24) — after error 18 |
| 25 | `reviewedBy` names the person who read it; a model's check is recorded but is not a review | Standing (Phase 24) |
| 26 | An industry is listed for a country only where that government's own document names it, quoted and code-matched | Standing (Phase 25) |

---

# Errors caught

### 1. The premise: NSW has almost no subject prerequisites
The original spec assumed NSW works like Victoria. It does not. UNSW: *"we don't have formal
subject prerequisites for any of our degrees."* UTS: *"There are no HSC subject prerequisites
for any UTS course, with the exception of teacher education courses."* Macquarie, Western Sydney
and Wollongong the same. Only Sydney has any, on Engineering (Honours), Advanced Computing and
Pharmacy — and that rule is about a **mark**, not a subject.
**Caught by** verifying the business case against primary sources before building.
**Prevents repeat** — `docs/RULES-NSW.md` is the factual spine; nothing encodes a rule without it.

### 2. Physics and Chemistry grouped as one subject area
UAC: *"Within an HSC subject area (eg mathematics) there may be a number of courses."* All maths
courses collapse to one area; Physics and Chemistry are two.
**Caught by** a unit test written from a verified fact.

### 3. A weak Extension 1 band was assumed to gate a Sydney course
Wrong for an `advanced_ext1` student: they also sit Mathematics Advanced, so Band 4 there is a
live route. Only when *every* route fails is a course gated.
**Caught by** the engine disagreeing with a test. The engine was right; the test was wrong.

### 4. Two seeded rows contradicted the source
Biomedical Engineering: assumed is Extension 1 + Chemistry; **Biology and Physics are
recommended**, not assumed — the seed had merged two PDF columns. Medical Science: the
prerequisite column is empty; Sydney dropped it for Science from 2025, which `RULES-NSW.md`
already said. **The data contradicted our own documentation.**
**Root cause** — trusting a model's *summary* of the table instead of the table. The summariser
added "alongside mathematics prerequisites" to Medical Science; those words are not in the source.
**Caught by** the pipeline's diff, which flagged and stopped rather than overwriting.

### 5. Quote-verification is blind to omission
Western Sydney: *"Assumed knowledge required: Two subjects of Science, two subjects of English
and Mathematics (not General Mathematics) at Band 5 or higher."* Stored: one subject, no band.
Eleven WSU courses parsed to nothing. Every quote was genuine; every string match passed.
**The architectural lesson** — quote-matching catches invention but not incompleteness, and
incompleteness fails toward "no requirements found", which the engine read as `PREPARED`. The
reassuring direction is the dangerous one.
**Prevents repeat** — `pipeline/completeness.js` plus an engine fail-safe: an incomplete record
can never read as a clean `PREPARED`.

### 6. The Extension 2 unit recount
NESA: *"For students entered in Mathematics Extension 2, both Mathematics Extension 1 and
Mathematics Extension 2 are counted as 2-unit courses."* An Extension 2 student carries four
units of maths and **does not sit Mathematics Advanced** — which also removes the easiest route
through Sydney's gate. Advice given before this rule was encoded ("only one subject can be
dropped") was wrong.
**Prevents repeat** — unit values are context-dependent in `data/subjects.json`; never hardcoded.

### 7. English had no hierarchy
Sydney Agricultural Science assumes "English Standard". A student doing English Advanced was
flagged as having a gap. Maths had a hierarchy; English did not.
**Prevents repeat** — a higher course in the same subject is never a gap.

### 8. A new code path bypassed the tier cap
The band-shortfall branch added in Phase 8 built its own finding and never applied
`MAX_BAND_FOR_TIER`. A Tier C subject two bands below an assumption reached `HARD_GAP`, which
standing decision 6 forbids. No shipped data triggered it — no non-maths subject carried a
`minBand` yet — but WSU-style band statements on Chemistry or Physics are entirely plausible.
**The lesson** — a rule enforced at one point in a function is not enforced in the function. When
a second path produces the same kind of output, it needs the same guard, and a test that only
exercises the first path will not notice.

### 9. A reasoned pass reached the user as silence
An Extension 2 student does not sit Mathematics Advanced, so WSU's "Band 5 or higher" assumption
was skipped because the subject name did not match anything held. The course read `PREPARED` with
an empty findings list. The *answer* was right; the *reason* did not exist. Any later change to
subject naming would have altered the behaviour with nothing to catch it.
**Prevents repeat** — results carry `satisfiedBy`. A non-obvious pass now records why it passed,
which is also what the UI needs to answer "why is this open?".

### 10. Second-check looked at the nav chrome
UNSW Renewable Energy extracted cleanly (Extension 1, Physics, quotes on the page) and then
the second-check declared a conflict. The check searched a 900-character window after the
first occurrence of the degree name — which on a 50k rendered page is the `<h1>` plus the
menu. Assumed knowledge sits much further down. The inherited unverified row would have
stayed unverified forever.
**Prevents repeat** — when the capture is already one course page, the second-check reads
the whole page, not a window into concatenated captures.

### 10. The second check never ran on the catalogue
Specified as "diffs only", which assumes rows arrive by changing. Every row arrived by being
added, so the independent re-read never fired. Quote-match proves a phrase is real;
completeness proves nothing stated was dropped; neither confirms the phrase was read under the
right heading — which is precisely the error class of #4 and #11.
**Prevents repeat** — `pipeline/audit.js` audits the whole catalogue, not just diffs.

### 11. Reading past "Assumed knowledge: None."
Macquarie states, verbatim: `Assumed knowledge None. Recommended studies HSC Mathematics
Extension 1 or HSC Mathematics Extension 2 …`. Three records — Cyber Security, Information
Technology, Medical Sciences — stored the *recommended* line as *assumed* knowledge, inventing
a requirement the university explicitly disclaims.
**Direction matters** — this errs toward over-warning, not over-reassuring, so it is less
dangerous than #5. But for a product whose entire thesis is *"you are being told to worry about
things that do not matter"*, manufacturing a requirement is the worst-shaped error available.
**Prevents repeat** — a test asserts all three assume nothing and read `PREPARED`.

*(Aside: Macquarie's own pages recommend Information Processes and Technology and Software
Design and Development — both retired NESA courses. The universities go stale too.)*

### 12–14. Found by opening it in a browser
A false privacy claim on every page load, a self-contradicting card, and a band label promising
a remedy that did not exist. See Phase 12.
**The lesson** — 75 tests were green and every one of these was visible in the first thirty
seconds of looking at the page. Tests check what you thought to assert. A browser shows what a
person actually gets.

### 15. The print spec was approved as CSS and failed as paper
`@media print` was written, reviewed and reported done. Rendered, it was six pages — the
screen layout printed every gap as a full card with its quote, its reasoning and its own
source line. Two more defects were sitting in the same output: a duplicated list of full
URLs in the footer, and a raw enum on a card.
**Prevents repeat** — `test/print.test.js` renders a PDF and counts pages. It skips loudly
where no browser exists rather than passing quietly, because a print check that never runs is
worse than none.

### 16. Two courses were shown as open to students they are not open to
Sydney's Bachelor of Science (Extended) and Bachelor of Science (Extended) (Health) state, in
the special-entry column of the same table every other rule comes from: *"Admission to this
course is only open to Aboriginal and Torres Strait Islander students."* The parser read that
cell for portfolios, interviews and personal statements — patterns it had — and dropped the
sentence that decided eligibility, which it did not. Both courses carry no assumed knowledge,
so they scored `PREPARED` and appeared for every student as bare links under **"Everything
else you are ready for"**.

Then `ui/build.js` copies courses field by field into the page bundle, so even after the data
carried `restrictedTo`, the field vanished on the way to the browser without an error.

**This is error 5 wearing different clothes.** Omission again failed toward the reassuring
answer — but where WSU's omission hid a requirement, this one opened a door that is closed.
The entire premise of the product is not telling a sixteen-year-old something untrue about
where they can go, and it was doing exactly that on two courses, silently, from the first
build.

**Two things made it invisible.** Nothing in the pipeline asks *who may apply* — every guard
built so far checks subject rules, so a constraint on a different axis passed through every
one of them. And the failure was legible only on screen: it looked like an ordinary course
name in a list.

**And it was wrong twice over.** The results page was fixed first; the pre-rendered course
pages are a separate renderer and were still wrong. Those are the site's indexed surface —
`/course/usyd-science-extended/` read *"No assumed knowledge listed on the captured page"* and
stopped, and its meta description, the snippet a student meets in a search result before
they have seen anything else on this site, said *"lists no assumed knowledge. No subject
prerequisites."* Fixing one surface and calling the defect closed is its own error.

**Prevents repeat** — `restrictedTo` is parsed with quotes checked in code, carried through
the engine, held out of both the gap list and the ready list into its own section, and
labelled `subjects fit` rather than `ready now` because the band only ever knew about
subjects. The course page states who can apply above anything about subjects, and the search
snippet leads with it. `test/restriction.test.js` checks all of it — including that the build
does not drop the field on its way to the page, and that no course page prints a raw enum —
and each assertion was checked by breaking the thing it guards.

### 17. A placeholder was being read as a finding
`pipeline/usyd-table.js:252` and `pipeline/html-course.js:293` both stamp
`nameRecognition: 'low'` on every course they extract. It is a default meaning *nobody has
assessed this*. Eight courses were ever assessed by hand, so the catalogue reads **122 low, 2
medium, 6 high** — and the results page filters on exactly that field:

```js
const unfamiliar = prepared.filter(r => r.course.nameRecognition === 'low');
```

under the heading **"Open to you, and probably unfamiliar"**, with the line *"Narrower degrees
mean smaller cohorts and fewer exits if you change your mind."* The site has been making that
claim about Bachelor of Science.

**Caught by** checking what the number actually was before writing a manifest section that
depended on it. The section assumed the field discriminated; it does not.

**Direction** — over-warning and mis-describing, so nearer error 11 than error 16. Nothing is
shown as open that is shut. But a claim about cohort size and exit options is a claim a family
can act on, and it rests on a value nobody set.

**Prevents repeat** — the absent value becomes `null`, which is never displayed as anything;
familiarity is derived from something measurable (how many of the six universities offer a
degree of that name) rather than guessed per course; and a test asserts the unfamiliar cut is
a minority of the catalogue rather than 94% of it. Specified in `docs/MANIFEST-V2.md` §3.4.


### 18. Two courses a school leaver cannot enter were listed as ready

Found while researching the first discovery batch. **UNSW Bachelor of Computational Design
(Honours)** (program 4523) is a one-year, 48-unit honours year for students who already hold
the Bachelor of Computational Design. **Western Sydney Bachelor of Applied Data Science** is,
in the university's own words, *"not a stand-alone degree, but is designed to be undertaken as
an add on degree in combination with any Bachelor degree offered at Western Sydney
University."* Both have no or little assumed knowledge, so both scored as open to nearly
everyone.

**Direction** — the same direction as error 16: a door shown open that a Year 12 student
cannot walk through. It is on the *who may apply* axis again, which the pipeline still does
not ask about except for the one restriction pattern error 16 taught it.

**Caught by** reading what the degree actually contains, for a description, rather than only
its subject rules.

**Prevents repeat** — `notEntryPoint` is extracted in code from the capture, quoted, carried
through the engine and the build, held out of every result list, and stated first on the
course page and in its search snippet (Phase 24). A test asserts only these two courses carry
it, so a pattern that starts catching ordinary degrees fails loudly instead of hiding them.
The pipeline still asks *who may apply* only through patterns it has been taught; the next
one will again be found by reading a page, not by a guard.

---

# Open questions

- **Scaling and adjustment factors are still out of scope.** For the profile this was built
  against, every remaining decision is a scaling question, not a readiness one. The tool would
  say "everything's fine" and fall silent on the actual choice.
- **Early entry is now the stronger version of that question.** Three of six universities admit
  through non-ATAR routes that read Year 11 results, and Western Sydney's HSC True Reward admits
  on **subject bands rather than the ATAR** — subject choice feeding admission directly. That is
  readiness-shaped, not scaling-shaped. See `data/early-entry.json`.
- **`nameRecognition` needs a real basis, not just a non-guessing one.** Deriving it from how
  many universities offer a degree of that name is defensible and computable, but it measures
  name commonality, not whether a sixteen-year-old has heard of it. Those are close and not the
  same, and nobody has checked how close.
- **No independent review yet.** One careers adviser reading the engineering set would catch the
  class of error that quote-matching and completeness checks both miss: a rule read correctly and
  understood wrongly.
