# Build manifest v2 — dark by default, early entry, discovery, compare

Four pieces of work. They are independent: ship them in this order, each behind its own
green suite, and do not batch them into one commit.

| # | Piece | Why it is here |
|---|---|---|
| 1 | Dark by default, light still available | The design is dark; today the site has no theme control at all |
| 2 | Early entry | Three of six universities admit before the ATAR, and one of them reads **subject bands** — the only admission route in NSW that this tool's inputs actually feed |
| 3 | Discovery | The half of the product specified in Phase 3 and never built: a student cannot choose between degrees they cannot tell apart. Includes fixing `nameRecognition`, which is a stub being read as a finding (**error 17**) |
| 4 | Compare two subject sets | "If you dropped one" answers one change at a time. Year 11 confirmation is *these two or those two* |

## Read first

`AGENTS.md`, `.grok/rules/data-integrity.md` (nine rules — 8 and 9 are new and both matter
here), `docs/RULES-NSW.md`, and the **Errors caught** section of `CHANGELOG.md`. Sixteen
errors are recorded there. Three of them — 5, 11 and 16 — are the same error: a parser
extracted the patterns it had and silently dropped what it did not, and the omission read as
good news. Every piece below can fail that way. The guards specified here are not decoration.

**The standing rule this manifest leans on hardest:** a claim on a different axis from
readiness is never folded into the band. `restrictedTo` established the shape in Phase 15 —
parsed with a quote checked in code, carried through the engine, stated on the page, and kept
out of the band. Early entry and discovery both take that shape.

---

# 1. Dark by default, light still available

## 1.1 What exists now

`ui/site.css` defines light tokens on bare `:root`, then redefines them twice for dark: once
under `@media (prefers-color-scheme:dark){:root:not([data-theme="light"])}` and once under
`:root[data-theme="dark"]`. So dark already works and was measured at **15.68:1** and
**16.05:1** body contrast.

**There is no toggle.** `data-theme` is honoured by the CSS and never set by anything. The
site follows the reader's operating system and offers no way to disagree with it.

## 1.2 The decision, and what it costs

Dark is the site's design. A first-time reader lands on dark **whatever their OS says**, and
can switch to light and have that remembered.

State the cost plainly, because it is real: some readers set their OS to light for a reason —
astigmatism in particular makes light text on a dark ground harder to read, not easier. Making
dark unconditional overrides that until they find the control. The mitigation is that the
control is genuinely findable, not that the cost is small. So:

- The theme control lives in the top navigation on every page, not in a settings drawer, not
  behind a menu, and not only on the About page.
- Three states, in this order: **Dark** (default) · **Light** · **Match my system**.
- Persisted in `localStorage` under one key, `oty-theme`, values `dark` | `light` | `system`.
- Absent or unreadable storage resolves to **dark**.

## 1.3 Implementation

**Token structure.** Invert the current arrangement:

- Bare `:root` carries the **dark** palette. This is what a reader gets with no stored choice,
  no OS signal, and no JavaScript.
- `:root[data-theme="light"]` carries the light palette.
- `@media (prefers-color-scheme: light){ :root[data-theme="system"] { …light… } }` — the OS is
  consulted **only** when the reader has chosen "Match my system".

Never give a colour its only definition inside a media query. Every token gets a value on bare
`:root` first.

**No flash.** A theme applied by `app.js` after parse repaints the page in front of the reader.
Set it in an inline `<script>` in `<head>`, before any stylesheet link, in `ui/build.js`'s
`shell()` so every one of the 136 pages gets it:

```html
<script>try{var t=localStorage.getItem('oty-theme');if(t==='light'||t==='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
```

Wrapped in try/catch: a browser set to block site data throws on the accessor itself, and an
exception there would leave the rest of `<head>` unparsed.

**`<meta name="theme-color">`** — two of them, one per `prefers-color-scheme`, matching the
paper token. Without it the mobile browser chrome stays light above a dark page.

**Print stays dark ink on white paper.** The print block already forces `body{background:#fff;
color:#111}`. With dark as the base, every token the print path relies on has to be forced, not
just those two — check the band tags, the `.restrict` block, rules and borders. A printed sheet
that comes out dark wastes a cartridge and is the single most likely regression here.

## 1.4 Palette work

