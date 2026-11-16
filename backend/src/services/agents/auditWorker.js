'use strict';
/**
 * Wątek pomocniczy audytu stron. Uruchamiany przez siteAudit.runIsolated — liczy analizę
 * HTML-a poza głównym wątkiem serwera, żeby ciężka strona nie blokowała panelu.
 */
const { parentPort, workerData } = require('node:worker_threads');
const siteAudit = require('./siteAudit');

const ALLOWED = new Set(['analyzeHtml', 'extractEmails']);
try {
  if (!ALLOWED.has(workerData.fn)) throw new Error(`nieznana funkcja ${workerData.fn}`);
  parentPort.postMessage({ ok: true, result: siteAudit[workerData.fn](...workerData.args) });
} catch (err) {
  parentPort.postMessage({ ok: false, error: err.message });
}
