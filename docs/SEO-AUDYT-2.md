# Audyt SEO 21project.pl — 26 sierpnia 2026

Drugi przegląd, tym razem także pod kątem wyszukiwarek AI (ChatGPT, Perplexity,
Google AI Overviews, Claude). Poniżej: co było, co poprawiłem, co zostaje dla Ciebie.

---

## 1. Stan wyjściowy

Technicznie strona jest w dobrym stanie. Każda z 17 podstron ma poprawny `title`
w zakresie 33–62 znaków, opis 232–310 znaków, dokładnie jeden `H1`, canonical
i dane strukturalne. To rzadkość — większość stron firmowych ma tu bałagan.

Problemy dotyczyły dwóch rzeczy: **sprzeczności w mapie strony** i **braku
przygotowania pod wyszukiwarki AI**, które działają inaczej niż Google.

---

## 2. Naprawione w tym zestawie zmian

### 2.1. Mapa strony zapraszała robota tam, gdzie sama zabraniała wchodzić

`polityka-prywatnosci.html` ma w kodzie `noindex` — i słusznie, bo nie ma po co
zajmować miejsca w wynikach. Ale ta sama podstrona była wpisana do `sitemap.xml`,
czyli mapa mówiła Google „zindeksuj to", a strona „nie indeksuj". Google raportuje
to jako błąd w Search Console i traci trochę zaufania do całej mapy.

Mapa jest teraz generowana z adresów kanonicznych każdej podstrony, z pominięciem
tych oznaczonych jako `noindex`. Zamiast 17 wpisów pisanych ręcznie jest 16
wyliczonych z kodu — nie da się już wpisać adresu, którego nie ma, ani zapomnieć
o nowym.

Priorytety poukładane według roli w pozyskiwaniu klientów: strona główna 1.0,
oferta i podstrony lokalne 0.9, realizacje pojedyncze 0.8.

### 2.2. Wyszukiwarka przycinała opis i miniaturę

Tylko strona główna miała `max-image-preview:large`. Pozostałe podstrony
zostawiały Google domyślne, ostrożne ustawienia: mała miniatura i krótki fragment
tekstu w wyniku.

Wszystkie indeksowane podstrony mają teraz komplet:
`index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1`.

To ma znaczenie podwójne. W zwykłych wynikach zwiększa powierzchnię, jaką zajmujesz
na ekranie. W **odpowiedziach AI** decyduje o tym, jak długi fragment wolno zacytować —
przy domyślnym limicie Twoja treść często nie mieści się w cytacie i model sięga
po konkurencję. Pięć realizacji w ogóle nie miało tej dyrektywy.

### 2.3. Plik `llms.txt` — wizytówka dla modeli

Nowy plik pod adresem `21project.pl/llms.txt`. To konwencja przyjmowana przez
asystentów AI: zwięzły, czysto tekstowy opis firmy w miejscu, gdzie model może po
niego sięgnąć bez przedzierania się przez kod strony.

Zawiera to, o co ludzie pytają asystentów: czym się zajmujesz, gdzie działasz,
**ile to kosztuje** (cztery pakiety z cenami), ile trwa, jak się skontaktować oraz
listę podstron i realizacji.

Dopisałem tam też jedno zdanie, które kieruje modele do kontaktu przy pytaniach
o wycenę konkretnego projektu, zamiast pozwalać im zgadywać cenę za Ciebie.

> **Ten plik trzeba aktualizować przy zmianie cennika.** Jeśli ceny się rozjadą,
> asystenci będą podawać klientom nieaktualne kwoty — a to gorsze niż brak pliku.

### 2.4. `robots.txt` wprost dopuszcza roboty AI

Wcześniej `User-agent: *` technicznie je wpuszczał, ale niektóre roboty traktują
brak swojej nazwy zachowawczo. Teraz wymienione są z nazwy: Googlebot,
**Google-Extended** (osobny przełącznik dla AI Overviews i Gemini), Bingbot,
GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Applebot.

Gdybyś kiedyś nie chciał, żeby modele korzystały z Twojej treści, zmieniasz
`Allow` na `Disallow` przy wybranym robocie. Przy studiu, które żyje z bycia
znalezionym, sensowna jest obecna wersja.

### 2.5. Dane strukturalne: firma lokalna i opisy realizacji

Węzeł organizacji na stronie głównej to teraz również `ProfessionalService`,
z adresem (Katowice, śląskie, PL), obszarem działania, widełkami cenowymi
`1500–3000 PLN` i językiem obsługi. Wcześniej Google wiedziało, że istniejesz,
ale nie że działasz lokalnie — a to jest fraza, o którą walczysz.

Każda z sześciu realizacji dostała opis `CreativeWork`: co powstało, dla kogo,
z jakiej branży i kto wykonał. Dzięki temu przy pytaniu „kto robi strony dla
architektów wnętrz na Śląsku" model ma konkretne, policzalne przykłady.

