/**
 * User preferences — GET/PUT for persisting user settings.
 * Stores key-value pairs in D1 user_preferences table.
 */
import { Hono } from 'hono';
import type { Env, Variables } from '../../src/types.js';

const prefs = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /v1/preferences — return all user preferences
prefs.get('/', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare(
    'SELECT key, value, updated_at FROM user_preferences WHERE user_id = ?',
  ).bind(userId).all<{ key: string; value: string; updated_at: string }>();

  // Convert to simple key-value object, parsing JSON values
  const out: Record<string, string | boolean | number> = {};
  for (const row of results) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return c.json(out);
});

// PUT /v1/preferences — update one or more preferences
prefs.put('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  if (!body || typeof body !== 'object') {
    return c.json({ error: { message: 'JSON object with key-value pairs required' } }, 400);
  }

  const allowedKeys = new Set([
    'streaming', 'pii', 'theme', 'model', 'maxTokens', 'temperature', 'systemPrompt',
  ]);

  const entries = Object.entries(body).filter(([k]) => allowedKeys.has(k));
  if (entries.length === 0) {
    return c.json({ error: { message: 'No valid preference keys. Allowed: streaming, pii, theme, model, maxTokens, temperature, systemPrompt' } }, 400);
  }

  // Upsert each preference
  const stmts = entries.map(([key, value]) =>
    c.env.DB.prepare(
      `INSERT INTO user_preferences (user_id, key, value, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).bind(userId, key, JSON.stringify(value)),
  );

  await c.env.DB.batch(stmts);
  return c.json({ updated: Object.fromEntries(entries) });
});

export default prefs;
