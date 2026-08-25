# Audyt SEO 21project.pl — 25 sierpnia 2026

Strona jest w dobrym stanie technicznym: każda podstrona ma sensowny `title`, opis, canonical,
Open Graph i komplet atrybutów `alt`. Poniżej to, co znalazłem, w kolejności od rzeczy, które
realnie kosztują Cię kliknięcia.

---

## 1. Naprawione w tym zestawie zmian

### 1.1. Ta sama treść pod dwoma adresami — to blokowało Ci pozycje

To był najpoważniejszy problem. Pięć podstron istniało jednocześnie w dwóch wersjach:

| Adres A | Adres B |
| --- | --- |
| `/strony-internetowe-katowice.html` | `/strony-internetowe-katowice/` |
| `/strony-internetowe-slask.html` | `/strony-internetowe-slask/` |
| `/strony-internetowe-dla-architektow.html` | `/strony-internetowe-dla-architektow/` |
| `/pozycjonowanie-stron.html` | `/pozycjonowanie-stron/` |
| `/realizacje.html` | `/realizacje/` |

Każda wersja miała canonical wskazujący **na samą siebie**, więc Google widziało dwie osobne
strony o tej samej treści i tej samej frazie. Efekt: zamiast jednej mocnej strony na
„strony internetowe Katowice" miałeś dwie słabsze, które odbierały sobie nawzajem pozycję —
to się nazywa kanibalizacja. Dodatkowo wersje w folderach miały **krótsze opisy i mniej treści**,
więc Google mogło wybierać do wyników tę gorszą.

Poprawka: wersja `.html` jest teraz jedyną właściwą (bo tak prowadzą wszystkie linki na stronie
i tak jest w mapie strony), a pliki w folderach zamieniłem na przekierowania z `rel=canonical`
i `noindex,follow`. Sygnały z obu adresów spływają na jedną stronę.

### 1.2. Śmieci z uploadu w katalogu głównym

W repozytorium leżało siedem plików, które nie powinny być publiczne:
`index (1).html` … `index (5).html` (kopie podstron zrobione przez Windows przy wgrywaniu)
oraz `screen-desktop.html` i `screen-logo.html` (plansze do mockupów, kopie tych z `mockups/`).

Kopie były dostępne pod publicznymi adresami i indeksowalne — kolejne duplikaty tej samej treści.
Plansze mockupów w ogóle nie mają `title` ani opisu, więc w wynikach wyglądałyby jak pusta strona.
Wszystkie usunąłem.

> Ten problem wróci przy każdym wgrywaniu przez przeglądarkę. Instrukcja z `UPLOAD-INSTRUKCJA.txt`
> jest słuszna: wgrywaj przez GitHub Desktop albo `git push`, nie przez przeciąganie plików.

### 1.3. Brakujące dane strukturalne

Cztery podstrony nie miały żadnych danych strukturalnych. Dodałem:

- `oferta.html` → `Service` z czterema `Offer` (1500 / 2000 / 3000 / od 1000 zł). Google może
  teraz pokazać ceny bezpośrednio w wynikach — to zauważalnie podnosi klikalność w usługach.
- `proces.html` → `HowTo` z pięcioma krokami procesu.
- `realizacje.html` → `CollectionPage` z `ItemList` sześciu realizacji.
- Okruszki (`BreadcrumbList`) na wszystkich podstronach, które ich nie miały — w wynikach
  wyszukiwania zamiast surowego adresu pojawia się ścieżka „21project.pl › Oferta".

Realizacje i podstrony lokalne miały już `BreadcrumbList`, `FAQPage` i `ProfessionalService` —
te zostawiłem bez zmian. Wszystkie bloki JSON-LD przechodzą walidację składni.

### 1.4. Skakanie układu przy wczytywaniu (CLS)

20 zdjęć w `realizacje.html` i `strony-internetowe-dla-architektow.html` nie miało atrybutów
`width` i `height`. Przeglądarka nie wie wtedy, ile miejsca zarezerwować, i treść podskakuje,
gdy zdjęcie się doczyta. To jeden z trzech wskaźników Core Web Vitals (CLS), które Google
bierze pod uwagę w rankingu. Dopisałem prawdziwe wymiary każdego pliku.

Pierwsze zdjęcie portfolio dostało też `fetchpriority="high"` — to zwykle największy element
w pierwszym kadrze (LCP), więc przeglądarka pobierze je przed resztą.

---

## 2. Co warto zrobić dalej — w kolejności opłacalności

### 2.1. Treść pod frazy, których jeszcze nie masz (największy potencjał)

Masz cztery strony lokalne/branżowe i to działa. Brakuje treści pod frazy, których szuka klient
**zanim** zdecyduje, że chce stronę. Każdy z tych tematów to jedna podstrona 800–1200 słów:

