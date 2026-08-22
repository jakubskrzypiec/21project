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
| `screen-21-pakiety.webp` | ekran cennika 21 project pokazywany na telefonie w sekcji FAQ |
| `mockups/` | źródła HTML tych ekranów (patrz niżej) |
| `og-21project.jpg` | obrazek do podglądu linku (Open Graph) |

## Ekrany na mockupach

Ekran na telefonie w sekcji FAQ nie jest zrzutem cudzej strony — to własna
plansza 21 project generowana z `mockups/screen-pakiety.html` (940×2004).
`mockups/screen-desktop.html` (1901×1079) służy do obrazka Open Graph.
Żeby odświeżyć po zmianie treści: otwórz plik w przeglądarce, zrób zrzut
w rozmiarze podanym w `body` i zapisz — telefon jako `screen-21-pakiety.webp`,
Open Graph jako `og-21project.jpg`.

Hero jest wyłącznie typograficzne — żadnych obrazków ani mockupów, więc nie ma
tam nic do odświeżania. Rotujące słowo w nagłówku to cztery `<span>`
w jednej komórce `inline-grid`, przełączane animacją `wordFade`.

## Publikacja

Wypchnięcie na `main` uruchamia deploy GitHub Pages. Przy wgrywaniu plików przez
przeglądarkę uważaj na kolizje nazw — GitHub dopisuje wtedy `(1)`, `(2)` do nazwy
zamiast nadpisać plik, przez co strona potrafi zostać z niepodmienionym arkuszem stylów.