Do not simply keep today's dark tokens. They were built as the alternate; they are now the
design. Specifically:

- Re-measure body contrast in both themes. Floor is the current bar: **15:1** for body text.
- Measure the band tags (`--prep`, `--minor`, `--bridge`, `--hard`, `--gated`, `--restrict`)
  against their `-soft` grounds. Floor **4.5:1**. These were never measured; assume at least
  one fails.
- `--bridge` and `--hard` are adjacent oranges. In dark they are harder to tell apart than in
  light. If they cannot be separated at the required contrast, separate them by shape as well
  as colour — the band tag already carries a word, so this is a small change.
- Elevation cannot be done with shadow on a dark ground. Use surface steps
  (`--surface`, `--surface-2`) and rules.

## 1.5 Acceptance

- [ ] Fresh browser, OS set to **light**, no storage: page renders **dark**
- [ ] Toggle to Light, hard-reload: still light, and no flash of dark before paint
- [ ] "Match my system" with OS light → light; flip OS to dark → dark, no reload
- [ ] `localStorage` blocked entirely: page renders dark, toggle does not throw, nothing breaks
- [ ] Print in both themes → both produce dark ink on white, 1–2 pages, per `test/print.test.js`
- [ ] Body contrast ≥ 15:1 in both; every band tag ≥ 4.5:1 in both — **measured, not eyeballed**
- [ ] Keyboard pass still clean: every control reachable, focus ring visible **on the dark
      ground** (a focus ring tuned for a light background disappears on dark)

## 1.6 The privacy page must be updated in the same commit

`/about` currently says: *"There is no account and no server-side profile. Your subject list
lives in the hash fragment… Browsers do not send that fragment to the server."* All still true,
and `localStorage` does not weaken it — but the page now describes storage that exists and does
not mention it. Error 12 in the changelog is a false privacy claim shipped on every page load.
Add one sentence: the theme choice is the only thing kept in the browser, it never leaves the
device, and clearing site data removes it.

**Do not add the theme to the URL hash.** The hash is shareable and is pasted by careers
advisers; a reader's display preference is not part of a student's subject list.

---

# 2. Early entry

## 2.1 Why this is not an optional extra

`data/early-entry.json` opens with the reason: *"Three of six MVP universities lead with these,
and they read Year 11 results. A tool modelling only prerequisites describes a minority of how
NSW admission works."*

One scheme matters more than the rest. Western Sydney's **HSC True Reward** admits *"on ATAR
release day based on specific HSC subject band outcomes rather than the ATAR itself."* Subject
choice → bands → admission, with the ATAR bypassed. That is the only NSW admission route this
tool's own inputs feed directly, and it is the second reason the maths band input is core
rather than optional.

## 2.2 The trap, stated before the spec

Four schemes are captured. **They are two different kinds of thing and must never be shown as
one.**

| Scheme | Reads | Can this tool reason about it? |
|---|---|---|
| WSU HSC True Reward | `hsc_subject_bands` | **In principle yes** — see 2.3 |
| Macquarie Leaders and Achievers | Year 11 results, extracurricular, casual work, community involvement | **No** |
| WSU Schools Recommendation Scheme | Year 11 studies, school ratings | **No** |
| UOW Early Admission | Year 11 results, skills and experience | **No** |

Three of the four read things this tool has never asked for and must never pretend to score.
A page that says *"you look like a strong early-entry candidate"* on the basis of a subject
list has invented a judgement about a student's community involvement. **No scheme produces a
likelihood, a score, a band, or a colour.** They are stated, quoted, dated, and linked.

## 2.3 What we can honestly say about True Reward, and what we cannot

We hold the scheme and its quote. We **do not** hold the per-course subject-band table it runs
on. So the honest version now is:

> Western Sydney may admit you on ATAR release day on specific HSC subject band outcomes rather
> than on the ATAR. Which bands, for which course, is published by the university — we have not
> captured that table. Your subject bands are what it reads.

Ship that. Do **not** compute eligibility against a table we do not have, and do not let the
phrase "your bands are what it reads" drift into "your bands qualify you".

Add capturing that table to `docs/PIPELINE.md` as the next source. When it lands it is Tier A
structured data and can be reasoned about properly — and at that point it belongs in the engine
as its own axis, still never as a band.

## 2.4 Data work first

