# Try it before you choose — verification record

Started from Ajay's list (`Internship/Year12_STEM_Opportunities_By_Field_2027.xlsx`, drafted with
ChatGPT on 23 Oct 2026, about 50 rows). That folder is personal and is not committed
(`.gitignore`); the cleaned tracker sits beside the original as
`Year12_STEM_Opportunities_Checked_2026-10-23.xlsx`.

## How each entry was checked (23 Oct 2026)

Each program's own page was opened in the desktop browser. Every quote in
`data/opportunities.json` was then checked **by code**: `document.body.textContent` and
`innerText`, whitespace collapsed, then `includes(quote)`. **31 of 31 matched** across 13 pages.
textContent is used as well as innerText because two pages keep their answers in closed
accordions (the University of Sydney fellowship FAQ, NYSF).

## What the list got wrong

- **Mount Stromlo** runs "Weekdays during teaching periods" — the list said school holidays.
- **CSIRO's virtual work experience pages** now return "page not found". No current CSIRO
  program was found; dropped.
- **About 20 rows were guesses** — company home pages (Garvan, Cochlear, ResMed, CSL, ABB,
  university "outreach") with "verify". No school program found on any of them; dropped.
  School-arranged work experience is the route to those, and the page says so.
- **About 17 rows were after school or at university** — kept in the personal tracker, not
  on the site.
- **Azure for Students** — the page does not state its age rule, so it is not listed.
  AWS Educate (13+, stated on the page) is.
- **Missing from the list:** NYSF Year 12 Program, the Australian Museum work experience
  program, the University of Sydney Computer Science High School Fellowship and Project
  Management Spring Camp, and the Australian Informatics Olympiad.

## One conflict, shown rather than resolved

The University of Sydney's Computer Science High School Fellowship: the program's own FAQ
describes an August–November session (2025); the Engineering faculty page says "an intensive
program across December-January". Both are quoted and the entry says the pages disagree.

## Rules for adding an entry

1. The provider's own page must say school students can take part. A company that "might"
   take a student is not an entry.
2. Quote who can apply, when, and cost where stated; record the page and the date.
3. Re-run the code check above before shipping. The build refuses an entry with no quote, a
   quote from a page it does not cite, an unverified entry, or an unknown topic.
4. Entries older than `stalenessDays` (365) are shown with "may be out of date".
