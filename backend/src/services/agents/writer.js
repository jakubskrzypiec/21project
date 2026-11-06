'use strict';
/**
 * Jak handlowiec pisze. Treść maila składa model, ale ramy są stałe: tylko prawdziwe
 * obserwacje z audytu, jedna oferta na mail, efekt zamiast technologii, krótko i po ludzku.
 * Po napisaniu tekst przechodzi kontrolę stylu — jeśli brzmi jak AI, idzie do poprawki.
 */

const DEFAULT_OFFERS = {
  strona: {
    on: true,
    weight: 1,
    name: 'Strona z SEO i widocznością w AI',
    for: 'firmy ze słabą, starą stroną albo bez własnej strony',
    desc: `Nowa strona nastawiona na zapytania od klientów, nie na samo „ładnie wyglądać”.
SEO lokalne (żeby wyskakiwać na „{branża} {miasto}”) i optymalizacja pod wyszukiwarki AI:
ChatGPT, Perplexity, Google AI Overviews coraz częściej same polecają firmy, a polecają te,
o których mają uporządkowane informacje. Szybka na telefonie, z realizacjami i prostym kontaktem.
Haczyk: bezpłatny projekt pierwszego ekranu nowej strony albo krótki test, czy ChatGPT poleca firmę.
Realizacje: noreststudio.com, cosinteriors.pl, effkoweogrody.pl, więcej: 21project.pl/realizacje/`,
  },
  panel: {
    on: true,
    weight: 1,
    name: 'Panel administracyjny',
    for: 'firmy z porządną stroną, które mają dużo zapytań, klientów i projektów',
    desc: `Panel do prowadzenia firmy dopasowany do sposobu pracy: zapytania z formularza,
klienci, wyceny, projekty, terminy i pliki w jednym miejscu zamiast maili, Excela i notatek.
Efekt: żadne zapytanie nie ginie, wycena wychodzi w kilka minut, widać, co jest do zrobienia.
Haczyk: bezpłatna rozmowa 15 min i makieta panelu pod ich firmę.
Więcej: 21project.pl/saas/`,
  },
  pakiet: {
    on: true,
    weight: 1,
    name: 'System pozyskiwania klientów',
    for: 'każda firma, która chce więcej klientów, a nie tylko nową stronę',
    desc: `Całość od jednego partnera: strona z SEO i widocznością w AI, panel do obsługi
zapytań i kampania reklamowa (Google/Meta) ustawiona pod konkretne usługi i miasto.
Efekt: stały dopływ zapytań i jasne liczby, ile kosztuje pozyskanie klienta.
Haczyk: bezpłatny plan na pierwsze 90 dni, co zrobić, żeby zapytań było więcej.`,
  },
};

const DEFAULT_STRATEGY = `Jesteś najlepszym handlowcem małego studia. Nie sprzedajesz strony, sprzedajesz efekt:
więcej zapytań od właściwych klientów i mniej czasu straconego na obsługę.
1. Zacznij od jednej konkretnej, sprawdzonej obserwacji o tej firmie (z audytu). Bez komplementów na zapas.
2. Nazwij realny problem tej branży. Przykład: pracownia żyje z poleceń, ale polecony klient i tak
   sprawdza stronę, a coraz częściej pyta ChatGPT „jakiego projektanta wnętrz w Krakowie polecasz”.
   Jeśli strona i dane firmy są słabe, klient trafia do konkurencji, choć praca jest gorsza.
3. Pokaż efekt, a nie technologię: telefon/zapytanie, a nie „meta tagi”.
4. Jeden haczyk bez ryzyka (coś za darmo i bez zobowiązań) i jedno łatwe pytanie na końcu,
   na które da się odpisać jednym słowem.
5. Pisz jak człowiek do człowieka: krótkie zdania, zwykłe słowa, zero zachwytów.`;

const DEFAULT_FORBIDDEN = [
  'mam nadzieję, że', 'w dzisiejszych czasach', 'w dzisiejszym cyfrowym', 'cyfrowym świecie', 'kompleksow',
  'innowacyjn', 'nowoczesne rozwiązania', 'zachęcam do kontaktu', 'nie wahaj', 'serdecznie zapraszam',
  'z przyjemnością', 'gwarantuj', 'wzrost sprzedaży o', 'pierwsze miejsce w google', 'synerg', 'holistyczn',
  'kluczowe znaczenie', 'w erze', 'przenieść na wyższy poziom', 'nie będę więcej pisał', 'rewolucj', 'game changer',
  'unikaln', 'skontaktuj się', 'dynamicznie', 'zwiększyć konwersję',
];

const SIGNATURE = 'Pozdrawiam\n21 Project\n21project.pl';

