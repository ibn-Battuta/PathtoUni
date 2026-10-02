# Discovery review

Drafted prose is not a rule. Before `reviewed: true`:

1. Open the course page (or its source JSON) and read the quoted assumed knowledge.
2. Read `firstYear` and `notThis`. They must not restate or invent a subject requirement —
   the build will reject `/requir|prerequisite|assumed knowledge|you must have|…/`.
3. Neighbours are computed by `pipeline/discovery.js` from the catalogue. Do not type ids
   that do not exist.
4. Check every sentence against the page it cites, word by word — not against a summary of
   the page. Two of three first-batch misses came from summaries (Phase 23).
5. If a sentence names later-year topics (finance, risk, AI, systems design), those names must
   appear on the *current* unit table or subject list, not on an older overview paragraph.
6. `firstYear` may describe the whole degree only when the cited page has no first-year list,
   and the review sheet must say so.
7. `reviewedBy` is the person who read it. A model's check — Claude's or Grok's — is useful
   and is recorded in the review sheet, but it is not a review and never goes in this field.
   The page tells readers a person reviewed the description.
8. Set `"reviewed": true`, `"reviewedBy": "<name>"`, `"reviewedOn": "YYYY-MM-DD"`.

Unreviewed files can sit in `data/discovery/` without reaching the public site.
