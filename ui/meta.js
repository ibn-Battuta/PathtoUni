// The site's name, in one place.
export const SITE_NAME = 'Path to Uni';

export const UNI_SHORT = {
  UNSW: 'UNSW',
  'University of Sydney': 'Sydney',
  'University of Technology Sydney': 'UTS',
  'Macquarie University': 'Macquarie',
  'Western Sydney University': 'Western Sydney',
  'University of Wollongong': 'Wollongong'
};

export function prettyDate(iso) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || 'unknown';
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export function joinList(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function courseDescription(c) {
  const uni = UNI_SHORT[c.university] || c.university;
  const ak = (c.assumedKnowledge || []).map(a => a.subject);
  const assumed = ak.length ? `assumes ${joinList(ak)}.` : 'lists no assumed knowledge.';
  const prereq = (c.hardRules || []).length
    ? 'You need a certain maths mark to get in.'
    : 'No subject prerequisites.';
  // The description is the search-result snippet, which is where a student who has never
  // seen this site meets the course. For a restricted course, "no subject prerequisites"
  // on its own is the single most misleading true sentence available, so the restriction
  // goes first.
  if (c.notEntryPoint) {
    return `${c.name} at ${uni} is not entered straight from school: it is for ${c.notEntryPoint.who}. `
      + `Checked ${prettyDate(c.capturedOn)}.`;
  }
  if (c.restrictedTo) {
    return `${c.name} at ${uni} is open only to ${c.restrictedTo.who}. ${assumed.charAt(0).toUpperCase() + assumed.slice(1)} `
      + `${prereq} Checked ${prettyDate(c.capturedOn)}.`;
  }
  return `${c.name} at ${uni} ${assumed} ${prereq} Checked ${prettyDate(c.capturedOn)}.`;
}

export function courseTitleText(c) {
  const uni = UNI_SHORT[c.university] || c.university;
  return `${c.name}, ${uni} — ${SITE_NAME}`;
}
