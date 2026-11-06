'use strict';
/**
 * Jak handlowiec pisze. Treść maila składa model, ale ramy są stałe: tylko prawdziwe
 * obserwacje z audytu, jedna oferta na mail, efekt zamiast technologii, krótko i po ludzku.
 * Po napisaniu tekst przechodzi kontrolę stylu — jeśli brzmi jak AI, idzie do poprawki.
 */

const DEFAULT_OFFERS = {
  strona: {
    on: true,
    daily: 10,
    name: 'Strona z SEO i widocznością w AI',
    for: 'firmy ze słabą, starą stroną albo bez własnej strony',
    desc: `Nowa strona nastawiona na zapytania od klientów, nie na samo „ładnie wyglądać”.
SEO lokalne (żeby wyskakiwać na „{branża} {miasto}”) i optymalizacja pod wyszukiwarki AI:
ChatGPT, Perplexity, Google AI Overviews coraz częściej same polecają firmy, a polecają te,
o których mają uporządkowane informacje. Szybka na telefonie, z realizacjami i prostym kontaktem.`,
  },
  panel: {
    on: true,
    daily: 10,
    name: 'Panel administracyjny',
    for: 'firmy z porządną stroną, które mają dużo zapytań, klientów i projektów',
    desc: `Panel do prowadzenia firmy dopasowany do sposobu pracy: zapytania z formularza,
klienci, wyceny, projekty, terminy i pliki w jednym miejscu zamiast maili, Excela i notatek.
Efekt: żadne zapytanie nie ginie, wycena wychodzi w kilka minut, widać, co jest do zrobienia.
Więcej o panelach: 21project.pl/saas/`,
  },
  pakiet: {
    on: true,
    daily: 10,
    name: 'System pozyskiwania klientów',
    for: 'każda firma, która chce więcej klientów, a nie tylko nową stronę',
    desc: `Całość od jednego partnera: strona z SEO i widocznością w AI, panel do obsługi
zapytań i kampania reklamowa (Google/Meta) ustawiona pod konkretne usługi i miasto.
Efekt: stały dopływ zapytań i jasne liczby, ile kosztuje pozyskanie klienta.`,
  },
};

/** Realizacje wstawia system, nie model — dzięki temu adresy są zawsze dokładnie takie. */
const DEFAULT_PORTFOLIO = [
  { url: 'monikaserbista.pl', offers: ['strona', 'panel', 'pakiet'] },
  { url: 'noreststudio.com', offers: ['strona', 'panel', 'pakiet'] },
  { url: 'effkoweogrody.pl', offers: ['strona', 'pakiet'] },
];
const PORTFOLIO_ALL = '21project.pl/realizacje/';

/** Dwa haczyki na koniec maila. Agent rotuje je po równo, statystyki pokazują, który działa. */
const DEFAULT_HOOKS = {
  projekt: { on: true, name: 'Darmowy projekt 1. ekranu', text: 'Mogę bezpłatnie i bez zobowiązań przygotować wstępny projekt pierwszego ekranu nowej strony dla Państwa firmy, żeby zobaczyli Państwo kierunek, zanim cokolwiek Państwo zdecydują.' },
  audyt: { on: true, name: 'Darmowy audyt widoczności', text: 'Mogę bezpłatnie sprawdzić, czy Państwa firma pojawia się w Google i w ChatGPT, gdy klient szuka takich usług w Państwa mieście, i przesłać krótką listę, co poprawić.' },
};

const DEFAULT_STRATEGY = `Jesteś najlepszym handlowcem małego studia. Nie sprzedajesz strony, sprzedajesz rozwiązanie problemu:
więcej zapytań od właściwych klientów i mniej czasu straconego na obsługę.
Pisz jak człowiek do człowieka: krótkie zdania, zwykłe słowa, zero zachwytów i komplementów na zapas.
Realny problem tej branży: pracownia żyje z poleceń, ale polecony klient i tak sprawdza stronę,
a coraz częściej pyta ChatGPT „jakiego projektanta wnętrz w Krakowie polecasz”. Jeśli strona
i dane firmy są słabe, klient trafia do konkurencji, choć jej praca jest gorsza.
Pokazuj efekt, a nie technologię: zapytanie od klienta, a nie „meta tagi”.`;

