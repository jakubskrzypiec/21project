'use strict';
/**
 * Proces panelu ↔ proces agentów. Agenci (na razie Handlowiec) liczą, czytają strony i piszą
 * maile w osobnym procesie Node (src/agentRunner.js). Panel tylko go uruchamia, pilnuje i zleca
 * mu ręczne przebiegi. Jeśli proces agentów się zawiesi albo padnie, panel dalej działa,
 * a proces jest ubijany i stawiany od nowa.
 */
const path = require('node:path');
const { fork } = require('node:child_process');
const core = require('./core');

const SCRIPT = path.join(__dirname, '..', '..', 'agentRunner.js');
const PING_EVERY_MS = Number(process.env.AGENT_PING_MS) || 30_000;
const DEAD_AFTER_MS = Number(process.env.AGENT_DEAD_MS) || 3 * 60_000;   // tyle bez odpowiedzi = proces wisi
const CALL_TIMEOUT_MS = 15 * 60_000;

let child = null;
let lastPong = 0;
let seq = 0;
let started = false;
const pending = new Map();

function spawn() {
  lastPong = Date.now();
  child = fork(SCRIPT, [], { stdio: 'inherit', execArgv: ['--max-old-space-size=384'] });
  const me = child;
  me.on('message', (m) => {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'pong') lastPong = Date.now();
    else if (m.type === 'busy') core.setRemoteBusy(m.name, m.busy);
    else if (m.type === 'result' && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.ok) p.resolve(m.result); else p.reject(new Error(m.error));
    }
  });
  me.on('exit', (code, signal) => {
    if (child === me) child = null;
    core.setRemoteBusy('handlowiec', false);
    for (const [id, p] of pending) { clearTimeout(p.timer); p.reject(new Error('proces agentów został zrestartowany')); pending.delete(id); }
    console.error(`[agenci] proces zakończony (${signal || code}) — start za 10 s`);
    setTimeout(() => { if (!child) spawn(); }, 10_000).unref();
  });
}

function start() {
  if (started) return;
  started = true;
  spawn();
  setInterval(() => {
    if (!child) return;
    if (Date.now() - lastPong > DEAD_AFTER_MS) {
      console.error('[agenci] proces agentów nie odpowiada od 3 min — ubijam i stawiam od nowa');
      try { core.log('handlowiec', 'error', 'Przebieg zawiesił się i został przerwany (restart procesu agenta).'); } catch { /* baza */ }
      child.kill('SIGKILL');
      return;
    }
    try { child.send({ type: 'ping' }); } catch { /* zaraz przyjdzie exit */ }
  }, PING_EVERY_MS).unref();
}

/** Zlecenie dla procesu agentów, np. call('tick', { force: true }). */
function call(cmd, args = {}) {
  if (!child) return Promise.reject(new Error('Proces agentów właśnie się uruchamia — spróbuj za chwilę.'));
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Przebieg trwa za długo — sprawdź dziennik agenta.')); }, CALL_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    child.send({ type: 'call', id, cmd, args });
  });
}

module.exports = { start, call };
