# The Ask assistant — what it is and how to switch it on

Ask is a small panel on every page (the **Ask** button in the menu). A student or parent types
a question; an AI writes a short answer **using only the checked facts already on this site**,
with a link to each one.

It is built but **switched off** until the server is set up. While `data/assistant.json` has
no `endpoint`, the site shows no Ask button and nothing about it reaches the page.

## How it keeps to the site's rules

| Rule | How it is enforced | Where |
|---|---|---|
| Nothing leaves the browser until the reader agrees | Send is disabled until the consent box is ticked; the page makes no request before Send | `ui/ask.js` |
| No personal details | Emails, phone numbers and street addresses are refused in the browser **and** on the server | `ui/ask.js`, `assistant/core.js` |
| Only this site's facts | The server searches the site's own data first and sends the AI only the matching facts (about 8), numbered | `assistant/core.js` |
| Every fact linked | An answer without a citation to one of those facts is thrown away; the reader gets the matching pages instead | `checkAnswer` |
| No predictions | Any answer that predicts an ATAR, an offer or a chance of getting in is thrown away | `checkAnswer` |
| Off-topic | The AI is told to refuse anything outside subjects, courses, early offers, dates and programs; if the site has nothing at all, the AI is not asked | `buildInstructions`, `answer` |
| Not stored | The server writes no log of questions (Cloudflare logs off); OpenAI is asked not to store (`store: false`) | `worker/`, `providerRequest` |
| Not abused | 20 questions per visitor per 10 minutes, 300 per hour in total (best effort) — **plus a spending limit you set at OpenAI** | `makeLimiter` |
| Only from this site | The server answers only requests from the site's own address | `ALLOWED_ORIGINS` |

The readiness results are **not** touched: bands are still worked out by the same
deterministic engine, with no AI. Ask can only point to the Results page for those.

## Cost

About 1,550 words-pieces (tokens) go in and up to 450 come out per question. On
**gpt-6.1-terra** (US$1 in / US$5 out per million tokens, checked 5 Nov 2026) that is about
**US$0.003 per question — roughly US$3.30 per 1,000 questions.** On **gpt-6-luna** it is about
a tenth of that, with a weaker model. Set `MODEL` to choose.

## Switching it on (Ajay) — about 20 minutes

You need: your OpenAI account, and a free Cloudflare account.

### 1. OpenAI — a key and a spending limit
1. Sign in at platform.openai.com.
2. **Set a monthly budget limit first** (Settings → Limits, or Billing). Start low, e.g. US$10.
   This is the real safety net if anyone abuses the assistant.
3. Create a new API key for a project called "PathtoUni". Copy it somewhere safe for a minute.
   **Do not paste it into a chat, an email, or any file.**

### 2. Cloudflare — the small server (no Terminal needed)
1. Sign up free at dash.cloudflare.com.
2. Go to **Workers & Pages → Create → Create Worker**. Name it `pathtouni-ask`. Deploy the
   starter, then choose **Edit code**.
3. Delete everything in the editor. Open `worker/dist/worker.js` from the PathtoUni folder in
   a text editor, copy all of it, paste it in, and **Deploy**.
4. In the worker's **Settings → Variables and Secrets**, add:
   - `PROVIDER` = `openai`
   - `MODEL` = `gpt-6.1-terra`
   - `ALLOWED_ORIGINS` = `https://ibn-battuta.github.io,http://localhost:8000`
   - `OPENAI_API_KEY` — choose type **Secret**, and paste the key here. This is the only place
     the key ever goes.
5. Copy the worker's address — it looks like `https://pathtouni-ask.<your-name>.workers.dev`.
   This address is **not** secret; send it to Claude.

(Button names in Cloudflare may differ slightly from these.)

### 3. Claude finishes it
Claude puts the address in `data/assistant.json`, rebuilds the site, runs the live check
(`node scripts/assistant-eval.js <address>` — 20 questions, about 7 US cents), and shows you
the results before anything is published.

### Terminal route instead (if Node is installed on the Mac)
```
cd ~/Desktop/Projects/PathtoUni
npm run build:site && npm run assistant:build
cd worker
npx wrangler login
npx wrangler secret put OPENAI_API_KEY      # paste the key when asked
npx wrangler deploy
```

## Updating it
The assistant's facts are baked into `worker/dist/worker.js` when it is built. After any
change to the site's data: `npm run build:site && npm run assistant:build`, then paste the new
file into Cloudflare (or `npx wrangler deploy`). Otherwise Ask answers from the older facts.

## Before it goes public — check
- OpenAI's terms for services used by people under 18 (most users here are 15–17).
- The About page wording (it switches on automatically with the endpoint).
- The live check passes 20 of 20.

## Switching to Anthropic (Claude) instead
Set `PROVIDER` = `anthropic`, `MODEL` = `claude-haiku-5-5`, and a secret
`ANTHROPIC_API_KEY`. Nothing else changes.
