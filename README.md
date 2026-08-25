# 21project.pl

Statyczna strona firmowa (GitHub Pages, domena z pliku `CNAME`). Bez buildu i bez zależności —
pliki z katalogu głównego trafiają na serwer takie, jakie są.

## Panel administracyjny (backend)

W katalogu `backend/` stoi prywatny panel: ruch na stronie, skrzynka Gmail, kalendarz spotkań,
projekty klientów, leady i wysyłka wiadomości do potencjalnych klientów.
Instrukcja uruchomienia i wdrożenia: [`backend/README.md`](backend/README.md).

To osobna aplikacja Node.js — GitHub Pages jej nie uruchomi. Strona zostaje tam, gdzie jest,
panel stoi na własnym serwerze (np. `panel.21project.pl`) i łączy się ze stroną dwoma linijkami:
licznikiem ruchu (`t.js`) i podpięciem formularza (`form-hook.js`).

Audyt SEO strony wraz z listą rzeczy do zrobienia: [`docs/SEO-AUDYT.md`](docs/SEO-AUDYT.md).

## Co gdzie leży

```
21project.pl/
├── index.html                    strona główna
├── oferta.html  proces.html  faq.html  kontakt.html
├── realizacje.html               lista realizacji
├── realizacja-*.html             sześć pojedynczych realizacji
├── strony-internetowe-*.html     podstrony lokalne i branżowe
├── pozycjonowanie-stron.html     podstrona o SEO
├── polityka-prywatnosci.html     noindex, celowo poza mapą strony
│
├── style.css                     wspólna podstawa
├── topbar.css                    pasek górny i menu — jedyne źródło, ładowane wszędzie
├── home-v2.css                   tylko strona główna
├── pages.css                     podstrony z listami i portfolio
├── detail-style.css              pojedyncze realizacje i polityka
├── motion.js                     animacje i menu (większość podstron)
├── script.js                     to samo dla realizacji i polityki
│
├── *.webp  logo*.svg  favicon.svg  og-21project.jpg
├── inter-*.woff2                 krój pisma, cztery grubości
├── robots.txt  sitemap.xml  llms.txt
├── _config.yml                   ukrywa backend/, docs/ i narzedzia/ przed stroną
│
├── */index.html                  przekierowania ze starych adresów (patrz niżej)
├── mockups/                      źródła plansz do zrzutów
├── narzedzia/                    skrypty pomocnicze, nie część strony
├── docs/                         audyty SEO i instrukcja wdrożenia
└── backend/                      panel administracyjny (osobna aplikacja)
```

### Katalogi z jednym plikiem `index.html`

`realizacje/`, `pozycjonowanie-stron/`, `strony-internetowe-katowice/`,
`strony-internetowe-slask/` i `strony-internetowe-dla-architektow/` zawierają
po jednym pliku, który **nie jest podstroną** — to przekierowanie.

Te same treści żyły kiedyś pod dwoma adresami naraz (`/realizacje.html`
i `/realizacje/`), co dzieliło ich pozycję w Google na pół. Wersja `.html` jest
teraz jedyną właściwą, a te pliki przekazują jej sygnały ze starych adresów
i przenoszą odwiedzającego.

**Zostaw je na kilka miesięcy.** Gdy Search Console przestanie pokazywać stare
adresy w indeksie, można je usunąć — wtedy stare linki zaczną zwracać 404.

## Struktura

| Plik | Rola |
| --- | --- |
| `index.html` | strona główna |
| `style.css` | style strony głównej |
| `motion.js` | animacje, menu mobilne, obsługa formularza |
| `realizacja-*.html` | podstrony realizacji |
| `polityka-prywatnosci.html` | polityka prywatności |
| `detail-style.css`, `script.js` | style i skrypt podstron |
| `inter-*.woff2` | krój Inter (podzbiór łaciński + polskie znaki) |
| `screen-21-logo.webp` | ekran z logo 21 project pokazywany na telefonie w sekcji FAQ |
| `robots.txt`, `sitemap.xml` | pliki dla wyszukiwarek — przy nowej podstronie dopisz ją do mapy |
| `mockups/` | źródła HTML tych ekranów (patrz niżej) |
| `og-21project.jpg` | obrazek do podglądu linku (Open Graph) |