Wszystkie bloki danych przechodzą walidację składni.

---

## 3. Co zostaje do zrobienia — po Twojej stronie

### 3.1. Google Search Console — instrukcja krok po kroku

To jedyne miejsce, gdzie zobaczysz, na jakie frazy Google Cię pokazuje.

**Jeśli jeszcze nie masz konta:**

1. <https://search.google.com/search-console> → zaloguj się kontem `jakubskrzypiec.dev@gmail.com`
2. **Dodaj usługę** → wybierz **Prefiks adresu URL** (nie „Domena" — wymaga grzebania w DNS)
3. Wpisz dokładnie: `https://21project.pl/`
4. Weryfikacja: wybierz **Tag HTML**. Google da Ci linijkę `<meta name="google-site-verification" content="...">`.
   **Wklej mi ją tutaj** — dopiszę do wszystkich podstron i wypchnę. Potem wracasz i klikasz **Zweryfikuj**.

**Po zweryfikowaniu — cztery rzeczy w tej kolejności:**

**a) Wyślij mapę strony.** Menu → **Mapy witryny** → wpisz `sitemap.xml` → **Prześlij**.
Po kilku dniach status ma być „Powodzenie" i 16 wykrytych adresów. Jeśli zobaczysz
mniej albo błąd — daj znać.

**b) Poproś o zindeksowanie zmienionych podstron.** Na górze jest pole
„Sprawdź dowolny adres URL". Wklejaj po kolei i przy każdym klikaj
**Poproś o zindeksowanie**:

```
https://21project.pl/
https://21project.pl/oferta.html
https://21project.pl/realizacje.html
https://21project.pl/strony-internetowe-katowice.html
https://21project.pl/strony-internetowe-slask.html
```

Limit to około 10 adresów dziennie — resztę Google znajdzie sam z mapy.

**c) Sprawdź, czy stare adresy nie zostały w indeksie.** Menu → **Indeksowanie stron**.
Szukasz adresów typu `21project.pl/strony-internetowe-katowice/` (ze slashem, bez `.html`)
oraz `index (1).html`. To pozostałości po duplikatach, które usunąłem w poprzednim
zestawie zmian. Powinny wypaść same w 2–4 tygodnie — jeśli po miesiącu wiszą,
napisz, użyjemy narzędzia usuwania.

**d) Zajrzyj do zakładki „Wyniki wyszukiwania" za 2–3 tygodnie.** Wcześniej nie
ma sensu, bo dane się zbierają. Wtedy zobaczysz frazy, na które się pokazujesz,
i to jest materiał na kolejne podstrony.

### 3.2. Wizytówka Google — nadal największy pojedynczy zysk

Pisałem o tym w poprzednim audycie i powtarzam, bo to się nie zmieniło. Przy frazie
„strony internetowe Katowice" połowa pierwszego ekranu to mapa. Bez wizytówki nie
istniejesz w tej połowie, choćby strona była idealna.

Zakładasz na <https://business.google.com>. Po założeniu daj znać — dopiszę link
do danych strukturalnych, żeby Google połączyło wizytówkę ze stroną.

### 3.3. Cienkie podstrony

Realizacje mają po 234–249 słów, a `realizacje.html` tylko 141. Dla Google to mało,
a dla modelu AI jeszcze mniej — nie ma czego zacytować.

Najtańsza poprawka: do każdej realizacji dopisać 2–3 zdania o **konkretnym wyniku**
(„strona ładuje się w 0,9 s", „formularz wysyła 4× więcej zapytań"). To działa
w obie strony: Google dostaje unikalną treść, klient czytający portfolio dostaje
dowód, a model ma zdanie, które może zacytować w odpowiedzi.

### 3.4. Treści, których jeszcze nie masz

Bez zmian względem poprzedniego audytu — najmocniejszy temat to
`ile-kosztuje-strona-internetowa.html`. To fraza o dużym wolumenie i, co ważniejsze,
**dokładnie takie pytania ludzie zadają asystentom AI**. Masz już ceny w `llms.txt`
i w danych strukturalnych; brakuje podstrony, która rozwija temat.

---

## 4. Sprawdzone i poprawne — nie ruszaj

- `title`, `description`, canonical i dane strukturalne na wszystkich 17 podstronach
- dokładnie jeden `H1` na podstronę, sensowna hierarchia nagłówków
- komplet atrybutów `alt` — ani jednego brakującego
- wymiary wszystkich zdjęć (stabilny układ przy wczytywaniu)
- zdjęcia w WebP, lazy-loading tam, gdzie ma sens
- `FAQPage` na FAQ i podstronach lokalnych, `HowTo` na procesie,
  `Service` z cenami na ofercie, okruszki wszędzie
- mapa strony i `robots.txt` bez sprzeczności
