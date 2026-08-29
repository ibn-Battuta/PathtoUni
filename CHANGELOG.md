# Changelog

How this project evolved, and — more usefully — **what it got wrong and how that surfaced.**

The mechanical changes are the least interesting part of this history. The reversals are the
point: this is a product about not telling families things that aren't true, and it has been
wrong five times in its first day. Each one is recorded below with what caused it and what
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
| 7 | Front door is subjects; interest sorts but never hides | Standing (Phase 3) |
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

---

# Open questions

- **Scaling and adjustment factors are still out of scope.** For the profile this was built
  against, every remaining decision is a scaling question, not a readiness one. The tool would
  say "everything's fine" and fall silent on the actual choice.
- **Early entry is now the stronger version of that question.** Three of six universities admit
  through non-ATAR routes that read Year 11 results, and Western Sydney's HSC True Reward admits
  on **subject bands rather than the ATAR** — subject choice feeding admission directly. That is
  readiness-shaped, not scaling-shaped. See `data/early-entry.json`.
- **No independent review yet.** One careers adviser reading the engineering set would catch the
  class of error that quote-matching and completeness checks both miss: a rule read correctly and
  understood wrongly.
