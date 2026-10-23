# Adviser review pack

Live pack: https://claude.ai/artifact/LEgqAZbNAcnB7C7gqjDHcM (updated 23 Oct 2026 — adds D6, who may apply)
Source: kept with the session that produced it; regenerate from this spec if it needs rebuilding.

## What it is for

The one error class nothing in this repo can catch: **a rule quoted correctly, filed under the
right heading, complete — and still understood wrongly.** `pipeline/quote.js` proves a phrase is
real. `pipeline/completeness.js` proves nothing stated was dropped. `pipeline/audit.js` proves it
sat under the right heading. None of them know what the rule *means* to a student.

## Design decisions worth keeping if it is rebuilt

- **Claims, not records.** An adviser reading `assumedKnowledge: ["Physics"]` nods. An adviser
  reading *"a student without Physics can still be admitted, they'll be advised to take a $380
  bridging course"* reacts. Show conclusions, because the error lives in the interpretation.
- **Grouped by rule, not by course.** 130 courses is unreviewable; the distinct rules number about
  a dozen. Nineteen items, twenty minutes.
- **Lead with our own errors.** The pack opens with the two mistakes already caught — Biomedical
  Engineering's Biology (recommended read as assumed) and Macquarie's "Assumed knowledge: None"
  (recommended read as assumed, inventing a requirement). It calibrates what we are asking for
  and it earns the right to ask.
- **Every claim carries its verbatim quote and source**, so a disagreement can be settled rather
  than argued.
- **Part E is free text and is the most valuable section.** Especially E3: *what matters more than
  subject choice that we do not ask about at all?* We already suspect the answer is early entry
  and scaling. We want to hear it from someone who does this for a living.
- **No server.** Answers live in `localStorage`; the pack builds a plain-text summary to paste
  into an email. Same privacy posture as the product, and it works offline and prints.

## Structure

| Part | Items | What it tests |
|---|---|---|
| A | 3 | The foundation — no prerequisites except Sydney's, and Sydney's is a mark |
| B | 4 | The conclusions we hand to families |
| C | 5 | Specific rules, including the two we previously got wrong |
| D | 2 | Vocabulary — the words families actually hear |
| E | 5 | Open questions no published source can settle |

## Who to send it to

A careers adviser at a selective or high-ATAR comprehensive school, ideally one who runs
structured Year 11 subject-confirmation meetings. One is enough to start; the value is in the
first disagreement, not in the sample size.

## What to do with the response

Anything marked **wrong** goes into `CHANGELOG.md` as a numbered error with cause and prevention,
same as the twenty already there. Anything in **E3** that names a lever we do not model is a
scope decision, not a bug — record it under *Open questions* and decide it deliberately.

---

# Revision — scoped, layered, four-way

The first draft would have manufactured the error it was built to catch. Three changes:

## 1. Part A is scoped, not global

"No prerequisites except Sydney's" is false as a statement about NSW — ACU and others carry real
course prerequisites, and Macquarie's own wording is *"degrees don't have entry prerequisites,
however some degrees have subject prerequisites."* Every Part A claim now reads **"among the
courses we model at X"**, names the surviving course list, and carries the year.

## 2. Every claim declares which layer it lives in

The two errors already caught were the same collapse: **recommended → assumed → required**. A key
sits at the top of the pack and every claim is tagged with its row:

| Layer | Blocks the offer? | First year assumes it? | Can bridging stand in? |
|---|---|---|---|
| Course prerequisite | Yes | Yes | Sometimes — Sydney publishes a maths route; UNSW has no such mechanism |
| Assumed knowledge | No | Yes | A short course, explicitly not two years of HSC |
| Recommended studies | No | No | Irrelevant to admission |
| Unit-level gate | No, not for the degree | Yes, for that unit | Sometimes a first-year unit instead |

A claim filed in the wrong row is the finding, even when the quote is right. The fourth row is
there because Biomedical Engineering's Biology probably lives at unit level, which we do not model.

## 3. Four marks, not two

**Correct · Wrong · True but misleading · Don't know / outside my schools.**

"True but misleading" is the mark we actually want. *"UNSW lists Extension 1 as assumed knowledge,
so a student can drop it and still get in"* is true and is bad advice at a selective school, where
dropping it costs scaling, adjustment points and first-year survival at once. An adviser who can
only tick Wrong will either over-correct or let it through. "Don't know" exists so silence is not
read as assent.

Every Part B item also carries **"What would you say instead, in the meeting?"** — that sentence
is worth more than the tick above it.

## Also changed

- **Order is by blast radius**: known errors → A → B (the product) → C (vocabulary) → D (specific
  rules, including both repairs) → E. Cut D if time runs short. Never cut B or E3.
- **B1 carries UAC's own non-equalisation wording** so the bridging claim cannot be read as
  "take the $380 course and you're fine".
- **The two repairs are explicitly flagged for regression** — is the fix now the sentence you'd
  say? Regression on a known error is the cheapest possible failure.
- **E3 is widened and unleading**, with a tick-list that only opens if the reviewer stalls.
- Every quote is date-stamped. No third-party ATAR explainers are cited anywhere — collapsing
  assumed knowledge into prerequisites is their business model and it is the exact error being hunted.

## Severity rule — decide before the reply arrives

| Mark | Action |
|---|---|
| Wrong on A1–A3 | Stop. Do not ship the affected family-facing sentence. Changelog entry with cause and prevention. |
| Wrong on a Part B conclusion | Same — that sentence *is* the product. |
| Wrong on a Part D specific rule | Changelog. Fix it, then grep for the same collapse elsewhere. |
| True but misleading | Not automatically a bug. Decide whether the sentence needs a qualifier. |
| E3 names a lever we don't model | Open question and a scope decision. Not error fifteen. |

**"The quote was correct" is not a defence.** That defence has already failed twice.

## Preflight before sending

- Re-check the $380 figure and the bridging window (UNSW Physics runs once a year, pre-Term 1).
  A stale price is an easy "wrong" that teaches nothing.
- Print it yourself. If a claim's quote and source are not on the same page as the claim, the
  adviser will not use them.
- Send `COVER-NOTE.md` with it. The ask is one sentence and it should stay one sentence.

## One open disagreement, deliberately left in

The reviewer's draft asserted *"Sydney's bridging courses do not satisfy the prerequisite; they
address assumed knowledge only."* We think that is wrong: Sydney publishes the *Introduction to
Calculus* MOOC plus examination as a genuine prerequisite-satisfying route, which is a different
mechanism from UNSW's assumed-knowledge bridging. Rather than pick a side we made it **claim A3**
and flagged it as the one we are least confident of. If the adviser marks it wrong, we learn
something either way.

---

# Update — 23 Oct 2026

Errors 16 and 18 were on an axis the pack did not test: **who may apply at all**, not which
subjects. Added a second warning note ("A second shape — who is allowed to apply") and item
**D6**, the two computing/data degrees no school leaver can start, with the Western Sydney
quote. Twenty items now (15 claims + 5 open questions). The readiness claims themselves are
unchanged: the course data has not been re-captured since 28 Aug 2026.
