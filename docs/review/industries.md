# Industries door — verification record and review sheet

## How the quotes were checked (2 Oct 2026)

Neither shell in this session could fetch government sites directly, so each source was
opened in the desktop browser and checked **by code**, not by reading:

- HTML pages: `document.body.innerText`, whitespace collapsed, then `includes(quote)`.
- PDFs (White House FY2027 R&D memo; UK Digital and Technologies Sector Plan): text
  extracted with pdf.js 4.4.168, whitespace collapsed, then `includes(quote)`.

Result: **35 of 35 quotes matched** across 14 sources. No capture file was saved — the
check was against the live page on that date. Re-run the same check before trusting the
page after `stalenessDays` (365).

| Source | Quotes | Matched |
|---|---|---|
| au-nrf-priority | 4 (incl. lead) | 4 |
| au-nrf-enabling | 9 (incl. lead) | 9 |
| us-rd-fy27 (PDF) | 7 | 7 |
| eu-step | 4 | 4 |
| uk-digital (PDF) | 1 | 1 |
| uk-clean | 1 | 1 |
| uk-advmfg | 1 | 1 |
| cn-15fyp | 1 | 1 |
| cn-aiplus | 1 | 1 |
| in-nqm, in-ai, in-ism, in-ncmm, in-gh2 | 1 each | 5 |

Choices worth knowing:
- **US** uses the current Administration's FY2027 R&D priorities memo, not the 2024
  Critical and Emerging Technologies list, which belongs to the previous Administration.
- **EU** uses STEP (where money goes), not the 2023 critical-technology recommendation
  (which is about security risk, not investment).
- **China** uses the State Council's English report of the 15th Five-Year Plan
  recommendations (Oct 2025) and the AI Plus guideline (Aug 2025).
- **India** uses one mission per area (AI, quantum, semiconductors, critical minerals,
  green hydrogen).

## Japan and South Korea — added 23 Oct 2026

Checked the same way, in the desktop browser, by code:

| Source | Kind | Quotes | Matched |
|---|---|---|---|
| jp-growth — Cabinet Secretariat, *Japan's Growth Strategy* (21 Jul 2026, provisional translation) | PDF, 108 pages, pdf.js 4.4.168 | 8 | 8 |
| kr-msit-2027 — Ministry of Science and ICT, 2027 budget press release (16 Sep 2026) | HTML, `innerText` | 7 | 7 |

- **Japan's PDF text layer splits words** ("s emiconductors", "h ydrogen"). Collapsing
  whitespace is not enough there, so for this one source the check removed *all* whitespace
  from both the page text and the quote before `includes`. It still matches every other
  character exactly, including the curly apostrophe in "Japan’s". The page says so.
- **Japan** names 17 strategic fields with public–private investment roadmaps. It covers
  all nine of our areas — the only economy that does.
- **South Korea** uses the 2027 budget, which says where the money goes ("Three Megaprojects +
  AI" and "Seven SEED Projects"). It covers eight of nine: not critical minerals. Robotics is
  evidenced by "humanoids" in the K-Moonshot list, so `humanoid` was added to the robotics
  terms. That is the thinnest Korean quote; a stronger one would be welcome.
- The page text that lists the countries is now built from `data/industries.json`
  (`economyList`), so adding a country can no longer leave the page naming the old six.

Totals now: **16 sources across 8 economies; 15 quotes added, all matched.**

## Claude's check of the judgement items — 23 Oct 2026

Ajay asked Claude to do this review. A model's check is recorded, not counted as a review
(decision 25), so the boxes below stay for Ajay. What the check found:

- **Topic rules** — ran all 130 courses through `courseTopics`. No degree landed in a clearly
  wrong area. Judgement calls left as they are: Information Systems (Co-op) is tagged *Coding,
  software and AI* although its own description says it is not computer science; Biomedical
  Engineering gets only *Living things and biotech*, not electronics; Wildlife Conservation
  gets *Nature* but not *Living things*.
- **Quiz** — **error 20.** Building, cyber security and psychology were each offered once
  while robots and biology were offered three times, so those three could never come out on
  top against a topic picked twice. Three options rewritten so every topic is offered at least
  twice: *Help someone who feels anxious feel better* (mind, health), *Design a city that runs
  on wind and solar power* (energy, build), *Crack a secret code* (cyber, data). A test now
  checks that every topic can come out first.
- **Readability for a 16-year-old** — all ten pairs read plainly. No change beyond the three
  above.
- **Industry names** — eight are plain. "Critical minerals and resources" was not: renamed
  **"Minerals for batteries and electronics (critical minerals)"**, the same pattern as
  "Computer chips (semiconductors)".
- **Industry → topics** — sensible. Quantum → maths, electronics, coding is a stretch for what
  is mostly physics, but physics lives in the broad Science degrees, which the page lists in
  the fold.

## For Ajay to review

These are judgement, and a person has not read them yet:

- [ ] **Topic rules** in `ui/topics.js` — does each degree land in sensible areas? Run the
      quiz and the industries page and look for a degree in the wrong place.
- [ ] **Industry → topics** in `data/industries.json` — e.g. quantum → maths, electronics,
      computing.
- [ ] **The ten quiz questions** — would a 16-year-old understand each one?
- [ ] **Industry names** — plain enough without a description?

Mark wrong items as a CHANGELOG error entry, like the eighteen already there.
