# Panel 21 project — backend

Prywatny panel dla właściciela 21project.pl: ruch na stronie, poczta Gmail, kalendarz spotkań,
projekty klientów, leady i wysyłka wiadomości do potencjalnych klientów.

Node.js + Express + SQLite. Bez frameworka na froncie, bez buildu — `npm install && npm start`.

---

## 1. Co jest w środku

| Moduł | Adres w panelu | Co robi |
| --- | --- | --- |
| Pulpit | `/admin#/pulpit` | wszystko naraz: ruch, nieprzeczytane maile, spotkania, projekty, gorące leady |
| Ruch na stronie | `#/ruch` | własna analityka: odsłony, użytkownicy, źródła, urządzenia, kampanie UTM, podgląd na żywo |
| Poczta | `#/poczta` | skrzynka Gmail: lista wątków, czytanie, odpowiadanie, archiwum, streszczenie wątku przez AI |
| Kalendarz | `#/kalendarz` | spotkania z panelu + wydarzenia z Google Calendar, wyszukiwanie wolnych okien |
| Projekty | `#/projekty` | zlecenia, etapy, zadania (domyślnie 8 kroków Twojego procesu), notatki, budżet, terminy |
| Leady | `#/leady` | kontakty z formularza i z wyszukiwania, analiza strony leada, historia wiadomości |
| Wysyłka | `#/wysylka` | kolejka wiadomości, szablony, limity, lista wykluczeń |
| Ustawienia | `#/ustawienia` | połączenie z Google, status AI, kod licznika do wklejenia na stronie |

Panel widzi wyłącznie jedno konto — to z `ADMIN_EMAIL`. Nie ma rejestracji ani innych ról.

---

## 2. Uruchomienie lokalnie

```bash
cd backend
npm install
cp .env.example .env

npm run set-password -- "twoje-mocne-haslo"   # wypisze ADMIN_PASSWORD_HASH i JWT_SECRET
# wklej oba do .env, ustaw ADMIN_EMAIL

npm start
```

Panel: <http://localhost:4000/admin>

---

## 3. Google (poczta + kalendarz)

