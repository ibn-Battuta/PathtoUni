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

## For Ajay to review

These are judgement, and a person has not read them yet:

- [ ] **Topic rules** in `ui/topics.js` — does each degree land in sensible areas? Run the
      quiz and the industries page and look for a degree in the wrong place.
- [ ] **Industry → topics** in `data/industries.json` — e.g. quantum → maths, electronics,
      computing.
- [ ] **The ten quiz questions** — would a 16-year-old understand each one?
- [ ] **Industry names** — plain enough without a description?

Mark wrong items as a CHANGELOG error entry, like the eighteen already there.
