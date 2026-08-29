# PathtoUni — build brief

A public NSW STEM **readiness and discovery** planner. A student enters their HSC subjects;
the tool returns which STEM degrees they are genuinely prepared for across six universities,
what any gap actually costs, and which degrees they had never heard of.

## The one thing to understand first

NSW universities have **almost no subject prerequisites**. The University of Sydney is the only
one of the six with any, and only for Engineering (Honours), Advanced Computing and Pharmacy —
and that rule is about a **mark**, not a subject. Everything else is "assumed knowledge", which
does not block admission.

So this is **not** an eligibility checker. Nearly everything is open. The product answers
*"what does this choice cost me?"*, never *"can I get in?"*. Read `docs/RULES-NSW.md` before
writing anything that touches a rule.

## Build commands

```
npm test        # node --test test/*.test.js — 22 tests, all must stay green
```

No dependencies. Node >= 20, ES modules, plain JavaScript. Keep it that way for the engine.

## What is already done — do not rewrite

- `engine/units.js` — NESA pattern-of-study and unit arithmetic
- `engine/readiness.js` — the readiness engine (the five bands, gates, evidence tiers)
- `engine/index.js` — catalogue loading, cross-university contrast detection
- `data/subjects.json` — NESA subjects and the unit rules
- `data/courses/*.json` — verified course records for UNSW and USYD; institution rules for all six
- `data/early-entry.json` — non-ATAR admission schemes
- `test/*.test.js` — every test encodes a verified fact. **If a test fails, the code is wrong, not the test.**

## What to build, in order

1. **The refresh pipeline** (`pipeline/`) — see `docs/PIPELINE.md`. Start with the University of
   Sydney's published prerequisites table; it yields more verified rows per fetch than any other source.
2. **Fill the catalogue** — UTS, Macquarie, Western Sydney, Wollongong have institution rules
   captured but no courses yet. Populate via the pipeline, never by hand.
3. **The web UI** — build it from `docs/UI-BUILD.md`, which is the full specification.
   `ui/prototype.html` is a working interaction reference; where it and the guide disagree, the guide wins.
   (old note) — subject picker, live results, printable one-pager. Static site, no accounts.
4. **Discovery layer** — the "you probably haven't heard of these" cut, course descriptions,
   nearest-neighbour comparisons, QILT outcomes.

## Deploying

`docs/DEPLOY.md` — blocking pre-launch fixes first (per-page meta, sitemap, noindex on
/results, link previews, self-hosted fonts, a way to report a wrong rule), then the GitHub
Pages workflow, then a live-URL verification list.

## Conventions

- **Never put a model call in the answer path.** The engine is deterministic: same subjects in,
  same result out. Models belong in the pipeline only.
- Every rule carries `quote`, `source` and `capturedOn`. A record without them is `unverified`
  and must be treated as absent, never as true.
- Never let an `unverified` record overwrite a `verified` one. Degrade to stale-with-a-date, not to wrong.
- Do not hardcode unit counts per subject. Unit values are context-dependent — Extension 1 is
  1 unit with Mathematics Advanced and 2 units with Extension 2.
- Extra hurdles (UCAT, interview, portfolio) are a flag, never a band.
- Never predict an ATAR or an offer.
- **Every commit adds a `CHANGELOG.md` entry.** Not a file list — say what became true that was
  not true before. If the commit reverses an earlier decision, update the decision log too, and
  add to *Errors caught* if something was actually wrong rather than merely superseded.
