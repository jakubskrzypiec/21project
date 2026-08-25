'use strict';
const { config } = require('../config');

const enabled = () => Boolean(config.ai.apiKey);

async function complete({ system, prompt, maxTokens = 1200, temperature = 0.6 }) {
  if (!enabled()) throw new Error('Brak ANTHROPIC_API_KEY w .env — generowanie treści wyłączone.');
  const res = await fetch(`${config.ai.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.ai.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.ai.model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
}

const SYSTEM = `Jesteś asystentem Jakuba Skrzypca, który prowadzi studio 21 project (21project.pl)
i projektuje strony internetowe dla firm ze Śląska i całej Polski. Piszesz pierwsze wiadomości
handlowe po polsku.

Zasady:
- maksymalnie 130 słów, prosty język, bez marketingowego żargonu i bez wykrzykników,
- pierwsze zdanie musi odnosić się do konkretu z analizy strony odbiorcy, nie do ogólników,
- najwyżej dwa problemy techniczne, opisane po ludzku (nie "brak meta viewport", tylko
  "strona rozjeżdża się na telefonie"),
- jedno pytanie na końcu, bez presji, bez "gwarantuję wzrost sprzedaży",
- żadnych obietnic pozycji w Google ani wymyślonych danych,
- nie wymyślaj faktów o firmie, korzystaj wyłącznie z przekazanej analizy,
- podpis: Jakub Skrzypiec, 21 project, 601 863 788, https://21project.pl.

Zwróć wynik jako czysty JSON: {"subject": "...", "body": "..."} — bez bloków kodu.`;

/** Pisze spersonalizowaną wiadomość na podstawie audytu strony leada. */
async function draftOutreach(lead, extra = {}) {
  const audit = lead.audit ? (typeof lead.audit === 'string' ? JSON.parse(lead.audit) : lead.audit) : {};
  const prompt = `Dane firmy:
- nazwa: ${lead.company || lead.domain || '—'}
- osoba kontaktowa: ${lead.name || 'nieznana (napisz bezosobowo: "Dzień dobry,")'}
- strona: ${lead.website || lead.domain || '—'}
- branża: ${lead.industry || 'nieznana'}
- miasto: ${lead.city || 'nieznane'}

Wynik automatycznej analizy strony (${lead.score ?? '—'}/100 punktów potencjału):
${(audit.reasons || extra.reasons || []).map((r) => `- ${r}`).join('\n') || '- brak szczegółów'}

Dodatkowe dane techniczne: ${JSON.stringify(
    {
      title: audit.title,
      opisDlugosc: audit.descriptionLength,
      responsywna: audit.hasViewport,
      https: audit.https,
      technologie: audit.tech,
      czasOdpowiedziMs: audit.responseMs,
    },
    null,
    0
  )}

${extra.instructions ? `Dodatkowe wytyczne od Jakuba: ${extra.instructions}` : ''}

Napisz pierwszą wiadomość e-mail.`;

  const raw = await complete({ system: SYSTEM, prompt });
  const json = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(json);
    if (!parsed.subject || !parsed.body) throw new Error('brak pól');
    return { subject: String(parsed.subject).trim(), body: String(parsed.body).trim() };
  } catch {
    // Model odpowiedział zwykłym tekstem — bierzemy pierwszy wiersz jako temat.
    const [first, ...rest] = raw.split('\n');
    return { subject: first.replace(/^temat:\s*/i, '').slice(0, 120), body: rest.join('\n').trim() };
  }
}

/** Krótkie streszczenie wątku e-mail dla widoku poczty. */
async function summarizeThread(messages) {
  const text = messages
    .map((m) => `Od: ${m.from}\nData: ${m.date}\n${m.body}`)
    .join('\n\n---\n\n')
    .slice(0, 12000);
  return complete({
    system: 'Streszczasz wątki e-mail po polsku dla właściciela studia webowego. Zwięźle, rzeczowo.',
    prompt: `Streść wątek w 3 punktach i dopisz jedną linię "Następny krok: ...".\n\n${text}`,
    maxTokens: 400,
    temperature: 0.3,
  });
}

module.exports = { enabled, complete, draftOutreach, summarizeThread };