**`wsu-srs` has `verification: "verified"` and an empty `quote`.** That violates rule 1 — a
verified record with nothing to check. Fix before building any UI on this file: re-capture and
quote it, or demote it to `unverified` and let the UI treat it as absent. Do not display it as
it stands.

Then, for the file as a whole:

- Every scheme carries `quote`, `source`, `capturedOn`. No quote, no display. Same rule as
  everything else.
- **Store no date you did not quote.** Application windows are the highest-churn field on any
  university site and a stale deadline is worse than a stale prerequisite, because a reader can
  act on it and be too late. If a closing date is shown, it is shown as a verbatim quote with
  its capture date beside it, or it is not shown.
- Add a `kind` field: `"subject_bands"` for True Reward, `"holistic"` for the other three. The
  UI branches on `kind`, never on the university name.

## 2.5 Freshness, because this data expires

Prerequisites drift slowly. Early entry changes every year and has deadlines attached. So:

- The capture date appears next to every scheme, always, not only in a footer.
- Add `stalenessDays` to the schemes file. Past that age the UI degrades its own wording from
  the present tense to *"as at <date> — confirm the current round with the university"*, and
  the source link stays. This is a code-side rule keyed on the date, not an editorial habit.
- 180 days is the starting value. It is a guess; write it down as one.

## 2.6 Where it appears

**Results page** — one section, below readiness, above the fold-out. Not a card per course:
these are institution-level schemes and a per-course repeat would imply per-course criteria we
do not have. Head it plainly: *"Three of these universities may admit you before the ATAR."*
For each scheme: university, name, what it reads (from `uses`, written out — not the enum;
see error 15), the quote, capture date, source link.

**Course pages** — one line for courses at Macquarie, Western Sydney and Wollongong, linking to
the results-page section. Not the whole block on 60 pages.

**Never in the counts.** The summary tiles count readiness bands. Early entry is not a band and
does not appear there.

## 2.7 Engine

`earlyEntry` rides alongside `restrictedTo`: carried through `readiness()`, never read by band
arithmetic. Follow the comment already on `restrictedTo` in `engine/readiness.js` — the
reasoning is identical and is written out there.

## 2.8 Acceptance

- [ ] `wsu-srs` is quoted or absent — never displayed unquoted
- [ ] No scheme renders a score, a likelihood, a band, or a traffic-light colour
- [ ] `uses` values render as written English, never as `casual_work`
- [ ] Every scheme shows its capture date on screen
- [ ] A test sets `capturedOn` past `stalenessDays` and asserts the wording degrades
- [ ] A test asserts adding early entry changes no course's band for any of five profiles
- [ ] Nothing anywhere claims a student qualifies for anything

---

# 3. Discovery

## 3.1 The specified but unbuilt half

From `AGENTS.md`, item 4: *"the 'you probably haven't heard of these' cut, course descriptions,
nearest-neighbour comparisons, QILT outcomes."* The results page already has the unfamiliar cut
(`nameRecognition: low`). What it does not have is anything that helps a reader tell two
similar-sounding degrees apart — which is the whole reason the unfamiliar cut exists.

Rule 5 already governs this: *"Two content types, two regimes. Readiness data: structured,
extracted, code-verified. Discovery prose: drafted by a model, reviewed by a human, regenerated
rarely."*

## 3.2 The failure mode, which is specific and severe

A model drafting a course description will write a sentence like *"students need a strong
mathematics background"*. It is a natural thing to write and it is a **requirement claim**. On a
page whose entire purpose is to say that NSW has almost no requirements, next to a quoted
university rule saying no assumed knowledge, it does two kinds of damage: it contradicts the
quoted rule, and it does so in the one direction the product exists to prevent.

So the guard is mechanical, code-side, and runs on every entry at build time:

```
/\brequir|prerequisite|assumed knowledge|you (?:must|need to|should) have|essential that|
 expected to have|necessary background|strong background in|need a solid/i
```

Any match rejects the entry and fails the build. Not a warning. If a description genuinely
needs to discuss subject background, it does so by linking to the quoted assumed-knowledge
block on the same page, which is the verified version.

## 3.3 Shape

`data/discovery/<course-id>.json`, one per course:

