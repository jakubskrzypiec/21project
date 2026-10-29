# 21project.pl

Statyczna strona firmowa (GitHub Pages, domena z pliku `CNAME`) i panel administracyjny w `backend/`.
Strona nie ma buildu — pliki z katalogu głównego trafiają na serwer takie, jakie są.

## Struktura

```
/
├── index.html                       strona główna
├── oferta/  realizacje/  kontakt/   podstrony (każda jako katalog z index.html)
├── realizacja-*/                    dziesięć case study (zrzuty, nagranie, link do strony live)
├── polityka-prywatnosci/            noindex
├── saas/                            panele dla firm + case study paneli (saas/effkowe-ogrody, saas/lumea-clinic, saas/voltra-energia)
├── panele/                          klikalne dema paneli (noindex): panel.css + panel.js wspólne, lumea/ i voltra/ z danymi
├── style.css  showcase.css  offer.css  faq.css  projekt.css  offerpage.css
│   hero.css  studio.css  interlude.css  unify.css      style podstron
├── navigation.js  showcase.js  faq.js  case.js  hero-waves.js  interlude.js
├── assets/                          logo, fonty, zrzuty i nagrania realizacji (assets/work), zrzuty paneli (assets/saas)
├── sitemap.xml  robots.txt  llms.txt  pliki dla wyszukiwarek i asystentów AI
├── og-21project.jpg  favicon.svg
├── backend/                         panel administracyjny (osobna aplikacja Node.js, Railway)
└── docs/                            instrukcja wdrożenia panelu i audyty SEO (archiwum)
```

## Panel

Panel stoi na `panel.21project.pl` (Railway). Ruch na stronie liczy skrypt `t.js` ładowany na
każdej podstronie. Formularz kontaktowy wysyła zapytanie z `faq.js` prosto na
`https://panel.21project.pl/api/contact` (pola `name`, `contact`, `plan`, `message` i pułapka
`website_url` — zgodnie z `backend/src/routes/public.routes.js`). Przy błędzie formularz pokazuje
komunikat z e-mailem i telefonem; poczta nie jest używana. Panel przyjmuje żądania tylko
z domen z `ALLOWED_ORIGINS`. Instrukcja: [`backend/README.md`](backend/README.md).

## SEO i wyszukiwarki AI

- każda indeksowana podstrona ma `title`, `description`, canonical, Open Graph i dane strukturalne
  (JSON-LD: Organization/ProfessionalService, OfferCatalog, FAQPage, BreadcrumbList),
- `sitemap.xml` zawiera tylko adresy kanoniczne stron indeksowanych (bez `noindex`),
- `robots.txt` wprost dopuszcza roboty wyszukiwarek i asystentów AI,
- `llms.txt` opisuje firmę, cennik i podstrony dla modeli językowych.

Po dodaniu podstrony dopisz ją do `sitemap.xml` i `llms.txt`.
Pytania w FAQ na `/oferta/` są też w JSON-LD (`FAQPage`) — przy zmianie pytań zmień oba miejsca.

## Dema paneli

`panele/lumea/` i `panele/voltra/` to statyczne, klikalne dema (marki i dane fikcyjne, `noindex`).
Silnik jest wspólny: `panele/panel.js` (układ, wykresy SVG, kanban, kalendarz, szuflada, paleta ⌘K)
i `panele/panel.css`; każdy panel ma własny `app.js` z danymi i widokami. Parametr `?shot` wyłącza
pasek „demo” i wyskakujące powiadomienia, a `?empty` zeruje wszystkie liczby i czyści listy — razem (`?shot&empty`) służą do zrzutów w `assets/saas/`
(1440×900 @2x, wersje `-960` i `-1600`).
