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
| `screen-21-*.webp` | ekrany 21 project pokazywane na mockupach urządzeń |
| `mockups/` | źródła HTML tych ekranów (patrz niżej) |
| `og-21project.jpg` | obrazek do podglądu linku (Open Graph) |

## Ekrany na mockupach

Ekrany widoczne w laptopie i telefonie nie są zrzutami cudzych stron — to własne
plansze 21 project generowane z `mockups/*.html`. Żeby je odświeżyć po zmianie
treści: otwórz plik w przeglądarce, zrób zrzut w rozmiarze podanym w `body`
(`screen-desktop` 1901×1079, `screen-mobile` 946×2047, `screen-faq` 940×2004)
i zapisz jako WebP pod nazwą `screen-21-<nazwa>.webp`.

## Publikacja

Wypchnięcie na `main` uruchamia deploy GitHub Pages. Przy wgrywaniu plików przez
przeglądarkę uważaj na kolizje nazw — GitHub dopisuje wtedy `(1)`, `(2)` do nazwy
zamiast nadpisać plik, przez co strona potrafi zostać z niepodmienionym arkuszem stylów.
