# The refresh pipeline — spec

Nothing hardcoded, nothing hallucinated. The model reads; deterministic code answers.

## Stages

1. **Render, don't fetch.** Course pages load content by script after the page arrives, so a plain
   HTTP GET often returns an empty shell. Use a headless browser and store the raw capture under
   `captures/` (gitignored). You need the capture to prove what the page said.
2. **Extract with forced quotation.** The model emits a structured record. Every field must include
   a verbatim substring of the capture. **Verify by string-matching in code.** No match, the field
   is `unverified` — never guessed, never silently dropped.
3. **Diff against last known good.** No change, no action. A change stops the pipeline and flags it.
   This is the early warning that a university altered a rule mid-cycle.
4. **Second-model check on diffs only.** Re-extract changed fields independently from the same
   capture. Agreement promotes to `verified`; disagreement marks `conflict` for human review.
5. **Discovery prose on a separate cadence.** Regenerated only when course structure changes, and
   always human-reviewed before publish. Never rewritten by a readiness refresh.
6. **Serve deterministically.** The app reads the committed JSON. No model call in the request path.

## Start here

The University of Sydney publishes prerequisites, assumed knowledge and recommended studies for its
whole catalogue as one structured document. It is the highest-yield source in the state and it is a
stable published artefact rather than a marketing page. Build the extractor against it first, then
generalise to per-course pages for the other five.

## Going public — obligations

- Paraphrase rules, quote sparingly, always deep-link. Handbook text is university copyright.
- Respect robots.txt, rate-limit, identify the crawler, cache hard. Each page is needed about twice a year.
- Store nothing about students. No accounts, no saved profiles, no analytics that could identify a minor.
- Disclaimer on every results view and every export: not UAC, not a university, rules as at the date
  shown, confirm before you apply.
