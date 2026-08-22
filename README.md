# 21project.pl

Statyczna strona firmowa (GitHub Pages, domena z pliku `CNAME`). Bez buildu i bez zależności —
pliki z katalogu głównego trafiają na serwer takie, jakie są.

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
Open Graph jako `og-21project.jpg`.

Grafika w hero (okno przeglądarki, telefon i linie wymiarowe) to inline SVG
w `index.html`, kolorowany klasami z `style.css` — nie ma tam żadnego pliku
graficznego. Rotujące słowo w nagłówku to cztery `<span>` w jednej komórce
siatki, przełączane animacją `wordFade`.

## Skala wizualna

Promienie, rytm pionowy i akcent kolorystyczny siedzą w zmiennych w `:root`
na końcu `style.css`: `--r1/--r2/--r3` (promienie), `--block` i `--headGap`
(odstępy sekcji), `--a1`/`--a2` (indygo i fiolet). Zmiana odstępu między
sekcjami na całej stronie to jedna wartość `--block`.

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