| Proponowana podstrona | Fraza, pod którą pracuje |
| --- | --- |
| `ile-kosztuje-strona-internetowa.html` | „ile kosztuje strona internetowa" — bardzo wysoki wolumen, mała konkurencja lokalna |
| `strony-internetowe-gliwice.html`, `…-zabrze.html`, `…-chorzow.html` | miasta obok Katowic, ten sam schemat co strona Katowice |
| `strony-internetowe-dla-fotografow.html` | branża sąsiednia do architektów, ta sama estetyka portfolio |
| `sklep-internetowy-czy-strona-firmowa.html` | fraza porównawcza, łapie ruch decyzyjny |
| `redesign-strony-internetowej.html` | firmy, które **już mają** stronę — czyli dokładnie ci, których wyszukuje panel |

Podstrony miast rób z **inną treścią**, nie przez podmianę nazwy miasta. Sześć bliźniaczych stron
różniących się jednym słowem Google traktuje jak spam i przestaje je pokazywać.

### 2.2. Realizacje mogą pracować mocniej

Każda realizacja ma dziś opis projektu. Dołóż do dwóch–trzech **konkretny wynik**: „strona ładuje
się w 0,9 s", „formularz wysyła 4× więcej zapytań niż stary", „pierwsza pozycja na frazę X".
To jest materiał zarówno dla Google (unikalna treść), jak i dla klienta czytającego ofertę.

Warto też dodać na stronach realizacji schemat `Review` albo `AggregateRating` — ale **tylko**
jeśli masz realne, zebrane opinie klientów. Wymyślone oceny są traktowane jako naruszenie zasad.

### 2.3. Wizytówka Google (Profil Firmy)

Przy frazach „strony internetowe Katowice" połowa pierwszego ekranu to mapa. Bez wizytówki nie
istniejesz w tej połowie wyników, niezależnie od tego, jak dobra jest strona. To jest
prawdopodobnie **największy pojedynczy zysk** z całej listy, a nie wymaga zmian w kodzie.
Po założeniu dopisz do danych organizacji `sameAs` z linkiem do wizytówki.

### 2.4. Sprawdź realne Core Web Vitals

Wymiary zdjęć i `fetchpriority` załatwiają część problemu, ale prawdziwe liczby zobaczysz dopiero
na PageSpeed Insights (<https://pagespeed.web.dev>) dla `21project.pl` w wersji mobilnej.
Zwróć uwagę na wagę plików `.webp` — `drg-desktop.webp` ma 194 kB, a `maciejewska-desktop.webp`
140 kB. Zdjęcia portfolio wyświetlane w kadrze 16:9 nie potrzebują 1800 px szerokości;
połowa tej rozdzielczości da połowę wagi bez widocznej różnicy.

### 2.5. Podłącz narzędzia pomiarowe

- **Google Search Console** — jedyne miejsce, gdzie zobaczysz, na jakie frazy Google Cię pokazuje
  i ile razy ktoś kliknął. Po wdrożeniu tych zmian wyślij tam mapę strony i poproś o ponowne
  zindeksowanie pięciu podstron z punktu 1.1.
- **Panel z tego zestawu zmian** (`/admin#/ruch`) — pokazuje, co ludzie robią **po** wejściu:
  które podstrony czytają, ile czasu, ilu klika w telefon. Search Console i panel odpowiadają na
  dwa różne pytania i dobrze się uzupełniają.

---

## 3. Rzeczy sprawdzone i poprawne — nie ruszaj

- `title` i `description` na każdej podstronie, długości w zakresie akceptowanym przez Google
- canonical, `robots`, Open Graph i Twitter Card z obrazkiem 1200×630
- `lang="pl"`, `robots.txt` z mapą strony, poprawna mapa strony (17 adresów)
- komplet atrybutów `alt` — **ani jednego brakującego w całym serwisie**
- dokładnie jeden `H1` na każdej podstronie
- zdjęcia w formacie WebP, lazy-loading tam, gdzie ma sens
- kontrast tekstu 5,1:1 przy wymaganych 4,5:1
- `Organization` z telefonem, adresem e-mail i katalogiem ofert na stronie głównej
- `FAQPage` na FAQ i na podstronach lokalnych

---

## 4. Uwaga o panelu

Panel administracyjny jest zabezpieczony przed indeksowaniem na trzy sposoby: nagłówek
`X-Robots-Tag: noindex, nofollow` przy każdej odpowiedzi, `<meta name="robots">` w kodzie strony
i wymóg zalogowania. Powinien stać na osobnej subdomenie (`panel.21project.pl`), żeby w żadnym
momencie nie mieszał się z treścią, która ma się indeksować.
