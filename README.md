# 21project — strona SEO + backend + panel admin

Gotowy projekt bez Lovable. Publiczna część jest zrobiona w czystym HTML/CSS/JS, a backend w Node.js + Express + SQLite.

## Co jest w środku

- nowa strona 21project w czarno-białym, minimalistycznym kierunku bazującym na obecnym 21project.pl;
- oferta: Landing page 1500 zł / Strona z podstronami 2500 zł / Strona + SEO 3000 zł / SEO 1000 zł;
- realne case studies: Monika Serbista, To Oni Projektują, Maciejewska Design, Werka Bramy, DRG Auto;
- osobne indeksowalne podstrony usługowe i lokalne;
- sitemap.xml, robots.txt, canonicale, Open Graph, JSON-LD Schema.org i FAQ Schema;
- formularz zapisujący leady do SQLite;
- anonimowa analityka po zgodzie: odsłony, sesje, źródła, UTM i urządzenia;
- /admin z logowaniem, statystykami, leadami, notatkami, follow-upami i eksportem CSV;
- moduł Firmy / Prospecting: domena, miasto, mail, status, follow-up, szybki audyt strony, filtr stopki <= 2020, filtr braków SEO, import CSV i generator szkicu maila;
- analiza domen po stronie serwera z timeoutem, kontrolą prywatnych adresów i umiarkowaną analizą kolejki;
- opcjonalne powiadomienie o formularzu przez Resend.

## Uruchomienie lokalne

Wymagany Node.js 20+.

```bash
cp .env.example .env
npm install
npm run hash-password -- "WSTAW_TUTAJ_MOCNE_HASLO"
```

Skopiuj wygenerowany hash do `ADMIN_PASSWORD_HASH` w `.env`, ustaw długi `SESSION_SECRET`, a następnie:

```bash
npm start
```

Strona: `http://localhost:3000`
Panel: `http://localhost:3000/admin`

## Ważne: GitHub Pages

Sam frontend można wystawić statycznie, ale **backend, formularz zapisujący leady, panel admin i prospecting nie zadziałają na samym GitHub Pages**. Pełny projekt wdrażaj na Render, Railway, VPS albo innym hostingu obsługującym Node.js i trwały dysk.

## Produkcja

1. Ustaw `NODE_ENV=production`.
2. Ustaw `BASE_URL=https://21project.pl`.
3. Ustaw `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, mocny `SESSION_SECRET`.
4. Zapewnij trwały katalog `data/` dla bazy SQLite.
5. Podepnij domenę 21project.pl i HTTPS.
6. Dodaj `https://21project.pl/sitemap.xml` w Google Search Console.

### Render / Railway

Start command:

```bash
npm start
```

Build command:

```bash
npm install --omit=dev
```

Dla SQLite koniecznie skonfiguruj persistent volume/disk i ustaw `DATABASE_PATH` na ścieżkę na tym dysku.

## E-maile

Formularz zawsze zapisuje lead w panelu. Powiadomienie e-mail jest opcjonalne. Aby je włączyć, uzupełnij:

```env
RESEND_API_KEY=
NOTIFY_EMAIL=jakubskrzypiec.dev@gmail.com
FROM_EMAIL=21project <formularz@twojadomena.pl>
```

Adres FROM musi być zaakceptowany przez dostawcę e-mail.

## Prospecting

Szybki audyt sprawdza m.in.:

- rok copyright/stopki;
- HTTPS;
- meta viewport;
- title;
- meta description;
- Schema.org JSON-LD;
- canonical.

To screening do priorytetyzacji prospectów, nie pełny audyt SEO. Moduł nie robi masowego automatycznego mailingu i nie jest agresywnym crawlerem.

### Import CSV

Panel przyjmuje CSV z kolumnami rozpoznawanymi jako np.:

```text
Firma,WWW,Miasto,E-mail,Telefon,Branża,Notatki
```

Możliwe są także angielskie odpowiedniki: `company`, `domain`, `city`, `email`, `phone`, `industry`, `notes`.

## Gdzie edytować treści

- publiczna strona: `public/*.html`
- styl: `public/assets/css/style.css`
- frontend: `public/assets/js/app.js`
- panel: `public/admin/`
- backend: `server.js`
- audyt domen: `lib/prospect.js`
- baza: `lib/db.js`

