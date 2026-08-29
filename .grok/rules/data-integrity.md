# Data integrity — non-negotiable

These rules exist because a wrong prerequisite closes a door that was actually open, and a real
family makes a real decision on it.

1. **Verbatim quotes, checked in code.** Every extracted rule must include a substring that
   appears literally in the captured page text. Verify it with a string match in code — never by
   asking a model whether it was honest. No match means the field is written `unverified`.
2. **Never overwrite verified with unverified.** The likeliest real failure is not hallucination;
   it is a site redesign breaking the capture, a model extracting from an error page, and a good
   record being replaced with nothing.
3. **No model in the answer path.** Ever. Extraction and prose drafting only.
4. **Show the capture date in the UI.** Always. It is a trust signal when recent and an honest
   warning when it is not.
5. **Two content types, two regimes.** Readiness data: structured, extracted, code-verified.
   Discovery prose: drafted by a model, reviewed by a human, regenerated rarely.
6. **Evidence tiers.** A = published rule. B = research-backed (maths). C = judgement
   (physics, chemistry). A Tier C claim may never produce a HARD_GAP on its own.

7. **Completeness, not just verbatimness.** A quote-match proves a quote is real; it does
   not prove the extraction is whole. Before storing a record, audit it against the capture
   with `pipeline/completeness.js`: if the source states an assumed subject or a band that
   the parsed record does not carry, the record is `incomplete`. The engine treats incomplete
   as unknown, never as "no requirements" — omission fails toward PREPARED, which is the
   reassuring direction and therefore the dangerous one.