## Ekrany na mockupach

Ekran na telefonie w sekcji FAQ nie jest zrzutem cudzej strony — to własna
plansza 21 project generowana z `mockups/screen-logo.html` (940×2004).
`mockups/screen-desktop.html` (1901×1079) służy do obrazka Open Graph.
Żeby odświeżyć po zmianie treści: otwórz plik w przeglądarce, zrób zrzut
w rozmiarze podanym w `body` i zapisz — telefon jako `screen-21-logo.webp`,
Open Graph jako
`og-21project.jpg` (skalowany z pełnego zrzutu 1901×1079 do 1200×630).

Motyw jest jasny: biała strona, chłodne szare bloki (`--paper`, `--surface`)
i niebieski akcent. Kolory tekstu sprawdzone pod kątem kontrastu — najsłabszy
element ma 5,1:1 przy wymaganych 4,5:1.

W hero lewituje znak `21` — nie ma tam żadnego pliku graficznego. Ścieżka
z `logo-mark.svg` jest **wklejona wprost w `index.html`** i wypełniona
gradientem SVG, a wokół niej
scena złożona z warstw: pulsująca poświata, krążące kwadraty, siatka
pomiarowa, przesuwający się refleks i cień kontaktowy, który kurczy się,
gdy znak idzie w górę. Przechylenie za kursorem ustawia `motion.js` przez
zmienne `--tx`/`--ty`.

Dwie rzeczy, o które łatwo się potknąć przy zmianach w tej scenie:

- animacja wejścia (`markIn`) musi siedzieć na `.markScene`, a nie na
  `.markGlyph` — obie ruszają `transform`, a `markIn` z `fill: both`
  nadpisuje unoszenie i znak stoi w miejscu;
- znak celowo **nie** używa maski CSS ani `aspect-ratio`. W tej wersji
  znikał na części telefonów; wklejony SVG z `viewBox` sam ustala wysokość
  i nie zależy od obsługi `mask-mode`.

Rotujące słowo w nagłówku to cztery `<span>` w jednej komórce siatki,
przełączane animacją `wordFade`.

Poniżej 1100 px scena z desktopu się nie skaluje — znak przechodzi **nad**
nagłówek jako zwarty znacznik (190 px na tablecie, 142 px na telefonie),
a krążące kwadraty i siatka są ukrywane, bo w tej skali czytają się jak
przypadkowe kropki. Hero traci wtedy wymuszoną wysokość, żeby nie robiła się
dziura między podpisem a treścią.

## Skala wizualna

Promienie, rytm pionowy i akcent kolorystyczny siedzą w zmiennych w `:root`
na końcu `style.css`: `--r1/--r2/--r3` (promienie), `--block` i `--headGap`
(odstępy sekcji), `--a1`/`--a2` (niebieski akcent). Zmiana odstępu między
sekcjami na całej stronie to jedna wartość `--block`.

Zasada układu: **linie zamiast pudełek**. Oferta, proces, obszar działania,
„Dlaczego ja" i formularz są zbudowane na siatce z włosowych kresek, nie na
kartach z obramowaniem i cieniem. Kreski nad wierszami (`.rowLine`, `.whyLine`)
rysują się od lewej, kiedy wiersz wchodzi w kadr — obsługuje to zwykły
`data-reveal` z `motion.js` plus przejście w CSS, bez dodatkowego skryptu.

## SEO

Dane strukturalne na stronie głównej (`ProfessionalService` z listą miast
i `FAQPage`) generuję z treści strony — pytania do `FAQPage` są wczytywane
z sekcji FAQ, więc nie rozjadą się z tym, co widzi użytkownik. Po dodaniu
lub zmianie pytania trzeba odświeżyć blok `application/ld+json` w `index.html`.
Podstrony realizacji mają własne `BreadcrumbList`.

## Publikacja

Wypchnięcie na `main` uruchamia deploy GitHub Pages. Przy wgrywaniu plików przez
przeglądarkę uważaj na kolizje nazw — GitHub dopisuje wtedy `(1)`, `(2)` do nazwy
zamiast nadpisać plik, przez co strona potrafi zostać z niepodmienionym arkuszem stylów.
