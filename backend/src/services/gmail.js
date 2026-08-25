'use strict';
const { gmail } = require('./google');
const { config } = require('../config');

const headerOf = (msg, name) =>
  (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

function decode(data) {
  return Buffer.from(String(data || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/** Wyciąga treść tekstową (preferuje text/plain, w ostateczności odziera HTML ze znaczników). */
function extractBody(payload) {
  if (!payload) return '';
  const parts = [];
  (function walk(p) {
    if (p.parts) p.parts.forEach(walk);
    else if (p.body?.data) parts.push({ mime: p.mimeType, text: decode(p.body.data) });
  })(payload);
  if (payload.body?.data && !parts.length) parts.push({ mime: payload.mimeType, text: decode(payload.body.data) });
  const plain = parts.find((p) => p.mime === 'text/plain');
  if (plain) return plain.text;
  const html = parts.find((p) => p.mime === 'text/html');
  if (html) {
    return html.text
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return '';
}

function attachmentsOf(payload) {
  const out = [];
  (function walk(p) {
    if (!p) return;
    if (p.filename && p.body?.attachmentId) {
      out.push({ id: p.body.attachmentId, filename: p.filename, mime: p.mimeType, size: p.body.size });
    }
    (p.parts || []).forEach(walk);
  })(payload);
  return out;
}

async function listThreads({ q = '', labelIds, maxResults = 25, pageToken } = {}) {
  const api = gmail();
  const { data } = await api.users.threads.list({
    userId: 'me',
    q: q || undefined,
    labelIds: labelIds || undefined,
    maxResults,
    pageToken: pageToken || undefined,
  });
  const threads = await Promise.all(
    (data.threads || []).map(async (t) => {
      const full = await api.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });
      const msgs = full.data.messages || [];
      const last = msgs[msgs.length - 1] || {};
      const labels = new Set(msgs.flatMap((m) => m.labelIds || []));
      return {
        id: t.id,
        snippet: t.snippet,
        messages: msgs.length,
        from: headerOf(last, 'From'),
        to: headerOf(last, 'To'),
        subject: headerOf(last, 'Subject') || '(bez tematu)',
        date: headerOf(last, 'Date'),
        internalDate: Number(last.internalDate || 0),
        unread: labels.has('UNREAD'),
        starred: labels.has('STARRED'),
        labels: [...labels].filter((l) => !l.startsWith('CATEGORY_')),
      };
    })
  );
  return { threads, nextPageToken: data.nextPageToken || null };
}

async function getThread(id) {
  const { data } = await gmail().users.threads.get({ userId: 'me', id, format: 'full' });
  return {
    id: data.id,
    messages: (data.messages || []).map((m) => ({
      id: m.id,
      from: headerOf(m, 'From'),
      to: headerOf(m, 'To'),
      cc: headerOf(m, 'Cc'),
      subject: headerOf(m, 'Subject'),
      date: headerOf(m, 'Date'),
      internalDate: Number(m.internalDate || 0),
      unread: (m.labelIds || []).includes('UNREAD'),
      body: extractBody(m.payload),
      attachments: attachmentsOf(m.payload),
      messageId: headerOf(m, 'Message-ID'),
      references: headerOf(m, 'References'),
    })),
  };
}

function buildRaw({ to, subject, body, from, inReplyTo, references, cc }) {
  const enc = (s) => `=?UTF-8?B?${Buffer.from(String(s), 'utf8').toString('base64')}?=`;
  const lines = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    from ? `From: ${from}` : null,
    `Subject: ${enc(subject)}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(body), 'utf8').toString('base64'),
  ].filter(Boolean);
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}

async function sendMessage({ to, subject, body, cc, threadId, inReplyTo, references }) {
  const account = require('./google').status().account;
  const from = account ? `${config.outreach.fromName} <${account}>` : undefined;
  const raw = buildRaw({ to, subject, body, from, cc, inReplyTo, references });
  const { data } = await gmail().users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId: threadId || undefined },
  });
  return { id: data.id, threadId: data.threadId };
}

async function createDraft({ to, subject, body, threadId }) {
  const account = require('./google').status().account;
  const from = account ? `${config.outreach.fromName} <${account}>` : undefined;
  const raw = buildRaw({ to, subject, body, from });
  const { data } = await gmail().users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw, threadId: threadId || undefined } },
  });
  return { id: data.id, messageId: data.message?.id, threadId: data.message?.threadId };
}

const modifyThread = (id, addLabelIds = [], removeLabelIds = []) =>
  gmail().users.threads.modify({ userId: 'me', id, requestBody: { addLabelIds, removeLabelIds } });

const trashThread = (id) => gmail().users.threads.trash({ userId: 'me', id });

async function labels() {
  const { data } = await gmail().users.labels.list({ userId: 'me' });
  return (data.labels || []).map((l) => ({ id: l.id, name: l.name, type: l.type }));
}

async function unreadCount() {
  const { data } = await gmail().users.labels.get({ userId: 'me', id: 'INBOX' });
  return { unread: data.messagesUnread || 0, total: data.messagesTotal || 0 };
}

module.exports = {
  listThreads, getThread, sendMessage, createDraft, modifyThread, trashThread, labels, unreadCount,
};
