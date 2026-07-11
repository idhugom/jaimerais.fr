// OpenAI Responses API helpers (sync single-call + output extraction).
import { ARTICLE_FORMAT } from './content-schema.mjs';
import { buildRequestBody } from './prompt.mjs';
import { sleep } from './util.mjs';

const API = 'https://api.openai.com/v1';

export function requestBodyFor(post) {
  return buildRequestBody(post, ARTICLE_FORMAT);
}

/** Extract the assistant JSON text from a Responses API result object. */
export function extractJson(result) {
  if (result.output_text) return safeParse(result.output_text);
  const out = result.output || [];
  for (const item of out) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === 'output_text' && c.text) return safeParse(c.text);
      }
    }
  }
  return null;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Try to salvage the largest JSON object substring.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {}
    }
    return null;
  }
}

/** Synchronous single article generation with retries. */
export async function generateArticle(post, { tries = 4 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const body = requestBodyFor(post);
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${API}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`retryable HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status === 'incomplete') {
        throw new Error(`incomplete: ${data.incomplete_details?.reason || 'unknown'}`);
      }
      if (data.error) throw new Error(data.error.message || 'api error');
      const parsed = extractJson(data);
      if (!parsed) throw new Error('could not parse JSON output');
      return { article: parsed, usage: data.usage || null };
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await sleep(Math.min(3000 * 2 ** i, 30000));
    }
  }
  throw lastErr;
}
