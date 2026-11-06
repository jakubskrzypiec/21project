'use strict';
/**
 * Wspólna podstawa agentów: ustawienia, stan, dziennik, zużycie tokenów i wywołanie modelu.
 * Każdy agent (handlowiec, a później analityk, opiekun klienta i prezes) ma tu swoje
 * miejsce pod własnym identyfikatorem, więc mapa w panelu i cotygodniowe spotkania
 * mogą czytać dzienniki wszystkich w jeden sposób.
 */
const { db, getSetting, setSetting } = require('../../db');
const { config } = require('../../config');
const ai = require('../ai');

const nowIso = () => new Date().toISOString();

function deepMerge(base, over) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = k in base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

function readJson(key, fallback) {
  try { const raw = getSetting(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

const settings = (agent, defaults) => deepMerge(defaults, readJson(`agent:${agent}:settings`, {}));
const saveSettings = (agent, defaults, patch) => {
  const next = deepMerge(settings(agent, defaults), patch);
  setSetting(`agent:${agent}:settings`, JSON.stringify(next));
  return next;
};
const state = (agent) => readJson(`agent:${agent}:state`, {});
const saveState = (agent, patch) => {
  const next = { ...state(agent), ...patch };
  setSetting(`agent:${agent}:state`, JSON.stringify(next));
  return next;
};

function log(agent, kind, message, meta) {
  db.prepare('INSERT INTO agent_log (ts, agent, kind, message, meta) VALUES (?, ?, ?, ?, ?)')
    .run(nowIso(), agent, kind, String(message).slice(0, 2000), meta ? JSON.stringify(meta) : null);
  if (kind === 'error') console.error(`[agent:${agent}] ${message}`);
}

function recentLog(agent, { limit = 100, kind } = {}) {
  const rows = kind
    ? db.prepare('SELECT * FROM agent_log WHERE agent = ? AND kind = ? ORDER BY id DESC LIMIT ?').all(agent, kind, limit)
    : db.prepare('SELECT * FROM agent_log WHERE agent = ? ORDER BY id DESC LIMIT ?').all(agent, limit);
  return rows.map((r) => ({ ...r, meta: r.meta ? JSON.parse(r.meta) : null }));
}

/** Data i godzina w strefie firmy — od tego zależy „dziś”, dzień roboczy i okno wysyłki. */
function local(now = new Date(), tz = config.outreach.timezone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(now).map((x) => [x.type, x.value]));
  const dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  const hour = Number(p.hour) % 24;
  return { day: `${p.year}-${p.month}-${p.day}`, dow, hour, minute: Number(p.minute), hourFloat: hour + Number(p.minute) / 60 };
}

/** Początek lokalnego dnia jako znacznik UTC (do zapytań po sent_at). */
function dayStartIso(now = new Date(), tz = config.outreach.timezone) {
  const { hourFloat } = local(now, tz);
  const d = new Date(now.getTime() - hourFloat * 3600000);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

function addUsage(agent, usage = {}) {
  db.prepare(`INSERT INTO agent_usage (day, agent, calls, input_tokens, output_tokens) VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(day, agent) DO UPDATE SET calls = calls + 1, input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens`)
    .run(local().day, agent, usage.input_tokens || 0, usage.output_tokens || 0);
}

/** Wywołanie modelu z liczeniem tokenów. Zwraca tekst. */
async function think(agent, { system, prompt, messages, maxTokens = 1000, temperature = 0.7, model }) {
  const { text, usage } = await ai.call({ system, prompt, messages, maxTokens, temperature, model });
  addUsage(agent, usage);
  return text;
}

/** Znaki nowej linii i tabulatory wpisane wprost w tekst JSON-a — model robi to często. */
function escapeRawNewlines(s) {
  let out = ''; let inStr = false; let esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) { esc = false; out += ch; continue; }
      if (ch === '\\') { esc = true; out += ch; continue; }
      if (ch === '"') inStr = false;
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') continue;
      if (ch === '\t') { out += '\\t'; continue; }
    } else if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

/** Wyciąga JSON z odpowiedzi modelu, nawet gdy dopisał coś obok albo złamał linie w tekście. */
function parseJson(raw) {
  const clean = String(raw).replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  const m = clean.match(/\{[\s\S]*\}/);
  for (const c of [clean, m && m[0], m && escapeRawNewlines(m[0])].filter(Boolean)) {
    try { return JSON.parse(c); } catch { /* następna próba */ }
  }
  throw new Error('Model nie zwrócił poprawnego JSON-a.');
}

/** Schemat w trybie ścisłym: każdy obiekt ma wszystkie pola wymagane i nic ponad nie. */
function strictSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const out = { ...schema };
  if (out.type === 'object' && out.properties) {
    out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [k, strictSchema(v)]));
    out.required = Object.keys(out.properties);
    out.additionalProperties = false;
  }
  if (out.type === 'array' && out.items) out.items = strictSchema(out.items);
  return out;
}

/**
 * Odpowiedź o ustalonych polach przez structured outputs (output_config.format):
 * API samo pilnuje, żeby był to poprawny JSON zgodny ze schematem.
 */
async function thinkJson(agent, { system, prompt, messages, maxTokens = 8000, model, schema }) {
  const r = await ai.call({ system, prompt, messages, maxTokens, model, jsonSchema: strictSchema(schema) });
  addUsage(agent, r.usage);
  return parseJson(r.text);
}

function usageSummary(agent, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const r = db.prepare(`SELECT COALESCE(SUM(calls),0) calls, COALESCE(SUM(input_tokens),0) input, COALESCE(SUM(output_tokens),0) output
    FROM agent_usage WHERE agent = ? AND day >= ?`).get(agent, since);
  // Orientacyjnie, w cenach modelu średniej klasy (USD za milion tokenów: 3 wejście, 15 wyjście).
  const usd = (r.input * 3 + r.output * 15) / 1e6;
  return { ...r, usd: Math.round(usd * 100) / 100, pln: Math.round(usd * 4 * 100) / 100, days };
}

/** Prosta blokada, żeby dwa przebiegi agenta nie nakładały się na siebie. */
const locks = new Set();
async function exclusive(name, fn) {
  if (locks.has(name)) return { skipped: 'poprzedni przebieg jeszcze trwa' };
  locks.add(name);
  try { return await fn(); } finally { locks.delete(name); }
}

const isRunning = (name) => locks.has(name);

module.exports = {
  isRunning, settings, saveSettings, state, saveState, log, recentLog, local, dayStartIso,
  think, thinkJson, parseJson, escapeRawNewlines, strictSchema, addUsage, usageSummary, exclusive, deepMerge, nowIso,
};
