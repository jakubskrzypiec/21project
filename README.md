# 21project.pl

Statyczna strona firmowa (GitHub Pages, domena z pliku `CNAME`) i panel administracyjny w `backend/`.
Strona nie ma buildu — pliki z katalogu głównego trafiają na serwer takie, jakie są.

## Struktura

```
/
├── index.html                       strona główna
├── oferta/  realizacje/  kontakt/   podstrony (każda jako katalog z index.html)
├── realizacja-*/                    osiem case study (zrzuty, nagranie, link do strony live)
├── polityka-prywatnosci/            noindex
├── saas/                            szkic, noindex
├── *.html (stare adresy)            przekierowania na nowe adresy — nie usuwać przez kilka miesięcy
├── style.css  showcase.css  offer.css  faq.css  projekt.css  offerpage.css
│   hero.css  studio.css  interlude.css  unify.css      style podstron
├── navigation.js  showcase.js  faq.js  case.js  hero-waves.js  interlude.js
├── assets/                          logo, fonty, zrzuty i nagrania realizacji (assets/work)
├── sitemap.xml  robots.txt  llms.txt  pliki dla wyszukiwarek i asystentów AI
├── og-21project.jpg  favicon.svg
├── backend/                         panel administracyjny (osobna aplikacja Node.js, Railway)
└── docs/                            instrukcja wdrożenia panelu i audyty SEO (archiwum)
```

## Panel

Panel stoi na `panel.21project.pl` (Railway). Strona łączy się z nim dwoma skryptami
ładowanymi na każdej podstronie: `t.js` (licznik ruchu) i `form-hook.js` (formularz kontaktowy).
Formularz ma klasę `contactForm` i pola `name`, `contact`, `plan`, `message` — nazwy muszą się
zgadzać z `backend/src/routes/public.routes.js`. Gdy panel nie odpowiada, formularz otwiera
program pocztowy (zapytanie nie przepada). Instrukcja: [`backend/README.md`](backend/README.md).

## SEO i wyszukiwarki AI

- każda indeksowana podstrona ma `title`, `description`, canonical, Open Graph i dane strukturalne
  (JSON-LD: Organization/ProfessionalService, OfferCatalog, FAQPage, BreadcrumbList),
- `sitemap.xml` zawiera tylko adresy kanoniczne stron indeksowanych (bez `noindex`),
- `robots.txt` wprost dopuszcza roboty wyszukiwarek i asystentów AI,
- `llms.txt` opisuje firmę, cennik i podstrony dla modeli językowych.

Po dodaniu podstrony dopisz ją do `sitemap.xml` i `llms.txt`.
Pytania w FAQ na `/oferta/` są też w JSON-LD (`FAQPage`) — przy zmianie pytań zmień oba miejsca.
