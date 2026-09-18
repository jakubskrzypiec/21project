'use strict';
/**
 * Pytania briefu klienckiego — jedno źródło prawdy.
 *
 * Z tej listy powstaje i formularz, który wypełnia klient, i widok odpowiedzi
 * w panelu. Gdyby definicje żyły w dwóch miejscach, po pierwszej zmianie pytania
 * panel pokazywałby odpowiedzi podpisane starymi etykietami.
 *
 * Pól jest celowo niewiele. Brief, który zajmuje pół godziny, zostaje niewypełniony.
 */

const SEKCJE = [
  {
    id: 'podstawy',
    tytul: 'Podstawy',
    opis: 'Do kogo mam się odzywać i pod jaką nazwą pracujemy.',
    pola: [
      { id: 'firma', etykieta: 'Nazwa firmy lub pracowni', typ: 'text', wymagane: true, placeholder: 'np. Pracownia Wnętrz Kowalska' },
      { id: 'osoba', etykieta: 'Osoba do kontaktu', typ: 'text', placeholder: 'Imię i nazwisko' },
      { id: 'email', etykieta: 'E-mail', typ: 'email', wymagane: true, placeholder: 'kontakt@twojafirma.pl' },
      { id: 'telefon', etykieta: 'Telefon', typ: 'text', placeholder: 'Opcjonalnie' },
      { id: 'obecna_strona', etykieta: 'Obecna strona, jeśli jest', typ: 'text', placeholder: 'https://…' },
    ],
  },
  {
    id: 'oferta',
    tytul: 'Czym się zajmujecie',
    opis: 'To trafi na stronę jako treść, więc pisz tak, jak tłumaczysz to klientowi przez telefon.',
    pola: [
      { id: 'czym_sie_zajmujecie', etykieta: 'Krótko o firmie i usługach', typ: 'obszar', wymagane: true,
        placeholder: 'Czym się zajmujecie, dla kogo pracujecie, co Was odróżnia od firmy obok.' },
      { id: 'uslugi', etykieta: 'Usługi do wypisania na stronie', typ: 'obszar',
        placeholder: 'Po jednej w linii. Jeśli macie ceny lub widełki — dopisz, bardzo pomagają.' },
      { id: 'teksty', etykieta: 'Skąd teksty na stronę?', typ: 'wybor',
        opcje: ['Mam gotowe, prześlę', 'Mam częściowo', 'Potrzebuję, żebyś napisał'] },
    ],
  },
  {
    id: 'styl',
    tytul: 'Styl i kolory',
    opis: 'Tu nie ma złych odpowiedzi. Im szczerzej, tym mniej rund poprawek.',
    pola: [
      { id: 'styl', etykieta: 'Jaki styl Wam odpowiada?', typ: 'wielokrotny',
        opcje: ['Minimalistyczny', 'Elegancki', 'Odważny, mocny', 'Ciepły, przytulny', 'Techniczny, konkretny', 'Klasyczny'] },
      { id: 'czego_nie', etykieta: 'Czego na pewno NIE chcecie', typ: 'obszar',
        placeholder: 'np. ciemnych tanich szablonów, stockowych zdjęć z uśmiechniętymi ludźmi, migających animacji' },
      { id: 'kolory', etykieta: 'Kolory — preferowane i zakazane', typ: 'obszar',
        placeholder: 'np. beże i biel; unikać czerwieni. Jeśli macie kolory z logo, podaj je tutaj.' },
      { id: 'logo', etykieta: 'Macie logo?', typ: 'wybor',
        opcje: ['Tak, mam plik wektorowy', 'Tak, ale tylko obrazek', 'Nie mam', 'Mam księgę znaku'] },
      { id: 'czcionki', etykieta: 'Czcionki', typ: 'wybor',
        opcje: ['Mamy narzucone w identyfikacji', 'Mam preferencje, opiszę niżej', 'Zostawiam Tobie'] },
      { id: 'czcionki_opis', etykieta: 'Jeśli macie konkretne czcionki — jakie?', typ: 'text',
        placeholder: 'Nazwy albo opis: szeryfowa i elegancka, bezszeryfowa i prosta…' },
    ],
  },
  {
    id: 'inspiracje',
    tytul: 'Inspiracje',
    opis: 'Najważniejsza sekcja w całym briefie. Dwa–trzy linki mówią więcej niż strona opisu.',
    pola: [
      { id: 'inspiracja_1', etykieta: 'Strona, która Wam się podoba', typ: 'text', placeholder: 'https://…' },
      { id: 'inspiracja_1_co', etykieta: 'Co konkretnie się w niej podoba?', typ: 'text', placeholder: 'np. duże zdjęcia i dużo powietrza' },
      { id: 'inspiracja_2', etykieta: 'Druga strona', typ: 'text', placeholder: 'https://…' },
      { id: 'inspiracja_2_co', etykieta: 'Co się w niej podoba?', typ: 'text' },
      { id: 'antyprzyklad', etykieta: 'Strona, która Wam się NIE podoba', typ: 'text', placeholder: 'Bardzo pomaga. https://…' },
    ],
  },
  {
    id: 'materialy',
    tytul: 'Zdjęcia i realizacje',
    opis: 'Zdjęcia decydują o tym, jak strona wygląda, bardziej niż sam projekt.',
    pola: [
      { id: 'zdjecia', etykieta: 'Macie własne zdjęcia?', typ: 'wybor',
        opcje: ['Tak, dobrej jakości', 'Mam, ale słabe', 'Nie mam — trzeba coś wymyślić'] },
      { id: 'realizacje', etykieta: 'Ile realizacji chcecie pokazać?', typ: 'wybor',
        opcje: ['Nie pokazujemy realizacji', '1–3', '4–8', 'Więcej niż 8'] },
      { id: 'realizacje_opis', etykieta: 'Krótko o realizacjach, które warto pokazać', typ: 'obszar',
        placeholder: 'Nazwy, miejsca, czym się wyróżniają.' },
    ],
  },
  {
    id: 'kontakt',
    tytul: 'Kontakt i social media',
    opis: 'Tym, co tu wpiszesz, strona będzie zbierać zapytania.',
    pola: [
      { id: 'formy_kontaktu', etykieta: 'Jak klienci mają się z Wami kontaktować?', typ: 'wielokrotny',
        opcje: ['Telefon', 'Formularz na stronie', 'E-mail', 'WhatsApp', 'Messenger', 'Instagram'] },
      { id: 'socials', etykieta: 'Linki do social mediów', typ: 'obszar',
        placeholder: 'Facebook, Instagram, TikTok, Google — po jednym w linii.' },
      { id: 'obszar_dzialania', etykieta: 'Gdzie działacie?', typ: 'text',
        placeholder: 'np. Katowice i okolice do 30 km / cała Polska zdalnie' },
    ],
  },
  {
    id: 'priorytety',
    tytul: 'Na czym Wam najbardziej zależy',
    opis: 'Oceń każdą rzecz od 1 do 5. Nie wszystko może być piątką — to właśnie jest tu sensem.',
    typ: 'tabela',
    wiersze: [
      { id: 'wyglad', etykieta: 'Wygląd, żeby robił wrażenie' },
      { id: 'google', etykieta: 'Widoczność w Google' },
      { id: 'szybkosc', etykieta: 'Szybkość działania' },
      { id: 'telefon', etykieta: 'Żeby klienci częściej dzwonili' },
      { id: 'edycja', etykieta: 'Żebym mógł samodzielnie zmieniać treści' },
      { id: 'rozbudowa', etykieta: 'Możliwość rozbudowy w przyszłości' },
    ],
  },
  {
    id: 'koniec',
    tytul: 'Na koniec',
    pola: [
      { id: 'termin', etykieta: 'Na kiedy potrzebujecie strony?', typ: 'text', placeholder: 'np. do końca października / bez pośpiechu' },
      { id: 'uwagi', etykieta: 'Cokolwiek jeszcze, co powinienem wiedzieć', typ: 'obszar',
        placeholder: 'Tu wchodzi wszystko, co nie zmieściło się wyżej.' },
    ],
  },
];

/** Płaska mapa pól — panel po niej podpisuje odpowiedzi ich etykietami. */
function wszystkiePola() {
  const out = [];
  for (const s of SEKCJE) {
    if (s.typ === 'tabela') {
      for (const w of s.wiersze) out.push({ id: `priorytet_${w.id}`, etykieta: w.etykieta, typ: 'ocena', sekcja: s.tytul });
    } else {
      for (const p of s.pola) out.push({ ...p, sekcja: s.tytul });
    }
  }
  return out;
}

module.exports = { SEKCJE, wszystkiePola };
