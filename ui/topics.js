// Interests and industries. A sort, never a filter and never a band.
//
// Topics are matched from a course's own name with plain rules, so anyone can see why a
// course was tagged. That makes the tagging our judgement, not the university's, and the
// page says so. A course whose name names no topic ("Bachelor of Science") is BROAD: you
// pick a major later. Broad degrees are never scored and never sunk; they are listed apart
// so a vague name does not read as "not for you".

export const TOPICS = [
  { id: 'ai', label: 'Coding, software and AI', match: /comput|software|information technology|information systems|data science/i, broadFields: ['science', 'engineering'] },
  { id: 'data', label: 'Maths and data', match: /mathemat|data science|statistic|actuar/i, broadFields: ['science'] },
  { id: 'cyber', label: 'Cyber security', match: /cyber/i, broadFields: [] },
  { id: 'electronics', label: 'Electronics and electricity', match: /electrical|electronic/i, broadFields: ['engineering'] },
  { id: 'robotics', label: 'Robots and machines', match: /robot|mechatronic|mechanical|manufactur/i, broadFields: ['engineering'] },
  { id: 'space', label: 'Space and flight', match: /space|aeronaut|aerospace/i, broadFields: ['engineering'] },
  { id: 'energy', label: 'Energy', match: /renewable|nuclear|electrical|chemical/i, broadFields: ['engineering', 'science'] },
  { id: 'materials', label: 'Materials and making things', match: /materials|manufactur|chemical/i, broadFields: ['engineering', 'science'] },
  { id: 'build', label: 'Buildings, bridges and cities', match: /civil|construction|surveying|architect/i, broadFields: ['engineering'] },
  { id: 'bio', label: 'Living things and biotech', match: /biomedic|bioscience|medicinal chem|agricultur|veterinar|forensic|biomedicine|medical scien/i, broadFields: ['science'] },
  { id: 'health', label: 'Health and caring for people', match: /nursing|medicine|medical studies|physio|pharmacy|exercise|occupational|speech|radiograph|oral health|dental|nutrition|\(health\)/i, broadFields: [] },
  { id: 'mind', label: 'How people think and behave', match: /psycholog|behaviour/i, broadFields: ['science'] },
  { id: 'nature', label: 'Nature and the environment', match: /environment|wildlife|agricultur|conservation/i, broadFields: ['science'] }
];

export const TOPIC_IDS = TOPICS.map(t => t.id);

export function topicLabel(id) {
  return TOPICS.find(t => t.id === id)?.label ?? id;
}

/** Topics a course's own name points to. Empty means broad. */
export function courseTopics(course) {
  const name = String(course?.name ?? '');
  return TOPICS.filter(t => t.match.test(name)).map(t => t.id);
}

// Broad means "you choose the focus later": a general science or engineering degree.
// A name with no topic that is not science or engineering (Project Management) is not
// broad — it simply matches nothing, and it is still in every results list.
const BROAD_NAME = /science|engineering/i;

export function isBroad(course) {
  return courseTopics(course).length === 0 && BROAD_NAME.test(String(course?.name ?? ''));
}

// Ten this-or-that picks. Questions, not claims: nothing here is stated as fact.
// Every topic is offered at least twice. A topic offered once can never outrank one
// picked twice, so before 23 Oct 2026 a student who loved building could not get it
// as their top area (error 20).
export const QUIZ = [
  [{ text: 'Build a robot that can walk', topics: ['robotics'] },
   { text: 'Work out why some people get sick and others do not', topics: ['health', 'bio'] }],
  [{ text: 'Write code for an app millions of people use', topics: ['ai'] },
   { text: 'Design a bridge that survives an earthquake', topics: ['build'] }],
  [{ text: 'Find a pattern hidden in a huge pile of numbers', topics: ['data'] },
   { text: 'Grow a crop that survives a drought', topics: ['nature', 'bio'] }],
  [{ text: 'Design a rocket or a satellite', topics: ['space'] },
   { text: 'Invent a better battery', topics: ['energy', 'materials'] }],
  [{ text: 'Stop hackers breaking into a hospital’s computers', topics: ['cyber'] },
   { text: 'Help someone who feels anxious feel better', topics: ['mind', 'health'] }],
  [{ text: 'Understand why people make the choices they do', topics: ['mind'] },
   { text: 'Work out how the circuits in your phone work', topics: ['electronics'] }],
  [{ text: 'Make a material stronger than steel and lighter than plastic', topics: ['materials'] },
   { text: 'Teach a computer to recognise voices', topics: ['ai'] }],
  [{ text: 'Protect an endangered animal', topics: ['nature'] },
   { text: 'Design a city that runs on wind and solar power', topics: ['energy', 'build'] }],
  [{ text: 'Design aircraft and drones', topics: ['space', 'robotics'] },
   { text: 'Study cells and DNA in a lab', topics: ['bio'] }],
  [{ text: 'Crack a secret code', topics: ['cyber', 'data'] },
   { text: 'Take a machine apart and make it work better', topics: ['robotics', 'electronics'] }]
];

