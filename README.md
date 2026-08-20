# 21 project — strona firmowa

Statyczna strona firmy **21 project** (tworzenie stron internetowych, Katowice / Śląsk).
Hostowana na GitHub Pages pod domeną **21project.pl**.

## Struktura

```
index.html            # cała strona (one-page)
assets/
  css/style.css
  js/script.js
  img/                # zrzuty realizacji (webp), logo, favicon
CNAME                 # 21project.pl
```

## Uruchomienie lokalnie

```bash
python3 -m http.server 8000
# albo
npx serve .
```

## Co zawiera

- **Hero** z mockupem laptop + telefon (czysty CSS, bez wklejonej grafiki) pokazującym responsywność
- **Realizacje** — 5 case studies: Monika Serbista, Maciejewska Design, Pani Projekt, DRG Auto, Werka Bramy
  (każda w ramce przeglądarki + podgląd mobilny)
- **Oferta** — 4 pakiety: Minimal, Standard, Premium, SEO
- **Proces** — 4 kroki współpracy
- **Kontakt** — dane + formularz

## Uwagi techniczne

- Zero zależności i frameworków — czysty HTML/CSS/JS.
- Fonty: Fraunces (nagłówki) + Manrope (tekst), z Google Fonts.
- Zdjęcia realizacji: WebP, lazy-loading poniżej pierwszego ekranu.
- Formularz kontaktowy działa przez `mailto:` (strona statyczna, bez backendu).
  Podmiana na formularz z wysyłką serwerową będzie możliwa w etapie 2.
- SEO: meta description, Open Graph, canonical, JSON-LD (`ProfessionalService`).

## Do uzupełnienia

- Ceny pakietów Minimal / Standard / Premium (obecnie „wycena indywidualna”).
- Docelowy adres realizacji „Pani Projekt” (obecnie wersja na GitHub Pages).
- Obrazek `og:image` do podglądu linku w social media.
