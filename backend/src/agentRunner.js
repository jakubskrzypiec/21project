'use strict';
/**
 * Osobny proces agentów AI. Uruchamia go panel (services/agents/runner.js), nie Railway.
 * Tu działa harmonogram Handlowca: co 5 minut przebieg, w poniedziałek rano nauka.
 * Proces odpowiada na „ping” od panelu — kiedy przestaje, panel go ubija i stawia od nowa.
 */
const cron = require('node-cron');
const { config } = require('./config');
const { init } = require('./db');

init();
const core = require('./services/agents/core');
const handlowiec = require('./services/agents/handlowiec');

const COMMANDS = {
  tick: (a) => handlowiec.tick({ force: Boolean(a.force) }),
  learn: (a) => handlowiec.learn({ force: Boolean(a.force) }),
};

process.on('message', async (m) => {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'ping') { process.send({ type: 'pong' }); return; }
  if (m.type !== 'call' || !COMMANDS[m.cmd]) return;
  try {
    const result = await COMMANDS[m.cmd](m.args || {});
    process.send({ type: 'result', id: m.id, ok: true, result });
  } catch (err) {
    process.send({ type: 'result', id: m.id, ok: false, error: err.message });
  }
});
// Panel zniknął — kończymy razem z nim.
process.on('disconnect', () => process.exit(0));

const tz = { timezone: config.outreach.timezone };
cron.schedule('*/5 * * * *', async () => {
  try {
    const r = await handlowiec.tick();
    if (r?.sent?.ok) console.log('[handlowiec] wysłano maila');
  } catch (err) {
    console.error('[handlowiec]', err.message);
    try { core.log('handlowiec', 'error', `Przebieg przerwany: ${err.message}`); } catch { /* baza niedostępna */ }
  }
}, tz);

// Cotygodniowa nauka na wynikach — poniedziałek rano, przed wysyłką.
cron.schedule('20 6 * * 1', async () => {
  try { if (handlowiec.settings().enabled) await handlowiec.learn(); }
  catch (err) { core.log('handlowiec', 'error', `Nauka: ${err.message}`); }
}, tz);

console.log('[agenci] proces agentów działa');
