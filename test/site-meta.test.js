import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseDescription, courseTitleText } from '../ui/meta.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const courses = [];
for (const f of fs.readdirSync(path.join(ROOT, 'data/courses')).filter(x => x.endsWith('.json'))) {
  const uni = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/courses', f), 'utf8'));
  for (const c of uni.courses ?? [])
    courses.push({ ...c, university: uni.university, capturedOn: c.capturedOn ?? uni.capturedOn });
}

test('every course page title is unique and includes the university', () => {
  const titles = courses.map(courseTitleText);
  assert.equal(new Set(titles).size, titles.length);
  assert.ok(titles.every(t => /UNSW|Sydney|UTS|Macquarie|Western Sydney|Wollongong/.test(t)));
});

test('every course meta description is unique and names assumed knowledge from the record', () => {
  const descs = courses.map(courseDescription);
  assert.equal(new Set(descs).size, descs.length);
  const unswEng = courses.find(c => c.id === 'unsw-engineering-honours');
  assert.match(courseDescription(unswEng), /assumes Mathematics Extension 1 and Physics/);
  assert.match(courseDescription(unswEng), /No subject prerequisites/);
});
