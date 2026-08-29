# Adviser review pack

Live pack: https://claude.ai/code/artifact/9bc6d994-97a7-4da7-99b2-e99ec4a92082
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
same as the fourteen already there. Anything in **E3** that names a lever we do not model is a
scope decision, not a bug — record it under *Open questions* and decide it deliberately.
