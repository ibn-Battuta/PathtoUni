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
    ? 'A published mathematics mark is required for entry.'
    : 'No subject prerequisites.';
  return `${c.name} at ${uni} ${assumed} ${prereq} Checked ${prettyDate(c.capturedOn)}.`;
}

export function courseTitleText(c) {
  const uni = UNI_SHORT[c.university] || c.university;
  return `${c.name}, ${uni} — Open To You`;
}