/** Kontrola stylu: zwraca listę problemów (pusta lista = tekst OK). */
function styleCheck(body, subject, { forbidden = DEFAULT_FORBIDDEN, maxWords = 150 } = {}) {
  const problems = [];
  const text = `${subject}\n${body}`;
  const low = text.toLowerCase();
  for (const f of forbidden) if (f && low.includes(f.toLowerCase())) problems.push(`zakazany zwrot: „${f}”`);
  if (/[—–]/.test(text)) problems.push('długie myślniki (— –) — typowe dla AI, zamień na przecinek lub kropkę');
  if (/!/.test(text)) problems.push('wykrzyknik');
  if (/\*\*|^#|^\s*[-•]\s/m.test(body)) problems.push('formatowanie (pogrubienia, nagłówki lub wypunktowania)');
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > maxWords) problems.push(`za długi (${words} słów, maks. ${maxWords})`);
  if (/\b(ty|tobie|twoj\w*|ciebie|masz|możesz)\b/i.test(body)) problems.push('forma „Ty” zamiast „Pan/Pani/Państwo”');
  if (/https?:\/\//i.test(body)) problems.push('pełne linki z https:// — pisz same domeny, np. 21project.pl/saas/');
  if (/pozdrawiam/i.test(body)) problems.push('podpis w treści (podpis dokłada system)');
  if (subject.length > 70) problems.push('za długi temat');
  return problems;
}

/** Drobne poprawki, które można zrobić bez modelu. */
function tidy(body) {
  return String(body)
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/!/g, '.')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function factsFor(lead, audit) {
  const lines = [
    `Firma: ${lead.company || audit.host || '—'}`,
    `Strona: ${audit.host || lead.domain || 'brak własnej strony'}`,
    `Branża: ${lead.industry || 'nieznana'}`,
    `Miasto: ${lead.city || 'nieznane'}`,
    `Osoba: ${lead.name || 'nieznana, pisz do „Państwa”'}`,
  ];
  if (audit.title) lines.push(`Tytuł strony w Google: „${audit.title}”`);
  if (audit.description) lines.push(`Opis strony w Google: „${audit.description.slice(0, 160)}”`);
  if (audit.reasons?.length) lines.push('Sprawdzone obserwacje (wolno użyć tylko tych):', ...audit.reasons.map((r) => `- ${r}`));
  if (audit.text) lines.push(`Fragment tekstu ze strony (dla kontekstu, nie cytuj go dosłownie): ${audit.text.slice(0, 600)}`);
  return lines.join('\n');
}

function systemPrompt(s, playbook) {
  return `${s.strategy}

ZASADY PISANIA (bezwzględne):
- po polsku, forma grzecznościowa: Pan/Pani/Państwo (do firmy: Państwo),
- zaczynasz od „Dzień dobry,” w osobnej linii,
- maksymalnie ${s.maxWords} słów treści, 3–5 krótkich akapitów, zwykły tekst bez formatowania,
- nie wymyślasz faktów o firmie: korzystasz tylko z danych i obserwacji poniżej,
- nie obiecujesz wyników ani miejsc w Google,
- domeny piszesz bez https:// (np. 21project.pl/realizacje/),
- bez wykrzykników, bez długich myślników, bez zwrotów: ${s.forbidden.slice(0, 12).join(', ')},
- nie podpisujesz się (podpis „Pozdrawiam / 21 Project / 21project.pl” dokłada system),
- ostatnie zdanie to łatwe pytanie albo „Jeśli byliby Państwo zainteresowani, wystarczy krótka odpowiedź na tego maila.”
${playbook ? `\nWNIOSKI Z POPRZEDNICH TYGODNI (stosuj je):\n${playbook}\n` : ''}
Zwracasz wyłącznie JSON: {"subject": "...", "body": "...", "angle": "jednym zdaniem: jaki haczyk wybrałeś"}`;
}

function firstPrompt(lead, audit, offer) {
  return `OFERTA DO TEGO MAILA: ${offer.name}
${offer.desc}

DANE FIRMY:
${factsFor(lead, audit)}

Napisz pierwszego maila do tej firmy. Temat krótki, konkretny, bez clickbaitu (np. nazwa firmy albo pytanie).`;
}

function followUpPrompt(first, offer, lead) {
  return `Kilka dni temu wysłałeś do firmy ${lead.company || lead.domain} tego maila i nie było odpowiedzi:
---
${first.body}
---
Oferta: ${offer.name}

Napisz krótkie przypomnienie (40–70 słów) w tym samym wątku. Nie powtarzaj pierwszego maila,
dodaj jedną nową, konkretną korzyść albo pytanie. Bez wyrzutów („nie otrzymałem odpowiedzi”).
Temat zostaw pusty (""), bo odpowiadamy w wątku.`;
}

module.exports = {
  DEFAULT_OFFERS, DEFAULT_STRATEGY, DEFAULT_FORBIDDEN, SIGNATURE,
  styleCheck, tidy, systemPrompt, firstPrompt, followUpPrompt, factsFor,
};