```json
{
  "courseId": "usyd-medical-science",
  "firstYear": "…what the first year actually contains…",
  "notThis": "…the confusion this course is most often mistaken for…",
  "neighbours": ["usyd-science-health", "unsw-medical-science"],
  "draftedBy": "<model and date>",
  "reviewed": false,
  "reviewedBy": null,
  "reviewedOn": null
}
```

Rules on this file:

1. **`reviewed: false` does not ship.** The build excludes unreviewed entries from `dist/`
   entirely. If unreviewed prose renders, "human-reviewed" is a claim the product does not
   meet, and rule 5 becomes decoration. This is the single most important line in section 3.
2. **`neighbours` is computed, not written.** A model asked for similar courses will name a
   course that does not exist. Compute candidates in `pipeline/` from the catalogue — same
   `field`, overlapping `assumedKnowledge` subjects, different university — then let the prose
   explain the difference between them. A build-time check asserts every id in `neighbours`
   exists in the catalogue; an unknown id fails the build.
3. **Attribution on the page.** Every discovery block is visibly labelled as written by this
   site, not by the university, and as description rather than rule. The assumed-vs-recommended
   distinction is called *"one of the two errors this project has made twice"* in
   `docs/UI-BUILD.md` §6 and the fix there was to make the separation visually unmissable. Do
   the same here: different ground, different type, its own heading.
4. **Never in the answer path.** Static JSON read at build time. No model call at runtime, ever
   (decision 3, standing since Phase 2).

## 3.4 Fix `nameRecognition` first — it is a stub being read as a finding

Discovery is meant to be scoped by `nameRecognition: low`. That field cannot carry the weight,
and finding out why turned up a live defect (error 17).

`pipeline/usyd-table.js:252` and `pipeline/html-course.js:293` both hardcode
`nameRecognition: 'low'` on every course they extract. It is a placeholder meaning *nobody has
assessed this*. Eight courses were ever set by hand. So the distribution is **122 low, 2 medium,
6 high** — and the results page filters on it:

```js
const unfamiliar = prepared.filter(r => r.course.nameRecognition === 'low');
```

under the heading **"Open to you, and probably unfamiliar"**, with the line *"Narrower degrees
mean smaller cohorts and fewer exits if you change your mind."* That claim is currently being
made about Bachelor of Science. A default that means "not assessed" is being read as a
judgement, and the judgement is then stated to the reader as a fact about the course.

**Fix, in this order:**

1. The absent value becomes `null`, not `'low'`, in both extractors and in
   `pipeline/diff.js:207`. `null` means unassessed and is never displayed as anything.
2. Derive familiarity from something measurable instead of guessing per course: **how many of
   the six universities offer a degree of that name.** Bachelor of Science appears at all six;
   Bachelor of Wildlife Conservation (Taronga) appears once. That is computable from the
   catalogue, defensible, and re-derives itself on every refresh. It is a Tier C judgement —
   label it as one, and per rule 6 it can never produce a HARD_GAP, which it does not, since it
   is not a band.
3. The unfamiliar cut then runs on the derived value, and its lede stops making a claim about
   cohort size it cannot support. Say what is true and computed: this name appears at one of
   six universities. Let the reader draw the inference.
4. A test asserts no course reaches the page with a hardcoded `'low'` that no extractor
   assessed — and that the unfamiliar cut is a minority of the catalogue, not 94% of it.

## 3.5 Scope — do not draft 130

Once `nameRecognition` is derived, scope discovery to the genuinely uncommon names. Count them
and report the number **before** drafting anything.

Review is the bottleneck, not drafting. Build the review path — a way to read an entry beside
the course's quoted rules and flip `reviewed` — before drafting in bulk. Drafting 130 entries
nobody can review produces nothing shippable.

## 3.6 Acceptance

- [ ] `nameRecognition` is `null` where unassessed and derived where shown; the unfamiliar cut
      is a minority of the catalogue
- [ ] The unfamiliar lede claims nothing about cohort size that the data cannot support
- [ ] An entry containing "requires a strong maths background" fails the build — **verify by
      adding one**
- [ ] An entry naming a non-existent neighbour fails the build — verify the same way
- [ ] `reviewed: false` entries appear nowhere in `dist/` — grep the built output
- [ ] Discovery prose is visually distinct from quoted rules; check a screenshot, not the CSS
- [ ] Every discovery block says who wrote it and that it is not a rule
- [ ] No runtime model call: `dist/` contains no API endpoint or key

