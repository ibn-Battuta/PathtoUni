# Discovery review — batch 1 (drafted 25 Sep 2026)

Eight course descriptions for computing, maths and data degrees. Five are reviewed by Ajay Walia (25 Sep 2026) and ship on the next build. Three were revised; Grok checked the rewrites on 26 Sep and found them accurate. Claude re-checked them by code against the live pages on 23 Oct and found three things Grok's check had passed — two unsourced honours claims and a missing major (error 19) — now fixed. They still wait for Ajay to read them — a model's check is not a review (rule 7 in `discovery.md`). **About two minutes each:** read the entry, and if it is right, set the three `reviewed` fields.

**How to review each one** (see `discovery.md` for the full rule):

1. Open the source links and check each fact in the two paragraphs is there.
2. Check nothing reads like a subject rule ("you should have done Physics"). The build blocks the obvious wording, but not every way of saying it.
3. If it's right, open `data/discovery/<id>.json` and set `"reviewed": true`, `"reviewedBy": "Ajay Walia"`, `"reviewedOn": "YYYY-MM-DD"`. If it's wrong, edit the text or tell Claude what to change.

The `neighbours` list is not shown on the site yet. For `wsu-data-science` and `uow-mathematics` the computed neighbours are poor (Agricultural Science). See the note at the end.

---

## 1. Bachelor of Advanced Computer Science (Honours) — UNSW
`unsw-advanced-computer-science-honours`

**What it is like**

A four-year honours degree. First year is programming, computer systems and software engineering (COMP1511, COMP1521, COMP1531), with data structures and algorithms (COMP2521) already in the third term, alongside UNSW's higher-level maths (Higher Mathematics 1A and 1B) and discrete maths. Later you choose a major in Computer Science, Security Engineering or Artificial Intelligence, and the final year is a three-part research thesis.

**Not to be confused with**

Not a different field from UNSW's Bachelor of Computer Science. It is the same subject taken deeper: higher maths in first year, an extension course in algorithms and programming, and a research thesis built into year four.

Sources:
- https://www.unsw.edu.au/study/undergraduate/bachelor-of-advanced-computer-science-honours
- https://www.unsw.edu.au/content/dam/pdfs/engineering/general/course-progression/2026-progression-plans/term-1/3779/3779%20-%20Bachelor%20Advanced%20Computer%20Science%20(Honours)%20-%20Computer%20Science%20-%20COMPCH%20-%20T1%202026%20Start.pdf

- [x] Reviewed by Ajay Walia, 2026-09-25
## 2. Bachelor of Information Systems (Co-op) (Honours) — UNSW
`unsw-information-systems-co-op-honours`

**What it is like**

A four-year degree in UNSW's Business School. First year is seven introductory information-systems courses and one second-level course, covering how businesses use technology, programming and databases. Years two and three include three industry placements (about 18 months in total), year four is a supervised research thesis, and the co-op scholarship pays a yearly allowance for all four years.

**Not to be confused with**

Not computer science. The focus is how organisations use technology, such as enterprise systems and digital transformation, rather than building software from the ground up. It is also a separate application: as well as UAC, you apply to the UNSW Co-op Program itself, with a questionnaire and interview and a deadline around the end of September in Year 12. Check the current date with UNSW.

> **Check:** The scholarship amount and the application deadline were left out on purpose, because they change each year. The text tells the reader to check the date.

Sources:
- https://www.unsw.edu.au/study/undergraduate/bachelor-of-information-systems-co-op-honours

- [x] Reviewed by Ajay Walia, 2026-09-25
## 3. Bachelor of Advanced Computing — University of Sydney
`usyd-advanced-computing`

**What it is like**

First year covers the core of computing: programming (Introduction to Programming, then Object-Oriented Programming), computer systems, operating systems and networks, professional practice, foundations of data science, Mathematics 1A and discrete maths for computing. Several units have Advanced versions. You then major in computer science, cybersecurity, software development or computational data science, and can add a second major or minor from another area such as commerce, science or music.

**Not to be confused with**

Not the same as a Bachelor of Science with a computing major. This degree is run by the Engineering faculty as a professional computing degree: you can finish after three years with a Bachelor of Computing, or stay a fourth year for advanced professional and research work.

Sources:
- https://www.sydney.edu.au/content/handbooks/engineering/advanced-computing.html
- https://www.sydney.edu.au/handbooks/engineering/advanced-computing/unit-of-study-table.html

- [x] Reviewed by Ajay Walia, 2026-09-25
## 4. Bachelor of Mathematical Sciences — University of Sydney
`usyd-mathematical-sciences`

**What it is like**

First year is mostly mathematics and data: Mathematics 1A and 1B, discrete maths, foundations of data science and data computing, plus a unit on research and communication in the mathematical sciences. Most of these have Advanced versions. You then choose a major from Mathematics, Statistics, Financial Mathematics and Statistics, Data Science, Mathematical Modelling and Computation, or Discrete Mathematics and Algorithms, and add a minor or second major.

**Not to be confused with**

Not a general science degree. In a Bachelor of Science, maths is one choice among many sciences; here every major is mathematical, and the university describes the degree as a foundation for Honours. It takes three years.

Sources:
- https://www.sydney.edu.au/handbooks/science/coursework/mathematical-sciences/overview.html
- https://www.sydney.edu.au/handbooks/science/coursework/mathematical-sciences/course-resolutions.html
- https://www.sydney.edu.au/handbooks/science/coursework/mathematical-sciences/unit-of-study-table.html

- [x] Reviewed by Ajay Walia, 2026-09-25
## 5. Bachelor of Project Management — University of Sydney
`usyd-project-management`

