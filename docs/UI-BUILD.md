# UI build guide

Read `AGENTS.md`, `docs/RULES-NSW.md` and `CHANGELOG.md` first. This document specifies the
website only. `ui/prototype.html` is a working single-page reference — open it, click it, then
build the production version described here. Where the two disagree, this document wins.

---

## 0. What you are building

A static, client-side site that takes a student's HSC subjects and returns the NSW STEM degrees
they are prepared for, what any gap costs, and which degrees they had never heard of.

**Two pages, not one.** Subject selection is its own page. Results are their own page.

Why the split, given the original spec demanded live recalculation with no submit button:

- Results become a **link**. A careers adviser can send one to a family; a parent can bookmark
  one and come back in three months. A single-page tool has nothing to send.
- The results page gets the whole screen. There are 130 courses and five bands to communicate;
  sharing the viewport with a picker is what forced the prototype's cramped rows.
- Selection is a calm, one-thing-at-a-time task. Results are a dense scan. They want opposite
  layouts and it is a mistake to average them.

Live recalculation is **not** lost — see §3. The results page carries an editable subject strip.

---

## 1. Non-negotiable

1. **No model call anywhere in the site.** The engine is deterministic. Same subjects in, same
   answer out. Models belong in `pipeline/` only.
2. **No accounts, no analytics that could identify a minor, no server.** Static hosting only.
3. **Never lead with green.** For a realistic profile the engine returns ~110 of 130 PREPARED.
   An 85% green list is wallpaper. Exceptions first, always. See §5.
4. **Every claim shows its quote, its source link and its capture date.** A rule the user cannot
   click through to is a rule they cannot check.
5. **Incomplete records are shown as needing attention, never as prepared.** `result.complete`
   is false → say so on the card.
6. **Extra hurdles (UCAT, interview, portfolio) are a flag, never a band.**
7. Never predict an ATAR or an offer.

---

## 2. Routes

```
/                       Landing + subject selection      (the front door)
/results                Readiness results                (state in the URL hash)
/course/<id>            One course, pre-rendered         (130 pages, SEO)
/guides/prerequisites   Plain-English explainer          (SEO)
/guides/assumed-knowledge
/guides/dropping-a-subject
/about                  Who built this, sources, dates, disclaimer
```

Pre-render `/course/<id>` and the guides at build time from `data/courses/*.json`. Those pages are
how a family who has never heard of this site finds it — searches like *"do you need physics for
engineering nsw"* land there, not on the planner.

---

## 3. URL state — the mechanism that makes two pages work

Encode the subject set in the **hash fragment**, never the query string.

```
/results#y=12&m=ext12&e=adv&s=phy,chem&t=engstud&o=1&b=ext1:E3
```

| key | meaning | values |
|---|---|---|
| `y` | year | `11` `12` |
| `m` | maths pathway | `std1` `std2` `adv` `ext1` `ext12` |
| `e` | english | `std` `adv` `eald` |
| `s` | sciences | csv of `phy` `chem` `bio` `earth` `invsci` |
| `t` | technology | csv of `engstud` `softeng` `entcomp` `dt` |
| `o` | other 2-unit subjects | integer 0–4 |
| `b` | expected band | `ext1:E3`, `adv:5` — omit when unanswered |

**Use the hash, and say why in a code comment.** A query string is transmitted to the server on
every request and lands in access logs. A hash fragment is never sent. That is the difference
between "we promise not to store your subjects" and "your subjects were never sent anywhere" —
and the second is the claim the About page makes. Do not weaken it for convenience.

The results page re-parses the hash on `hashchange` and re-renders. The editable subject strip
(§5.1) mutates the hash, so **live recalculation survives the split**: editing subjects on the
results page updates instantly and the URL stays shareable.

---

## 4. Page 1 — `/` subject selection

One question at a time on mobile; all questions visible on desktop. This is the "both, dense
default" decision: the desktop layout shows every group at once, the mobile layout is a stepped
flow with a progress indicator.

**Order — and it matters.** Maths first, because it moves more bands than everything else
combined and it is the only thing in NSW that gates.

1. **Year** — 11 or 12. Year 11 disables Extension 2 with the reason shown, not just greyed.
2. **Which mathematics?** Single choice, five options, mutually exclusive.
3. **English** — single choice, three options.
4. **Sciences** — multi-select, five options.
5. **Technology** — multi-select, four options.
6. **Anything else** — a stepper for the count of other 2-unit subjects. Label it
   *"no effect on STEM readiness — only counted for your ATAR pattern"* or a parent will assume
   the tool is broken when History changes nothing.

**Do not ask for the maths band here.** It is asked on the results page, and only once a gated
course is actually in the results. Most students never see the question.

Show a running **units and subject-areas counter** with a live ATAR-pattern verdict. It must
name the specific violation, not just "invalid" — e.g. *"An ATAR needs at least 10 units. You
have 9."* This has already changed a real answer twice.

Primary action: **See what's open to you** → `/results#...`

---

## 5. Page 2 — `/results`

### 5.1 Subject strip (top, sticky)

The chosen subjects as compact chips, plus **Edit subjects** which opens the picker inline
(not a navigation). Editing rewrites the hash and re-renders live. Include a **Copy link**
button — this is what a careers adviser sends.

