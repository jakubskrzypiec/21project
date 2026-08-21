# 21 project — strona firmowa

Statyczna strona firmy **21 project** (tworzenie stron internetowych, Katowice / Śląsk).
Hostowana na GitHub Pages pod domeną **21project.pl**.

## Struktura

Wszystkie pliki znajdują się bezpośrednio w katalogu głównym. Nie ma folderu
`assets`. Na GitHub należy wgrać całą rozpakowaną zawartość, razem z
`index.html`, `style.css`, fontami, zdjęciami i plikiem `CNAME`.

## Uruchomienie lokalnie

```bash
python3 -m http.server 8000
```

## Co zawiera

- **Hero** na pełny ekran — fotografia laptopa i telefonu z wtopionym logo,
  nagłówek z rotującym słowem (5 wariantów), sekwencyjne wejście, parallaksa przy scrollu.
  Osobny kadr pionowy (`hero-mobile.webp`) dla telefonów.
- **Pasek klientów** — przewijana lista nazw.
- **Liczby** — animowane liczniki.
- **Realizacje** — 5 case studies: Monika Serbista, Maciejewska Design, Pani Projekt,
  DRG Auto, Werka Bramy. Pełne zrzuty w ramce przeglądarki, telefon nachodzi na róg.
- **Oferta** — 4 pakiety: Minimal 1500 zł, Standard 2000 zł, Premium 3000 zł, SEO 1000 zł.
- **Proces** — 4 kroki współpracy.
- **Kontakt** — dane + formularz.

## Uwagi techniczne

- Zero zależności i frameworków — czysty HTML/CSS/JS.
- Paleta: grafit i biel z akcentami Electric Iris oraz Ember Pulse.
- Fonty: **Syne** (nagłówki) + **Geist** (tekst), zapisane w katalogu głównym.
  Każdy font ma dwa podzbiory (`latin` + `latin-ext`) z `unicode-range` —
  bez tego polskie znaki lecą na font zastępczy.
- Animacje respektują `prefers-reduced-motion`.
- Formularz działa przez `mailto:` (strona statyczna, bez backendu).
  Wysyłka serwerowa dojdzie w etapie 2.
- SEO: meta description, Open Graph, canonical, JSON-LD (`ProfessionalService`).

## Do uzupełnienia

- Docelowy adres realizacji „Pani Projekt" (obecnie wersja na GitHub Pages).
- Obrazek `og:image` do podglądu linku w social media.
- Etap 2: panel administracyjny, statystyki ruchu, cotygodniowe leady.
