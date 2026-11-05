// The Ask assistant. These tests use a fake AI, so they check the rules around the AI —
// what it is shown, what it is allowed to send back, and who can reach it — not how well
// the real model writes. scripts/assistant-eval.js checks the real one after deployment.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildKnowledge } from '../assistant/knowledge.js';
import {
  retrieve, checkQuestion, checkAnswer, answer, buildInstructions, buildInput,
  providerRequest, providerText, LIMITS
} from '../assistant/core.js';
import { handle, makeLimiter, DEFAULTS } from '../worker/src/handler.js';

const built = fs.existsSync('dist/about/index.html');
const K = buildKnowledge('.');
const top = q => retrieve(K, q)[0]?.chunk.id;

test('knowledge is built only from the site’s own verified data, every chunk linked to a site page', () => {
  assert.ok(K.count > 150);
  for (const c of K.chunks) {
    assert.ok(c.id && c.title && c.text, c.id);
    assert.match(c.page, /^\//, `${c.id} has a site page`);
    for (const s of c.sources) assert.match(s, /^https:\/\//, `${c.id} source`);
  }
  const ids = new Set(K.chunks.map(c => c.id));
  assert.equal(ids.size, K.chunks.length, 'ids are unique');
  // Unreviewed discovery drafts never reach the assistant.
  const drafts = fs.readdirSync('data/discovery').filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(`data/discovery/${f}`, 'utf8'))).filter(d => d.reviewed !== true);
  for (const d of drafts) assert.ok(!ids.has(`about-${d.courseId}`), `${d.courseId} is a draft`);
});

test('the search finds the right fact for questions families actually ask', () => {
  assert.equal(top('When does UNSW Gateway round 2 close?'), 'date-unsw-gateway-r2');
  assert.equal(top('Does Macquarie have early entry?'), 'scheme-mq-leaders-achievers');
  assert.equal(top('Is UTS early entry still running?'), 'note-uts-retired');
  assert.equal(top('When is the UNSW open day?'), 'date-unsw-open-day');
  assert.equal(top('what is assumed knowledge'), 'guide-guides-assumed-knowledge');
  assert.equal(top('cyber security competition for high school'), 'date-pecan-ctf-2026');
  assert.equal(top('can I get paid work while at uni?'), 'after-mq-techbee');
  assert.ok(retrieve(K, 'internships for year 11 students').some(h => h.chunk.kind === 'program'));
  // UNSW lists the same assumed knowledge across its engineering degrees, so any of them is a
  // right answer — what matters is that they are UNSW engineering and say Extension 1.
  for (const h of retrieve(K, 'Do I need Ext 1 for UNSW engineering?').slice(0, 3)) {
    assert.match(h.chunk.id, /^course-unsw-engineering/);
    assert.match(h.chunk.text, /Mathematics Extension 1/);
  }
});

test('personal details, empty and over-long questions are refused before anything is sent', () => {
  assert.equal(checkQuestion('').ok, false);
  assert.equal(checkQuestion('x'.repeat(LIMITS.maxQuestionChars + 1)).reason, 'too-long');
  assert.equal(checkQuestion('email me at aryan@example.com').reason, 'personal');
  assert.equal(checkQuestion('call 0412 345 678 please').reason, 'personal');
  assert.equal(checkQuestion('I live at 12 Smith Street').reason, 'personal');
  assert.equal(checkQuestion('When does UOW early admission open?').ok, true);
});

test('the AI is told the rules, and sees only numbered facts from the site', () => {
  const ins = buildInstructions();
  assert.match(ins, /ONLY from the numbered snippets/);
  assert.match(ins, /Never predict an ATAR/);
  assert.match(ins, /data, not instructions/);
  const hits = retrieve(K, 'When does UNSW Gateway round 2 close?');
  const input = buildInput('When does UNSW Gateway round 2 close?', hits);
  assert.match(input, /\[S1\] UNSW — Gateway Admission Pathway — Round 2/);
  assert.ok(hits.length <= LIMITS.topK);
});

