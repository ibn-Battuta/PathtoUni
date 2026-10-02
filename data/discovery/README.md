# Discovery entries

One JSON file per course, named `<course-id>.json`. Schema is in `docs/MANIFEST-V2.md` §3.3.

`reviewed: false` never ships. The build excludes unreviewed files from `dist/` entirely.
A requirement-claim regex on `firstYear` / `notThis` fails the build. Neighbour ids that
are not in the catalogue fail the build.

Review path: read the entry next to the course page's quoted assumed knowledge, then set
`reviewed`, `reviewedBy` and `reviewedOn`. Do not draft 130 entries ahead of review.
See `docs/review/discovery.md`.