const DEFAULT_FORBIDDEN = [
  'pozwolę sobie', 'chciałbym zaproponować', 'w ramach współpracy', 'pragnę', 'zwracam się', 'oferujemy kompleksow',
  'wyróżnić się na tle', 'przyciągnąć uwagę', 'kluczow', 'niezwykle', 'doskonał', 'idealne rozwiązanie', 'warto zainwestować',
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
  if (/\*|__|^#|^\s*[-•–]\s|[\u{1F300}-\u{1FAFF}]/mu.test(body)) problems.push('formatowanie (gwiazdki, podkreślenia, nagłówki, wypunktowania lub emotki)');
  if (/\s-\s/.test(body)) problems.push('myślnik między słowami — zamień na przecinek albo kropkę');
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > maxWords) problems.push(`za długi (${words} słów, maks. ${maxWords})`);
  if (/\b(ty|tobie|twoj\w*|ciebie|masz|możesz)\b/i.test(body)) problems.push('forma „Ty” zamiast „Pan/Pani/Państwo”');
  if (/https?:\/\//i.test(body)) problems.push('pełne linki z https:// — pisz same domeny, np. 21project.pl/saas/');
  if (/google\.[a-z.]+\/url/i.test(body)) problems.push('link przez przekierowanie Google');
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

/** Wzór stylu: mail z partii, który Jakub zaakceptował. Model ma pisać w tym tonie, nie kopiować go. */
const DEFAULT_STYLE_EXAMPLE = `Dzień dobry,

zajrzałem na stronę Państwa pracowni. Na telefonie trzeba ją powiększać palcami, a w Google wyświetla się tylko tytuł „Strona główna”, bez nazwy firmy.

Chciałem zapytać, czy nadal opłacają Państwo domenę i hosting tej strony? Jeśli tak, to szkoda, żeby strona, za którą Państwo płacą, nie pracowała w pełni na firmę. Odświeżona strona może dobrze wyglądać na telefonie, pokazywać realizacje i przynosić zapytania z Google.

[REALIZACJE]

Mogę bezpłatnie i bez zobowiązań przygotować wstępny projekt pierwszego ekranu nowej strony dla Państwa firmy. Zobaczą Państwo kierunek, zanim Państwo cokolwiek zdecydują.

Jeśli byliby Państwo zainteresowani, wystarczy krótka odpowiedź na tego maila.`;

function factsFor(lead, audit) {
  const lines = [
    `Firma: ${lead.company || audit.host || '—'}`,
    `Strona: ${audit.noOwnSite && !audit.host ? 'BRAK WŁASNEJ STRONY' : audit.host || lead.domain || 'brak własnej strony'}`,
    `Branża: ${lead.industry || 'nieznana'}`,
    `Miasto: ${lead.city || 'nieznane'}`,
    `Osoba: ${lead.name || 'nieznana, pisz do „Państwa”'}`,
  ];
  if (audit.title) lines.push(`Tytuł strony w Google: „${audit.title}”`);
  if (audit.description) lines.push(`Opis strony w Google: „${audit.description.slice(0, 160)}”`);
  if (audit.reasons?.length) lines.push('Sprawdzone obserwacje (wolno użyć tylko tych):', ...audit.reasons.map((r) => `- ${r}`));
  if (audit.text) lines.push(`Fragment tekstu ze strony (dla kontekstu, nie cytuj go dosłownie): ${audit.text.slice(0, 600)}`);
  if (audit.note) lines.push(`Notatka z researchu (wolno z niej korzystać, nic nie dopowiadaj): ${audit.note.slice(0, 500)}`);
  return lines.join('\n');
}

function systemPrompt(s, playbook) {
  return `${s.strategy}

BUDOWA MAILA (zawsze w tej kolejności, każdy punkt to osobny akapit):
1. „Dzień dobry,” w osobnej linii.
2. PROBLEM: jedna konkretna, sprawdzona obserwacja o stronie tej firmy (tylko z listy obserwacji)
   i co z niej wynika dla firmy. Gdy strona odstaje w wielu miejscach, opisz ogólne wrażenie
   jednym zdaniem i podaj jeden przykład. Gdy firma NIE MA własnej strony: napisz wprost, że
   nie znalazłeś jej strony, i co to oznacza (klient z polecenia albo z Google nie ma gdzie
   zobaczyć realizacji, a ChatGPT i Google polecają firmy, o których coś wiedzą).
3. ROZWIĄZANIE: co zrobiłbym w ramach oferty i jaki to daje efekt (zapytania, klienci, czas).
4. W osobnej linii dokładnie: [REALIZACJE]  (system wstawi tu listę moich realizacji z linkami)
5. HACZYK: przepisz własnymi słowami podany haczyk, w jednym–dwóch zdaniach.
6. Ostatnie zdanie: „Jeśli byliby Państwo zainteresowani, wystarczy krótka odpowiedź na tego maila.”

ZASADY (bezwzględne):
- po polsku, forma grzecznościowa: Pan/Pani/Państwo (do firmy: Państwo),
- maksymalnie ${s.maxWords} słów treści (bez listy realizacji), zwykły tekst bez formatowania,
- nie wymyślasz faktów o firmie: korzystasz tylko z danych i obserwacji poniżej,
- nie obiecujesz wyników ani miejsc w Google,
- nie wpisujesz żadnych adresów stron poza podanymi w opisie oferty; domeny bez https://,
- bez wykrzykników, bez długich myślników, bez zwrotów: ${s.forbidden.slice(0, 12).join(', ')},
- nie podpisujesz się (podpis „Pozdrawiam / 21 Project / 21project.pl” dokłada system).

JAK MA BRZMIEĆ: jak mail od jednej osoby do drugiej, pisany ręcznie w kilka minut. Spokojnie,
konkretnie, bez zachwytów i bez sprzedażowego zadęcia. Krótkie zdania. Zwykłe słowa, które
właściciel małej firmy powiedziałby przez telefon. Zero wyliczanek na trzy, zero metafor,
zero pytań retorycznych. Bez pogrubień, podkreśleń, gwiazdek, punktorów i emotek.
Tak brzmi mail, który się podoba (ton i długość, nie kopiuj treści):
---
${s.styleExample || DEFAULT_STYLE_EXAMPLE}
---
${playbook ? `\nWNIOSKI Z POPRZEDNICH TYGODNI (stosuj je):\n${playbook}\n` : ''}
Zwracasz wyłącznie JSON: {"subject": "...", "body": "...", "angle": "jednym zdaniem: jaki problem i efekt wybrałeś"}`;
}

function firstPrompt(lead, audit, offer, hook) {
  return `OFERTA DO TEGO MAILA: ${offer.name}
${offer.desc}

HACZYK DO TEGO MAILA: ${hook ? hook.text : 'bezpłatna, krótka rozmowa bez zobowiązań'}

DANE FIRMY:
${factsFor(lead, audit)}

Napisz pierwszego maila do tej firmy. Temat krótki i konkretny, bez clickbaitu (np. nazwa firmy albo pytanie).`;
}

/** Lista realizacji dla danej oferty, z linkiem „więcej” na końcu. */
function portfolioBlock(portfolio, offerKey) {
  const items = (portfolio || DEFAULT_PORTFOLIO).filter((p) => p.url && (!p.offers || p.offers.includes(offerKey))).slice(0, 3);
  return ['Kilka moich realizacji:', ...items.map((p) => p.url), `Więcej realizacji: ${PORTFOLIO_ALL}`].join('\n');
}

/** Wstawia realizacje w miejsce znacznika (albo przed haczyk, gdy model go pominął). */
function withPortfolio(body, block) {
  if (body.includes('[REALIZACJE]')) return body.replace(/\[REALIZACJE\]/, block);
  const parts = body.split(/\n\n/);
  const at = Math.max(1, parts.length - 2);
  parts.splice(at, 0, block);
  return parts.join('\n\n');
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
  DEFAULT_OFFERS, DEFAULT_STRATEGY, DEFAULT_FORBIDDEN, DEFAULT_STYLE_EXAMPLE, DEFAULT_PORTFOLIO, DEFAULT_HOOKS, PORTFOLIO_ALL, SIGNATURE,
  styleCheck, tidy, systemPrompt, firstPrompt, followUpPrompt, factsFor, portfolioBlock, withPortfolio,
};