/**
 * answers: array the length of QUIZ, each 0, 1 or null (skipped).
 * Returns up to three topic ids, strongest first. Ties go to the topic picked more
 * often relative to how often it was offered, then to TOPICS order, so the result is
 * the same every time for the same answers.
 */
export function scoreQuiz(answers) {
  const picks = {}, offered = {};
  QUIZ.forEach((pair, i) => {
    pair.forEach(opt => opt.topics.forEach(t => { offered[t] = (offered[t] || 0) + 1; }));
    const a = answers?.[i];
    if (a === 0 || a === 1) pair[a].topics.forEach(t => { picks[t] = (picks[t] || 0) + 1; });
  });
  return TOPIC_IDS
    .filter(t => picks[t] > 0)
    .sort((x, y) => (picks[y] - picks[x])
      || (picks[y] / offered[y] - picks[x] / offered[x])
      || (TOPIC_IDS.indexOf(x) - TOPIC_IDS.indexOf(y)))
    .slice(0, 3);
}

/** Topics a chosen industry points to, or [] when none is chosen. */
export function industryTopicIds(industries, industryId) {
  return industries?.find(x => x.id === industryId)?.topics ?? [];
}

/**
 * How closely a course matches what the student told us. 0 means no match, never
 * "unsuitable". Interests weigh 3, 2, 1 in the order given; a chosen industry adds 2
 * for any of its topics.
 */
export function interestScore(course, interests = [], industryTopics = []) {
  const ct = courseTopics(course);
  if (!ct.length) return 0;
  let s = 0;
  interests.forEach((t, i) => { if (ct.includes(t)) s += Math.max(1, 3 - i); });
  if (industryTopics.some(t => ct.includes(t))) s += 2;
  return s;
}

/** Stable sort by interest. Same length in, same length out: nothing is removed. */
export function sortByInterest(results, interests = [], industryTopics = []) {
  if (!interests.length && !industryTopics.length) return results.slice();
  return results
    .map((r, i) => ({ r, i, s: interestScore(r.course ?? r, interests, industryTopics) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.r);
}

/** Which of the student's topics a course matches, for the "matches" tag. */
export function matchedTopics(course, interests = [], industryTopics = []) {
  const ct = courseTopics(course);
  return [...new Set([...interests, ...industryTopics])].filter(t => ct.includes(t));
}

/** Degrees for an industry: specific matches, and broad degrees in the fields it names. */
export function coursesForIndustry(industry, courses) {
  const specific = [], broad = [];
  for (const c of courses ?? []) {
    if (c.notEntryPoint) continue;
    const ct = courseTopics(c);
    if (ct.length) { if (industry.topics.some(t => ct.includes(t))) specific.push(c); }
    else if (isBroad(c) && (industry.broadFields ?? []).includes(c.field)) broad.push(c);
  }
  return { specific, broad };
}

/** Same split for a set of interests (quiz result). */
export function coursesForTopics(topics, courses) {
  const specific = [], broad = [];
  const fields = new Set(TOPICS.filter(t => topics.includes(t.id)).flatMap(t => t.broadFields));
  for (const c of courses ?? []) {
    if (c.notEntryPoint) continue;
    const ct = courseTopics(c);
    if (ct.length) { if (topics.some(t => ct.includes(t))) specific.push(c); }
    else if (isBroad(c) && fields.has(c.field)) broad.push(c);
  }
  return { specific, broad };
}