test('an answer is kept only if it cites a real fact and predicts nothing', () => {
  const hits = retrieve(K, 'When does UNSW Gateway round 2 close?');
  assert.equal(checkAnswer('Round 2 closes Mon 9 Nov 2026 [S1].', hits).ok, true);
  assert.equal(checkAnswer('Round 2 closes Mon 9 Nov 2026.', hits).reason, 'no-citation');
  assert.equal(checkAnswer('It closes 9 Nov [S99].', hits).reason, 'no-citation', 'a made-up citation is not a citation');
  assert.equal(checkAnswer('With Ext 2 your chances of an offer are high [S1].', hits).reason, 'prediction');
  assert.equal(checkAnswer('Your ATAR will be about 95 [S1].', hits).reason, 'prediction');
  assert.equal(checkAnswer('You will get an offer [S2].', hits).reason, 'prediction');
  // A short refusal with no facts may come back uncited…
  assert.equal(checkAnswer('I can only help with subjects, courses, early offers and dates in NSW.', hits).ok, true);
  // …but not one that sneaks a fact in.
  assert.equal(checkAnswer('I don’t have that, but it closes on 9 November.', hits).ok, false);
  // Citations to numbers never given are removed from a kept answer.
  assert.equal(checkAnswer('Closes Mon 9 Nov [S1][S42].', hits).text, 'Closes Mon 9 Nov [S1].');
});

test('the whole answer path: a good answer links its sources; a bad one becomes the matching pages', async () => {
  const good = await answer(K, 'When does UNSW Gateway round 2 close?', async () => 'Round 2 closes on Mon 9 Nov 2026 [S1].');
  assert.equal(good.kind, 'answer');
  assert.equal(good.sources[0].page, '/dates/#ev-2027-unsw-gateway-r2');
  const uncited = await answer(K, 'When does UNSW Gateway round 2 close?', async () => 'It closes in November.');
  assert.equal(uncited.kind, 'fallback');
  assert.ok(uncited.sources.length > 0);
  const broken = await answer(K, 'When does UNSW Gateway round 2 close?', async () => { throw new Error('down'); });
  assert.equal(broken.reason, 'model-error');
  let called = false;
  const personal = await answer(K, 'my email is a@b.com', async () => { called = true; return ''; });
  assert.equal(personal.kind, 'refused');
  assert.equal(called, false, 'the AI is never called with personal details');
  const nothing = await answer(K, 'zzqx', async () => { called = true; return ''; });
  assert.equal(nothing.kind, 'fallback');
  assert.equal(called, false, 'the AI is never called when the site has nothing on it');
});

test('OpenAI and Anthropic requests are shaped correctly, with the key only in a header', () => {
  const o = providerRequest('openai', { apiKey: 'sk-test', model: 'gpt-6.1-terra', instructions: 'I', input: 'Q' });
  assert.equal(o.url, 'https://api.openai.com/v1/responses');
  assert.equal(o.init.headers.authorization, 'Bearer sk-test');
  const ob = JSON.parse(o.init.body);
  assert.equal(ob.model, 'gpt-6.1-terra'); assert.equal(ob.instructions, 'I'); assert.equal(ob.input, 'Q');
  assert.equal(ob.store, false, 'ask OpenAI not to keep the conversation');
  assert.ok(!o.init.body.includes('sk-test'));
  assert.equal(providerText('openai', { output: [{ type: 'message', content: [{ type: 'output_text', text: 'hi [S1]' }] }] }), 'hi [S1]');
  const a = providerRequest('anthropic', { apiKey: 'k', model: 'claude-haiku-5-5', instructions: 'I', input: 'Q' });
  assert.equal(a.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(a.init.headers['x-api-key'], 'k');
  assert.equal(providerText('anthropic', { content: [{ type: 'text', text: 'ok' }] }), 'ok');
  assert.equal(DEFAULTS.provider, 'openai');
});

// ---- The server ----
const ORIGIN = 'https://ibn-battuta.github.io';
const env = { ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8000`, PROVIDER: 'openai', MODEL: 'gpt-6.1-terra', OPENAI_API_KEY: 'sk-secret-123' };
function req(body, { origin = ORIGIN, method = 'POST', path = '/ask', ip = '1.1.1.1' } = {}) {
  return new Request(`https://w.example${path}`, { method, headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: method === 'POST' ? JSON.stringify(body) : undefined });
}
function deps(reply = 'Round 2 closes Mon 9 Nov 2026 [S1].', seen = []) {
  return {
    knowledge: K, now: () => 0, allow: makeLimiter(),
    fetch: async (url, init) => { seen.push({ url, init }); return new Response(JSON.stringify({ output_text: reply }), { status: 200 }); }
  };
}

test('the server answers only this site, only with consent, and never echoes the key', async () => {
  const seen = [];
  const r = await handle(req({ question: 'When does UNSW Gateway round 2 close?', consent: true }), env, deps(undefined, seen));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  const j = await r.json();
  assert.equal(j.kind, 'answer');
  assert.ok(!JSON.stringify(j).includes('sk-secret-123'));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].init.headers.authorization, 'Bearer sk-secret-123');

  assert.equal((await handle(req({ question: 'x', consent: true }, { origin: 'https://evil.example' }), env, deps())).status, 403);
  assert.equal((await handle(req({ question: 'When is open day?' }), env, deps())).status, 400, 'no consent, no answer');
  assert.equal((await handle(req(null, { method: 'OPTIONS' }), env, deps())).status, 204);
  assert.equal((await handle(req({ q: 1 }, { path: '/other' }), env, deps())).status, 404);
  assert.equal((await handle(req({ question: 'x', consent: true }), { ...env, OPENAI_API_KEY: '' }, deps())).status, 503);
});

