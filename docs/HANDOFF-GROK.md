# Handoff — deploy the restriction fix

Two commits are on local `master` and are **not pushed**. This shell has no GitHub
credentials, so the live site at `https://ibn-battuta.github.io/PathtoUni/` is still serving
the version with the defect below.

```
d64d2a0  The restriction on the course pages too, and out of the search snippet
dca3711  Print pass: two courses were shown as open when they are not
```

## Why this one should not wait

Sydney's **Bachelor of Science (Extended)** and **Bachelor of Science (Extended) (Health)** are
open only to Aboriginal and Torres Strait Islander students. The published site lists both as
courses the student is ready for, with nothing said about it — on the results page and on the
two `/course/` pages, which are the pages search engines index. It is the one error shape this
project exists to prevent, pointing the other way: a door shown open that is shut.

## Deploy

1. `npm test` — expect **87 passing, 1 skipped**. The skip is `test/print.test.js`, which needs
   a browser; it skips loudly rather than passing quietly. Run it where Playwright exists and
   expect all five profiles at 1–2 pages.
2. `npm run build:site`
3. Push `master`, then publish `dist/` to `gh-pages` the same way as last time.

`.github/workflows/deploy.yml` still cannot be pushed — the PAT lacks the `workflow` scope.
Either add that scope or keep publishing `gh-pages` directly; do not let the missing workflow
hold up this push.

## Then verify on the live URL, by opening it

Not by reading the CSS. Both defects fixed here passed review as source and failed as output.

- `https://ibn-battuta.github.io/PathtoUni/course/usyd-science-extended/` — "Who can apply"
  appears **above** "Assumed knowledge", and view-source shows `open only to` in the
  `<meta name="description">`
- `/results/#y=12&m=ext12&e=adv&s=phy,chem&o=1` — an "Open to some students only" section with
  two courses, each tagged `subjects fit` and not `ready now`
- Print that results page to PDF: 2 pages, sources present, no raw `situational_judgement`
- Search the built output for `situational_judgement` and `personal_statement`: zero hits in
  any HTML