**What it is like**

First year is six project-management units: an introduction to project management, project initiation and scope, project communication, time, cost and resources, systems thinking, and facilitation and stakeholder engagement. Later core units cover project acceptance, project analytics, critical thinking, executing projects, conflict management, reframing projects, innovation and the legal side of projects, with electives such as project finance, agile project management and scheduling. The degree takes three years.

**Not to be confused with**

Not an engineering degree, even though the Engineering faculty runs it. The core the university lists is about leading projects and people, not engineering maths or physics. Students who want both can take it combined with the Bachelor of Engineering Honours.

> **Revised 25 Sep: the later-units sentence used 2021–22 wording (risk, statistics, organisational behaviour). Rewritten against the live unit table, where Project Finance is an elective, not core. Ready for review.**

Sources:
- https://www.sydney.edu.au/content/handbooks/engineering/project-management.html
- https://www.sydney.edu.au/handbooks/engineering/project-management/project-management-table.html

- Grok check 26 Sep 2026: accurate.
- **Claude check 23 Oct 2026 (code, against the live pages):** every unit named is on the current table. Two things were missing and are now fixed: the handbook (amended Feb 2026) requires **a major** — Construction, Built Environment, or one from the shared pool — so the entry now says so, and "First year is six units" became "the first-level core is six units", since a major unit can sit in first year too. "Three years" is confirmed on the course page, now added as a source.
- [ ] Reviewed by Ajay
## 6. Bachelor of Computing Science — University of Technology Sydney
`uts-computing-science`

**What it is like**

A three-year degree. The core subjects include Programming 1 and 2, Discrete Mathematics, Mathematics 1, Web Systems, networks, databases and communication for IT professionals, building towards data structures and algorithms, theory of computing science, advanced algorithms and a final capstone project. It can also be taken through the UTS IDeA cadetship, where you work in industry while you study.

**Not to be confused with**

The listed core leans towards theory: discrete maths, theory of computing science and advanced algorithms, alongside programming, networks and databases. A separate four-year honours version exists for students who want research.

> **Revised 25 Sep: removed "the university describes the focus as algorithms, artificial intelligence and systems design". That phrase is not on the course page. Ready for review.**

Sources:
- https://www.uts.edu.au/courses/bachelor-of-computing-science

- Grok check 26 Sep 2026: accurate.
- **Claude check 23 Oct 2026:** all 14 subjects and facts found on the page by code. One gap (error 19): "a separate four-year honours version exists" is true but was **not on the cited page**. Confirmed on UTS's honours course page (4 years, research focus) and added it as a source. Text unchanged.
- [ ] Reviewed by Ajay
## 7. Bachelor of Data Science — Western Sydney University
`wsu-data-science`

**What it is like**

A three-year degree. The first semester is Scientific Literacy, Thinking About Data, Discrete Mathematics and Programming Fundamentals. Later study covers designing experiments, building statistical models, visualisation, machine learning and handling large data sets. You add either a major (Health Informatics or Technology Entrepreneurship), two minors, or one minor plus electives. The minors include Artificial Intelligence, Cybersecurity, Mathematics and Statistics.

**Not to be confused with**

Not the same as Western Sydney's Bachelor of Applied Data Science, which is a one-year add-on taken with another degree. This is the standalone three-year degree.

Sources:
- https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-data-science
- https://handbook.westernsydney.edu.au/2024-2025/programs/bachelor-data-science/bachelor-data-science.pdf

- [x] Reviewed by Ajay Walia, 2026-09-25
## 8. Bachelor of Mathematics — University of Wollongong
`uow-mathematics`

**What it is like**

A three-year degree with two majors: Mathematics (pure and applied) or Statistics and Data Science. The university describes the content as problem-solving, data analysis, probability and variability, modelling, logistics and logic, and you can add a second major, a minor or electives from other areas.

**Not to be confused with**

Not the same as UOW's Bachelor of Mathematics Advanced, a separate degree for high achievers that adds supervised research projects with academics. Both take three years, and each has an optional honours year.

> **Revised 25 Sep: removed "You can also start undecided", which is not on the cited pages, and used the page's own content list. It still describes the whole degree, not first year. Ready for review.**

Sources:
- https://www.uow.edu.au/study/courses/bachelor-of-mathematics/
- https://www.uow.edu.au/study/courses/bachelor-of-mathematics-advanced/

- Grok check 26 Sep 2026: accurate.
- **Claude check 23 Oct 2026:** the content list, both majors, second major/minor/electives and both three-year durations are on the pages. **"each has an optional honours year" is on neither cited page** (error 19) — removed.
- [ ] Reviewed by Ajay

---

## Not drafted — two courses a school leaver cannot enter directly

- **UNSW Bachelor of Computational Design (Honours)**: "Students must hold a Bachelor degree in Computational Design with the equivalent of a UNSW Credit average."
- **Western Sydney Bachelor of Applied Data Science**: "This program is not a stand-alone degree, but is designed to be undertaken as an add on degree in combination with any Bachelor degree offered at Western Sydney University."

Fixed 26 Sep (error 18): both carry a quoted `notEntryPoint` flag, are held out of every student's results, and their course pages say so first. The build refuses a description for either.

## Neighbours

Still not rendered. Since 26 Sep a neighbour must share at least one assumed-knowledge subject, so the alphabetical fill (Agricultural Science beside Data Science) is gone. Data Science, Mathematics and Project Management now have no neighbours rather than wrong ones. Scoring on something a student can use is still to do before neighbours go on the page.
