// The Ask assistant's server — a Cloudflare Worker (a small program Cloudflare runs for you,
// so the AI key never has to sit in the website). It does five things and nothing else:
//   1. accepts questions only from this site's own address;
//   2. limits how many questions one visitor can send (best effort; set a spending limit at
//      the AI company too);
//   3. refuses a question unless the visitor ticked the consent box;
//   4. runs the answer path in assistant/core.js with the real AI;
//   5. never writes the question down anywhere.
//
// Settings (worker/wrangler.toml, or the Cloudflare dashboard):
//   PROVIDER          "openai" (default) or "anthropic"
//   MODEL             the model name at that provider
//   ALLOWED_ORIGINS   comma-separated site addresses allowed to call this server
//   OPENAI_API_KEY / ANTHROPIC_API_KEY   — a *secret*, set by Ajay, never in a file

import { answer, providerRequest, providerText } from '../../assistant/core.js';

export const DEFAULTS = { provider: 'openai', models: { openai: 'gpt-6.1-terra', anthropic: 'claude-haiku-5-5' } };
const MAX_BODY = 2048;

export function makeLimiter({ perVisitor = 20, visitorWindowMs = 10 * 60 * 1000, perHour = 300 } = {}) {
  const seen = new Map();
  let hour = [];
  return function allow(visitor, now) {
    hour = hour.filter(t => now - t < 3600 * 1000);
    const mine = (seen.get(visitor) ?? []).filter(t => now - t < visitorWindowMs);
    if (mine.length >= perVisitor || hour.length >= perHour) { seen.set(visitor, mine); return false; }
    mine.push(now); hour.push(now); seen.set(visitor, mine);
    if (seen.size > 5000) seen.clear();
    return true;
  };
}

function cors(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

export async function handle(request, env, deps) {
  const allowed = String(env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin') ?? '';
  if (!allowed.includes(origin)) return json(403, { kind: 'error', text: 'Not allowed from this address.' });
  const h = cors(origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (request.method !== 'POST') return json(405, { kind: 'error', text: 'Use POST.' }, h);
  if (new URL(request.url).pathname !== '/ask') return json(404, { kind: 'error', text: 'Not found.' }, h);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { kind: 'error', text: 'That question is too long.' }, h);
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { kind: 'error', text: 'Could not read the question.' }, h); }
  if (body?.consent !== true)
    return json(400, { kind: 'error', text: 'Please tick the box to say you understand where your question goes.' }, h);

  const visitor = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!deps.allow(visitor, deps.now()))
    return json(429, { kind: 'error', text: 'Too many questions for now. Please try again in a few minutes.' }, h);

  const provider = env.PROVIDER || DEFAULTS.provider;
  const model = env.MODEL || DEFAULTS.models[provider];
  const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) return json(503, { kind: 'error', text: 'The assistant is not set up yet.' }, h);

  const callModel = async ({ instructions, input }) => {
    const { url, init } = providerRequest(provider, { apiKey, model, instructions, input });
    const res = await deps.fetch(url, init);
    if (!res.ok) {
      // Status only. Never the question, never the key.
      console.log(`assistant: ${provider} returned ${res.status}`);
      throw new Error('model');
    }
    return providerText(provider, await res.json());
  };

  const reply = await answer(deps.knowledge, body.question, callModel);
  return json(200, reply, h);
}
