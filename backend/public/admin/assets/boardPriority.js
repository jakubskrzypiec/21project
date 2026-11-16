/**
 * Priorytety na tablicy. Z danych, które i tak są na kartce (czyj ruch, termin, ostatni
 * kontakt, status), liczy, w której sekcji kartka stoi i jak wysoko. Ten sam plik czyta
 * panel w przeglądarce i testy w Node, żeby reguły były w jednym miejscu.
 *
 * Sekcje:
 *   ruch    — piłka po Twojej stronie albo zbliża się termin, albo klient milczy za długo
 *   czeka   — czekasz na klienta (jeszcze nie za długo)
 *   spokoj  — wstrzymane i rzeczy bez ruchu, terminu i ustaleń
 *   zrobione
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoardPriority = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CISZA_DNI_ROBOCZYCH = 5;          // po tylu dniach ciszy klienta trzeba się przypomnieć
  const TERMIN_BLISKO_DNI = 3;
  const MOJE_STATUSY = ['do-zrobienia', 'w-trakcie', 'do-poprawek'];
  const KLIENTA_STATUSY = ['czekam-na-materialy', 'wycena-wyslana', 'czeka-na-odpowiedz'];

  const dzien = (d) => {
    if (!d) return null;
    const s = String(d).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };
  const doDaty = (s) => new Date(`${s}T12:00:00Z`);
  const roznicaDni = (a, b) => Math.round((doDaty(b) - doDaty(a)) / 86400000);

  /** Dni robocze (pn–pt) od `od` do `dzis`, bez dnia `od`. */
  function dniRobocze(od, dzis) {
    if (!od || od >= dzis) return 0;
    let n = 0;
    const d = doDaty(od);
    const koniec = doDaty(dzis);
    while (d < koniec) {
      d.setUTCDate(d.getUTCDate() + 1);
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) n += 1;
    }
    return n;
  }

  const dniSlownie = (n) => (n === 1 ? '1 dzień' : `${n} dni`);

  /**
   * @param {object} n kartka z API (status, pinned, due_date, mail_summary)
   * @param {string} dzis 'RRRR-MM-DD' (lokalna data)
   * @returns {{sekcja, wynik, powod, ruch, termin, cisza, dniOdKontaktu, pilne}}
   */
  function ocen(n, dzis) {
    const a = n.mail_summary || null;
    const status = n.status || 'do-zrobienia';
    if (status === 'zrobione') return { sekcja: 'zrobione', wynik: -1, powod: 'Zrobione', ruch: null };

    const terminy = [dzien(n.due_date), dzien(a && a.due_date)].filter(Boolean).sort();
    const termin = terminy[0] || null;
    const doTerminu = termin ? roznicaDni(dzis, termin) : null;
    const kontakt = dzien(a && a.last_contact);
    const cisza = kontakt ? dniRobocze(kontakt, dzis) : null;
    const dniOdKontaktu = kontakt ? Math.max(0, roznicaDni(kontakt, dzis)) : null;

    // Czyj ruch: najpierw to, co ustalił przegląd poczty; gdy go brak albo „Do ustalenia”,
    // podpowiada status kartki.
    let ruch = a && (a.owner === 'Jakub' || a.owner === 'Klient') ? a.owner : null;
    if (!ruch && KLIENTA_STATUSY.includes(status)) ruch = 'Klient';
    if (!ruch && MOJE_STATUSY.includes(status) && !(a && a.owner === 'Do ustalenia')) ruch = 'Jakub';

    let wynik = 0;
    let powod = '';
    let sekcja;
    const poTerminie = doTerminu !== null && doTerminu < 0;
    const terminBlisko = doTerminu !== null && doTerminu >= 0 && doTerminu <= TERMIN_BLISKO_DNI;
    const przypomnij = ruch === 'Klient' && cisza !== null && cisza >= CISZA_DNI_ROBOCZYCH;

    if (status === 'wstrzymane') {
      sekcja = 'spokoj';
      powod = 'Wstrzymane';
    } else if (poTerminie) {
      sekcja = 'ruch';
      wynik = 1000 + Math.min(-doTerminu, 60) * 10;
      powod = `Po terminie (${dniSlownie(-doTerminu)})`;
    } else if (terminBlisko) {
      sekcja = 'ruch';
      wynik = 800 - doTerminu * 50;
      powod = doTerminu === 0 ? 'Termin dziś' : doTerminu === 1 ? 'Termin jutro' : `Termin za ${dniSlownie(doTerminu)}`;
    } else if (ruch === 'Jakub') {
      sekcja = 'ruch';
      // Im dłużej klient czeka na Ciebie, tym wyżej. Termin w ciągu 2 tygodni też podbija.
      wynik = 400 + Math.min(cisza || 0, 30) * 8 + (doTerminu !== null && doTerminu <= 14 ? 60 : 0);
      powod = cisza ? `Klient czeka na Ciebie ${dniSlownie(cisza)} rob.` : 'Twój ruch';
      if (a && a.needs_review) { wynik -= 20; powod += ' · do sprawdzenia'; }
    } else if (przypomnij) {
      sekcja = 'ruch';
      wynik = 300 + Math.min(cisza, 30) * 6;
      powod = `Przypomnij się: cisza ${dniSlownie(cisza)} rob.`;
    } else if (ruch === 'Klient') {
      sekcja = 'czeka';
      wynik = 200 + (cisza || 0) * 5;
      powod = cisza !== null ? `Czekasz od ${dniSlownie(cisza)} rob.` : 'Czekasz na klienta';
    } else if (a && (a.needs_review || a.owner === 'Do ustalenia')) {
      sekcja = 'ruch';
      wynik = 150;
      powod = 'Ustal następny krok';
    } else {
      sekcja = 'spokoj';
      powod = termin ? `Termin ${termin}` : 'Bez ruchu i terminu';
    }
    if (n.pinned) wynik += 5000;   // przypięta zostaje na górze swojej sekcji

    return { sekcja, wynik, powod, ruch, termin, doTerminu, cisza, dniOdKontaktu,
      pilne: poTerminie || terminBlisko };
  }

  /** Kartki podzielone na sekcje i posortowane od najpilniejszej. */
  function uloz(notes, dzis) {
    const sekcje = { ruch: [], czeka: [], spokoj: [], zrobione: [] };
    for (const n of notes) {
      const o = ocen(n, dzis);
      sekcje[o.sekcja].push({ n, o });
    }
    for (const k of Object.keys(sekcje)) {
      sekcje[k].sort((x, y) => (y.o.wynik - x.o.wynik) || ((x.n.position || 0) - (y.n.position || 0)) || (x.n.id - y.n.id));
    }
    return sekcje;
  }

  /** Dzisiejsza data w strefie przeglądarki, jako 'RRRR-MM-DD'. */
  function dzisiaj(d = new Date()) {
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  return { ocen, uloz, dniRobocze, dzisiaj, CISZA_DNI_ROBOCZYCH };
}));