### 5.2 The honest opening line

Before any counts, one paragraph, because it teaches the central fact of the whole product:

> Most of what follows is open to you. That is the normal answer in New South Wales —
> universities publish *assumed knowledge* rather than hard prerequisites, so subjects rarely
> stop you being admitted. What matters is the short list that is not open, and why.

### 5.3 Counts

One tile per non-empty band, with the band's colour as a top rule. Big tabular numerals.
Plain labels, not enum names: *ready now · small gap · bridging course · hard gap · blocked*.

### 5.4 What needs attention — **first, always**

Every course not PREPARED. Lead with a single sentence totalling the causes:

> Every gap on your list comes down to: Biology (18), Software Engineering (2).

Then one card per course: name, university, band tag, and the reason in plain words. Where a
bridging course exists, name its cost and when it runs. Where the record is incomplete, say
*"we could not fully read this university's page"* — never imply it is clear.

### 5.5 If you dropped one

Run the engine across the whole catalogue once per currently-held subject and show the delta:
*nothing changes* or *N courses worse*, plus *ATAR pattern fails* where the unit count breaks.
This is View B and it is the question Year 11 actually has to answer.

### 5.6 Open to you, and probably unfamiliar

Courses in PREPARED with low name recognition. Use the `nameRecognition` field from the pipeline
— **do not** ship the prototype's name-matching heuristic. If the field is missing, omit the
section rather than guessing.

Add the honest caveat: narrower degrees mean smaller cohorts and fewer exits if you change your
mind.

### 5.7 Everything else

Folded `<details>`, grouped by university. Present, browsable, quiet.

### 5.8 Print

`@media print`: subject strip, counts, attention list, and a footer carrying every source URL
and the capture date. One page of A4. No navigation, no folded sections expanded.

---

## 6. `/course/<id>` — pre-rendered

Static page per course. Name, university, field. Assumed knowledge with **each quote shown
verbatim**, its source link and capture date. Recommended studies, clearly separated — the
distinction between assumed and recommended is one of the two errors this project has made
twice, so the page must make it visually unmissable. Gates with the full rule text. Hurdles.

Add *"Am I prepared for this?"* linking to `/results#...` prefilled where a subject set exists
in the hash already.

---

## 7. Design tokens

Carry the house style already used across the project docs and the prototype. Do not invent a
new palette.

- Body/UI **Public Sans**, data and labels **IBM Plex Mono**, one display face **Newsreader**
  used only for page titles.
- Neutrals are cool blue-greys, not pure greys. Ground `#EEF2F6` light, `#0C1119` dark.
- Accent `#2F5183` light / `#8DB0E4` dark.
- Band colours are semantic and separate from the accent: prepared `#1F6349`, small gap
  `#2F5183`, bridging `#9B6206`, hard gap `#8A4114`, blocked `#9E2F27` (dark-mode variants in
  `ui/prototype.template.html`).
- Full light/dark token blocks: copy the `:root` / `prefers-color-scheme` / `[data-theme]`
  structure from the prototype verbatim. Never declare a colour only inside a media block.

---

## 8. Accessibility

WCAG 2.2 AA target. Band state must be carried by **text as well as colour** — the tag reads
"bridging course", not just amber. Visible focus rings on every control. The picker is
keyboard-operable end to end. `aria-live="polite"` on the results region. Respect
`prefers-reduced-motion`.

---

## 9. Build and deploy

No framework, no bundler. `ui/build.js` already demonstrates the pattern: inline the real engine
source with its import lines stripped, so the site runs the exact code the tests exercise.
Extend it to emit the full static site into `dist/`.

Deploy target: GitHub Pages from this repo, or Cloudflare Pages. Both are static and free.

Add `npm run build:site` and keep `npm test` green.

---

## 10. Traps

- **The green wall.** If your first screen shows 110 green rows, you have built the wrong thing.
- **Averaging the two audiences.** The adviser wants density; the parent wants one question at a
  time. Build both layouts; do not compromise into a third that suits neither.
- **Reintroducing "prerequisite" as a word.** Parents read it as a gate. The vocabulary is
  *ready now / small gap / bridging course / hard gap / blocked*.
- **Query string instead of hash.** Silently breaks the privacy claim.
- **Letting recommended studies read like assumed knowledge.** Twice-made error. See §6.
- **Showing a reason-free pass.** `result.satisfiedBy` exists so a non-obvious pass can explain
  itself. Render it.

---

## 11. Acceptance checklist

- [ ] A results URL pasted into a fresh browser reproduces the same answer exactly
- [ ] Nothing is transmitted on load beyond static assets — verify in the network tab
- [ ] The band question appears only when a gated course is in the results
- [ ] Dropping History reports *nothing changes*; dropping Physics reports courses worse
- [ ] With Extension 2 selected, dropping both History and Engineering Studies stays valid at
      exactly 10 units and 4 subject areas; without it, the pattern fails
- [ ] Every visible rule has a working source link and a capture date
- [ ] Incomplete records never render as prepared
- [ ] Print produces one A4 page carrying sources and the date
- [ ] Keyboard-only pass through selection to results
- [ ] Legible in light and dark, and with the system setting unstamped
