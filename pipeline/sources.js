// Published sources the pipeline knows how to capture.
// Add per-course page sources here later; do not scrape undocumented URLs.

export const USER_AGENT =
  'PathtoUni-pipeline/0.1 (NSW STEM readiness planner; local research; respects robots)';

/** University of Sydney Academic Board table: whole-catalogue prereqs / assumed / recommended. */
export const USYD_TABLE = {
  id: 'usyd-table',
  university: 'University of Sydney',
  universityFile: 'usyd.json',
  // Typo "prerquisite" is in the university's own URL.
  url: 'https://www.sydney.edu.au/content/dam/corporate/documents/about-us/governance-and-structure/academic-board/ab-standards---guidelines-/course-prerquisite-assumed-knowledge-recommended-studies-table.pdf',
  kind: 'pdf-table',
  title: 'Course Prerequisites, Assumed Knowledge, Recommended Studies and Special Entry Requirements',
  // Column left-edges from the 2025 landscape table (PDF points). Shared across content pages.
  columns: [
    { name: 'course', x: 75.8 },
    { name: 'prereq', x: 169.6 },
    { name: 'assumed', x: 279.8 },
    { name: 'recommended', x: 390.4 },
    { name: 'special', x: 500.9 },
    { name: 'date', x: 699.7 }
  ]
};

function htmlSource(partial) {
  return {
    kind: 'html-courses',
    delayMs: 1200,
    virtualTimeBudget: 12000,
    maxPages: 16,
    ...partial
  };
}

/** UTS marketing course pages (JS). Faculty listings do not emit per-course hrefs. */
export const UTS_COURSES = htmlSource({
  id: 'uts-courses',
  university: 'University of Technology Sydney',
  universityFile: 'uts.json',
  prefix: 'uts',
  title: 'UTS undergraduate STEM course pages',
  listingUrl: 'https://www.uts.edu.au/study/engineering',
  linkRe: /uts\.edu\.au\/courses\/bachelor-of-/,
  courses: [
    'https://www.uts.edu.au/courses/bachelor-of-computing-science',
    'https://www.uts.edu.au/courses/bachelor-of-information-technology',
    'https://www.uts.edu.au/courses/bachelor-of-nursing',
    'https://www.uts.edu.au/courses/bachelor-of-forensic-science',
    'https://www.uts.edu.au/courses/bachelor-of-engineering-honours-flexible',
    'https://www.uts.edu.au/courses/bachelor-of-engineering-honours-diploma-in-professional-engineering-practice-mechanical-and-mechatronic'
  ]
});

/** Macquarie Gatsby course pages. Plain GET is 403; headless Chrome is required. */
export const MQ_COURSES = htmlSource({
  id: 'mq-courses',
  university: 'Macquarie University',
  universityFile: 'macquarie.json',
  prefix: 'mq',
  title: 'Macquarie undergraduate STEM course pages',
  courses: [
    'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours',
    'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science',
    'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-information-technology',
    'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-cyber-security',
    'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-medical-sciences',
    'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-game-design-and-development'
  ]
});

/** WSU undergraduate catalogue listing hydrates enough to discover STEM slugs. */
export const WSU_COURSES = htmlSource({
  id: 'wsu-courses',
  university: 'Western Sydney University',
  universityFile: 'westernsydney.json',
  prefix: 'wsu',
  title: 'Western Sydney undergraduate STEM course pages',
  listingUrl: 'https://www.westernsydney.edu.au/future/study/courses/undergraduate',
  linkRe: /\/future\/study\/courses\/undergraduate\/bachelor-of-/,
  courses: [
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-engineering-honours',
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-science',
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-medical-science',
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-computer-science',
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-nursing',
    'https://www.westernsydney.edu.au/future/study/courses/undergraduate/bachelor-of-physiotherapy'
  ]
});

/** UOW course pages. Some coursefinder URLs stay on a JS splash; use /study/courses/ slugs. */
export const UOW_COURSES = htmlSource({
  id: 'uow-courses',
  university: 'University of Wollongong',
  universityFile: 'wollongong.json',
  prefix: 'uow',
  title: 'UOW undergraduate STEM course pages',
  courses: [
    'https://www.uow.edu.au/study/courses/bachelor-of-computer-science/',
    'https://www.uow.edu.au/study/courses/bachelor-of-information-technology/',
    'https://www.uow.edu.au/study/courses/bachelor-of-mathematics/',
    'https://www.uow.edu.au/study/courses/bachelor-of-nursing/',
    'https://www.uow.edu.au/study/courses/bachelor-of-engineering-honours---bachelor-of-mathematics/'
  ]
});

/**
 * UNSW degree pages are JS-rendered. The study sitemap is a published XML index
 * (a GET is fine); each course page still needs Chrome. Seeds are the three
 * hand-started rows so they are always recaptured.
 */
export const UNSW_COURSES = htmlSource({
  id: 'unsw-courses',
  university: 'UNSW',
  universityFile: 'unsw.json',
  prefix: 'unsw',
  title: 'UNSW undergraduate STEM course pages',
  sitemapUrl: 'https://www.unsw.edu.au/study/sitemap.xml',
  linkRe: /\/study\/undergraduate\/bachelor/,
  excludeRe: /canberra|bengaluru|-arts(?:\d)?$|-law$|fine-arts|\/bachelor-of-commerce|\/bachelor-of-economics|social-science|criminology|\/bachelor-of-media|\/bachelor-of-design|education-secondary|architectural|city-planning|construction-management|actuarial-studies/,
  maxPages: 32,
  courses: [
    'https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours',
    'https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-science',
    'https://www.unsw.edu.au/study/undergraduate/bachelor-of-engineering-honours-renewable-energy'
  ]
});

export const HTML_SOURCES = [UNSW_COURSES, UTS_COURSES, MQ_COURSES, WSU_COURSES, UOW_COURSES];

export const SOURCES = {
  [USYD_TABLE.id]: USYD_TABLE,
  [UNSW_COURSES.id]: UNSW_COURSES,
  [UTS_COURSES.id]: UTS_COURSES,
  [MQ_COURSES.id]: MQ_COURSES,
  [WSU_COURSES.id]: WSU_COURSES,
  [UOW_COURSES.id]: UOW_COURSES
};
