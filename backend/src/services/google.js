'use strict';
const { google } = require('googleapis');
const { config } = require('../config');
const { db } = require('../db');

const PROVIDER = 'google';

function isConfigured() {
  return Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri);
}

function oauthClient() {
  if (!isConfigured()) throw new Error('Brak konfiguracji Google OAuth w .env (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI).');
  return new google.auth.OAuth2(config.google.clientId, config.google.clientSecret, config.google.redirectUri);
}

function authUrl(state) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: config.google.scopes,
    state,
  });
}

function saveTokens(tokens, accountEmail) {
  const existing = getStoredTokens();
  db.prepare(
    `INSERT INTO oauth_tokens (provider, account_email, access_token, refresh_token, scope, expiry_date, updated_at)
     VALUES (@p, @email, @access, @refresh, @scope, @expiry, @updated)
     ON CONFLICT(provider) DO UPDATE SET
       account_email = excluded.account_email,
       access_token  = excluded.access_token,
       refresh_token = COALESCE(excluded.refresh_token, oauth_tokens.refresh_token),
       scope         = excluded.scope,
       expiry_date   = excluded.expiry_date,
       updated_at    = excluded.updated_at`
  ).run({
    p: PROVIDER,
    email: accountEmail || existing?.account_email || null,
    access: tokens.access_token || null,
    refresh: tokens.refresh_token || null,
    scope: tokens.scope || null,
    expiry: tokens.expiry_date || null,
    updated: new Date().toISOString(),
  });
}

const getStoredTokens = () => db.prepare('SELECT * FROM oauth_tokens WHERE provider = ?').get(PROVIDER);

function disconnect() {
  db.prepare('DELETE FROM oauth_tokens WHERE provider = ?').run(PROVIDER);
}

/** Klient z tokenami z bazy; sam odświeża access_token i zapisuje go z powrotem. */
function authorized() {
  const row = getStoredTokens();
  if (!row || !row.refresh_token) {
    const err = new Error('Konto Google nie jest połączone. Wejdź w Ustawienia → Połącz Google.');
    err.code = 'GOOGLE_NOT_CONNECTED';
    throw err;
  }
  const client = oauthClient();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
    scope: row.scope,
  });
  client.on('tokens', (t) => saveTokens(t, row.account_email));
  return client;
}

async function exchangeCode(code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  let email = null;
  try {
    const info = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    email = info.data.email || null;
  } catch { /* adres e-mail jest opcjonalny */ }
  saveTokens(tokens, email);
  return { email };
}

const gmail = () => google.gmail({ version: 'v1', auth: authorized() });
const calendar = () => google.calendar({ version: 'v3', auth: authorized() });

function status() {
  const row = getStoredTokens();
  return {
    configured: isConfigured(),
    connected: Boolean(row && row.refresh_token),
    account: row?.account_email || null,
    scopes: row?.scope ? row.scope.split(' ') : [],
    updatedAt: row?.updated_at || null,
  };
}

module.exports = { isConfigured, authUrl, exchangeCode, gmail, calendar, status, disconnect, authorized };