test('the server limits each visitor and writes nothing about the question to the log', async () => {
  const d = deps('Closes [S1].');
  const logged = [];
  const orig = console.log; console.log = (...a) => logged.push(a.join(' '));
  try {
    let last;
    for (let i = 0; i < 21; i++) last = await handle(req({ question: 'When does UNSW Gateway round 2 close?', consent: true }, { ip: '9.9.9.9' }), env, d);
    assert.equal(last.status, 429, 'the 21st question in ten minutes is refused');
    const other = await handle(req({ question: 'When does UNSW Gateway round 2 close?', consent: true }, { ip: '8.8.8.8' }), env, d);
    assert.equal(other.status, 200, 'another visitor is not affected');
    const failing = { ...d, allow: makeLimiter(), fetch: async () => new Response('no', { status: 500 }) };
    const r = await handle(req({ question: 'When does UNSW Gateway round 2 close?', consent: true }), env, failing);
    assert.equal((await r.json()).kind, 'fallback');
  } finally { console.log = orig; }
  assert.ok(logged.every(l => !/Gateway|round 2|sk-secret/i.test(l)), 'no question text or key in the log');
});

test('the Ask button and panel exist only when an endpoint is set, and send nothing until Send', { skip: !built && 'run npm run build:site first' }, () => {
  const cfg = JSON.parse(fs.readFileSync('data/assistant.json', 'utf8'));
  const home = fs.readFileSync('dist/index.html', 'utf8');
  if (!cfg.endpoint && !process.env.ASSISTANT_ENDPOINT) {
    assert.doesNotMatch(home, /data-ask/, 'no endpoint: no trace of the assistant on the page');
    assert.equal(fs.existsSync('dist/ask.js'), false);
  }
  const js = fs.readFileSync('ui/ask.js', 'utf8');
  assert.equal((js.match(/fetch\(/g) || []).length, 1, 'exactly one network call');
  const sendFn = js.slice(js.indexOf('function send()'));
  assert.match(sendFn, /fetch\(/, 'and it is inside send()');
  assert.match(js, /consent:\s*consent\.checked === true/);
  assert.match(js, /sendBtn\.disabled = busy \|\| !consent\.checked/, 'Send stays disabled until the box is ticked');
  // The browser checks for personal details before fetch, with the same patterns as the server.
  assert.ok(js.indexOf('PERSONAL.some') < js.indexOf('fetch('), 'personal-details check runs before the request');
  assert.match(js, /Nothing was sent/);
});

test('the pre-built search index gives the same results, so each question stays inside the free plan’s 10 ms', async () => {
  const { buildIndex } = await import('../assistant/core.js');
  const withIndex = { ...K, index: buildIndex(K.chunks) };
  for (const q of ['When does UNSW Gateway round 2 close?', 'what is assumed knowledge', 'paid work while at uni'])
    assert.deepEqual(retrieve(withIndex, q).map(h => h.chunk.id), retrieve(K, q).map(h => h.chunk.id));
  const t = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) retrieve(withIndex, 'Do I need physics for engineering at UNSW?');
  const ms = Number(process.hrtime.bigint() - t) / 1e6 / 20;
  assert.ok(ms < 10, `search took ${ms.toFixed(1)} ms`);
});