---

# 4. Compare two subject sets

## 4.1 What exists

`engine/readiness.js` exports `subjectChangeImpact(profileBefore, profileAfter, courses, ctx)`,
which already runs the engine twice and diffs. The engine work is largely done; this is a
second results view and a hash format.

## 4.2 The honest default

In NSW most subject swaps change nothing. A comparison UI that leads with differences
manufactures a decision where there is not one — which is this product's own thesis inverted
(decision 1: *"what does this cost me"*, not *"which is better"*).

So the view leads with the count that is **unchanged**, in the largest type on the page:

> **112 of 130 courses are the same either way.** Here is what the other 18 are.

Then, and only then, what opens and what closes.

## 4.3 Rules

- **Two-directional.** Set A opens some things, set B opens others. Show both columns. Never a
  single "better" verdict, never a score, never a winner.
- **Reasons, not counts.** Every differing course shows the finding and its quote, exactly as
  the main results page does. A bare "18 courses worse" is not usable in a careers meeting.
- **Both sets get the ATAR pattern check.** A swap can break the pattern of study — 10 units,
  2 units English, three courses of 2+ units, four subject areas. `validateAtarPattern` already
  exists. A set that fails the pattern is not comparable on courses; say that first.
- **Restricted courses are excluded from both sides**, consistent with error 16. They are not
  something either set opens.
- **Incomplete records stay incomplete on both sides.** A course whose record could not be
  fully read must not appear as a difference; it is unknown in both.

## 4.4 Hash format

Existing links are pasted by careers advisers and must keep working. Keep today's parameters
as set A exactly as they are, and add set B under prefixed keys (`by`, `bm`, `be`, `bs`, `bt`,
`bo`, `bb`). A hash with no `b*` keys is a normal single-set result — that is the compatibility
test, and it goes in `test/hash.test.js` beside the existing round-trip tests.

## 4.5 Print

The comparison prints. Same rule as `docs/UI-BUILD.md` §5.8 as amended: at most two pages, the
unchanged count and the reasons always survive the collapse. Add the compare view to the
profiles in `test/print.test.js`.

## 4.6 Acceptance

- [ ] Two identical sets → *"130 of 130 are the same either way"* and no difference list
- [ ] An old single-set link still resolves to a normal result — round-trip test
- [ ] Every differing course shows a reason and a quote, not just a colour
- [ ] A swap that breaks the ATAR pattern says so before it says anything about courses
- [ ] Prints to at most two pages with the unchanged count intact

---

# 5. How to verify, for all four

This project has been wrong sixteen times. Every one of the last five was found the same way,
and none of them by the test suite alone.

1. `npm test` — expect the suite green. It is 87 passing and 1 skipped before this work.
2. `git diff` **the guards specifically**. The failure mode is not a broken feature, it is a
   weakened check. Error 8 was a new code path that built its own finding and bypassed the
   evidence-tier cap that the rest of the function enforced. A rule enforced at one point in a
   function is not enforced in the function.
3. **Break each new guard on purpose and watch it fail.** A guard that has never failed has not
   been tested; it has been written. Every acceptance box above that says *verify by adding one*
   means exactly that.
4. **Open it in a browser.** Errors 12, 13, 14 and 16 were all visible within thirty seconds of
   looking at the page while 75+ tests were green. Tests check what you thought to assert.
5. **Print it.** §5.8 was reviewed and approved as CSS and came out at six pages the first time
   anyone rendered it (error 15).
6. Report what you did **not** check, by name. The last deploy report did this and it is why
   error 16 was found: three checks were listed as written-but-not-verified, and running them
   turned up two courses being shown as open that are not.

## What would make each of these wrong rather than merely unfinished

- **Dark** — a printed sheet that comes out dark; a focus ring invisible on the dark ground.
- **Early entry** — any wording a reader could take as "you qualify"; a deadline shown without
  its quote and date.
- **Discovery** — one requirement sentence in drafted prose, next to a quoted rule saying the
  opposite; unreviewed prose shipping; a placeholder value still being read as a judgement.
- **Compare** — a "better" verdict; a difference count with no reasons behind it.

Each of those is worse than not shipping the feature.