1. <https://console.cloud.google.com> → nowy projekt (np. „21project panel").
2. **APIs & Services → Library** → włącz **Gmail API** i **Google Calendar API**.
3. **OAuth consent screen** → typ **External**, tryb **Testing**, w „Test users" dodaj swój adres Gmail.
   (W trybie testowym token odświeżania wygasa po 7 dniach — gdy panel poprosi o ponowne
   połączenie, kliknij „Połącz konto Google". Publikacja aplikacji zdejmuje ten limit.)
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   W „Authorized redirect URIs" wpisz dokładnie to, co masz w `GOOGLE_REDIRECT_URI`,
   np. `https://panel.21project.pl/api/google/callback`.
5. Client ID i Client Secret wklej do `.env`, zrestartuj serwer.
6. Panel → **Ustawienia → Połącz konto Google**.

Zakresy: `gmail.modify`, `gmail.send`, `calendar`, `userinfo.email`. Tokeny leżą w bazie SQLite,
nigdy nie trafiają do przeglądarki.

---

## 4. Licznik ruchu na stronie

W **Ustawieniach** jest gotowa linijka do skopiowania. Wklej ją przed `</body>` na każdej podstronie:

```html
<script defer src="https://panel.21project.pl/t.js"></script>
```

Licznik:

- nie zapisuje ciasteczek i nie używa `localStorage` (tylko `sessionStorage` na numer sesji),
- identyfikuje odwiedzającego hashem `sól_dnia + IP + przeglądarka`, a sól zmienia się codziennie —
  po dobie nie da się połączyć wizyt z jedną osobą,
- respektuje ustawienie „Do Not Track",
- odfiltrowuje boty i mierzy czas na stronie, głębokość przewijania oraz kliknięcia
  w telefon, mail i przycisk kontaktu.

**Dlatego nie potrzebujesz banera zgód na cookies** — w odróżnieniu od Google Analytics.

Własne zdarzenie możesz wysłać z dowolnego miejsca:

```js
window.p21.event('kliknięcie_cennik', { pakiet: 'Premium' });
```

---

## 5. Formularz kontaktowy prosto do panelu

Dziś formularz na stronie otwiera program pocztowy (`mailto:`). Żeby zapytania wpadały do panelu
jako leady, dołóż na stronie po `motion.js`:

```html
<script defer src="https://panel.21project.pl/form-hook.js"
        data-endpoint="https://panel.21project.pl"></script>
```

Skrypt dokłada pułapkę na boty, wysyła dane na `POST /api/contact`, a **gdy backend nie odpowiada,
wraca do starego zachowania z `mailto:`** — żadne zapytanie nie przepada. Jeśli konto Google jest
połączone, dostajesz też natychmiastowe powiadomienie mailem.

---

## 6. Szukanie leadów po stopkach stron

Panel → **Leady → Szukaj po stopkach**. Wklejasz adresy stron (albo adres listingu, z którego mam
wyciągnąć domeny). Dla każdej strony backend:

1. sprawdza `robots.txt` i odczekuje między pobraniami (`CRAWLER_DELAY_MS`),
2. wycina obszar stopki i wyciąga e-mail, telefon, NIP, social media oraz podpis wykonawcy
   („Realizacja: …" — od razu widzisz, kto obsługuje konkurencję),
3. robi audyt techniczny strony (responsywność, HTTPS, `title`, `description`, H1, schema.org,
   Open Graph, formaty zdjęć, waga strony, czas odpowiedzi, użyty CMS),
4. wystawia **ocenę potencjału 0–100** — im wyżej, tym więcej rzeczy do naprawy,
   czyli tym większa szansa, że firma realnie potrzebuje nowej strony.

Ocena i lista powodów lądują na karcie leada i są potem materiałem dla AI do napisania wiadomości.

Opcjonalnie: uzupełnij `GOOGLE_CSE_KEY` i `GOOGLE_CSE_CX`
(<https://programmablesearchengine.google.com>), żeby wyszukiwać firmy zapytaniem zamiast wklejać
adresy ręcznie.

**Zapora SSRF:** backend pobiera wyłącznie publiczne adresy `http(s)` — adresy w sieciach
prywatnych są odrzucane.

---

## 7. Wysyłka wiadomości — i granice, których pilnuje backend

Wiadomość powstaje z szablonu albo z AI (`ANTHROPIC_API_KEY`), zawsze **najpierw jako szkic**.
Tryb ustawia `OUTREACH_MODE`:

| Tryb | Co się dzieje |
| --- | --- |
| `draft` (domyślny) | wiadomość ląduje w **Kopiach roboczych Gmaila**. Nic nie wychodzi bez Ciebie |
| `approve` | wiadomość czeka w kolejce, wychodzi po kliknięciu „Wyślij" |
| `auto` | kolejka wysyła sama, w oknie godzinowym i w ramach limitów |

Bezpieczniki działające w każdym trybie:

- limit dzienny i godzinowy (`OUTREACH_DAILY_LIMIT`, `OUTREACH_HOURLY_LIMIT`),
- okno wysyłki — domyślnie dni robocze 9–17 czasu polskiego,
- losowy odstęp 20–60 s między wiadomościami w trybie automatycznym,
- **stopka z linkiem wypisania** doklejana do każdej wiadomości; kliknięcie linku wpisuje adres
  i domenę na listę wykluczeń i ustawia leada jako „wypisany",
- lista wykluczeń sprawdzana tuż przed wysyłką — także dla wiadomości już stojących w kolejce,
- dwa razy dziennie backend sprawdza, kto odpisał, i podnosi status leada na „odpisał".

**Zanim włączysz `auto`:** wysyłka handlowa do firm w Polsce podlega RODO i art. 10 ustawy
o świadczeniu usług drogą elektroniczną. W praktyce oznacza to: pisz na **firmowe** adresy
(`biuro@`, `kontakt@`), tylko do firm faktycznie pasujących do Twojej oferty, z realną możliwością
wypisania i jasną informacją, kto pisze i po co — panel robi to za Ciebie, ale to Ty odpowiadasz za
listę odbiorców. Zacznij od trybu `draft` i przeczytaj kilkanaście wiadomości, zanim cokolwiek
wyjdzie automatycznie. Wysyłka na adresy osób prywatnych i kupowane bazy — nie.

---

## 8. Wdrożenie na serwer

Backend musi stać na serwerze z Node.js (VPS, Railway, Render, Fly.io). GitHub Pages nie uruchomi
backendu — tam zostaje sama strona.

Zalecany układ: strona na `21project.pl` (GitHub Pages), panel na subdomenie `panel.21project.pl`.

```bash
# przykład na VPS z systemd
sudo useradd -r -s /bin/false panel21
sudo cp -r backend /opt/panel21 && sudo chown -R panel21:panel21 /opt/panel21
cd /opt/panel21 && sudo -u panel21 npm ci --omit=dev
```

`/etc/systemd/system/panel21.service`:

```ini
[Unit]
Description=Panel 21 project
After=network.target

[Service]
Type=simple
User=panel21
WorkingDirectory=/opt/panel21
ExecStart=/usr/bin/node src/server.js
Restart=always
EnvironmentFile=/opt/panel21/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now panel21
```

Przed panelem postaw nginx albo Caddy z certyfikatem HTTPS (ciasteczko sesji ma flagę `secure`,
więc **panel nie zaloguje się po zwykłym http** poza localhostem).

Kopia zapasowa to jeden plik: `data/panel.sqlite`. Wystarczy `sqlite3 data/panel.sqlite ".backup kopia.sqlite"` w cronie.

---

## 9. Bezpieczeństwo

- hasło trzymane wyłącznie jako hash bcrypt (koszt 12), nigdy jawnie,
- sesja w ciasteczku `httpOnly` + `sameSite=lax`, `secure` przy HTTPS,
- blokada po 5 nieudanych logowaniach (rosnąca, do 15 minut),
- opcjonalna zapora po IP: `ADMIN_IP_ALLOWLIST=1.2.3.4,5.6.7.8`,
- panel wysyła `X-Robots-Tag: noindex` i `X-Frame-Options: DENY`,
- CORS otwarty **tylko** dla `/api/track`, `/api/contact` i `/t.js`, i tylko dla domen z `ALLOWED_ORIGINS`,
- formularz kontaktowy: limit 5 zgłoszeń na 10 minut z jednego IP + pułapka na boty,
- logowania, wysyłki i wypisania trafiają do tabeli `audit_log`.

---

## 10. Mapa API

Publiczne (bez logowania): `POST /api/track`, `POST /api/contact`, `GET /u/:token`, `GET /t.js`, `GET /health`.

Chronione — wszystkie pod `/api/admin`:

```
GET    /dashboard
GET    /analytics/{summary,timeseries,breakdown,live}
GET    /mail/threads            POST /mail/send        POST /mail/threads/:id/{reply,read,archive,star,summary}
GET    /calendar                POST /calendar         PATCH|DELETE /calendar/:id     GET /calendar/free-slots
GET    /projects                POST /projects         PATCH|DELETE /projects/:id
POST   /projects/:id/tasks      PATCH|DELETE /projects/:id/tasks/:taskId
GET    /leads                   POST /leads            PATCH|DELETE /leads/:id
POST   /leads/{inspect,scan,harvest,search}
GET    /outreach                POST /outreach/{prepare,prepare-bulk,preview,run-queue,sync-replies}
POST   /outreach/:id/{send,queue}
GET    /outreach/templates/all  POST /outreach/templates
GET    /outreach/suppression/all POST /outreach/suppression
```

## 11. Struktura plików

```
backend/
├── src/
│   ├── server.js              punkt wejścia, montowanie tras, harmonogram
│   ├── config.js              odczyt .env i walidacja
│   ├── db.js                  schemat SQLite + startowe szablony
│   ├── middleware/auth.js     sesja, blokada logowań, zapora IP
│   ├── routes/                trasy HTTP (jedna na moduł)
│   └── services/
│       ├── analytics.js       zapis i odczyt statystyk ruchu
│       ├── google.js          OAuth i klienci Google
│       ├── gmail.js           operacje na skrzynce
│       ├── calendarSvc.js     spotkania + Google Calendar
│       ├── leadFinder.js      pobieranie stron, stopki, audyt, ocena
│       ├── outreach.js        szablony, kolejka, limity, wykluczenia
│       └── ai.js              pisanie wiadomości i streszczenia
├── public/
│   ├── admin/                 panel (HTML + jeden plik JS + jeden CSS)
│   └── form-hook.js           podpięcie formularza ze strony
└── data/panel.sqlite          baza (poza gitem)
```
