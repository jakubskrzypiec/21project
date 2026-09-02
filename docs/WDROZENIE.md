# Wdrożenie panelu — instrukcja klik po kliku

Dla osoby, która nie robiła tego nigdy wcześniej. Nie musisz rozumieć, co robi każdy krok —
wystarczy, że wykonasz je po kolei. Całość: około godziny.

Potrzebujesz trzech rzeczy: konta GitHub (masz), karty płatniczej do Railway (~5 USD/mies.)
i dostępu do ustawień DNS domeny `21project.pl` (tam, gdzie ją kupiłeś).

---

## Etap 1 — kod na GitHubie (5 minut)

1. Wejdź na <https://github.com/jakubskrzypiec/21project/branches>
2. Przy gałęzi `claude/backend-admin-panel-cs0oie` kliknij zielony **New pull request**
3. Kliknij **Create pull request**, potem **Merge pull request** i **Confirm merge**

Od tej chwili kod panelu jest w gałęzi `main`, a poprawki SEO są na żywej stronie.
Folder `backend` jest ukryty przed stroną plikiem `_config.yml`, więc nikt go nie zobaczy
pod adresem 21project.pl.

---

## Etap 2 — Railway (15 minut)

1. <https://railway.app> → **Login with GitHub** → zgódź się na dostęp do repozytoriów
2. **New Project** → **Deploy from GitHub repo** → wybierz **21project**
3. Poczekaj, aż zbuduje. **Pierwsza próba się nie uda i tak ma być** — Railway jeszcze nie wie,
   gdzie szukać panelu.
4. Kliknij w kafelek usługi → zakładka **Settings**:
   - znajdź **Root Directory** → wpisz `backend` → zatwierdź
   - **Start Command** zostaw puste (odczyta się z pliku projektu)
5. Zakładka **Variables** → przycisk **Raw Editor** → wklej całość:

```
NODE_ENV=production
DATA_DIR=/app/data
PUBLIC_URL=https://panel.21project.pl
SITE_URL=https://21project.pl
ALLOWED_ORIGINS=https://21project.pl,https://www.21project.pl
ADMIN_EMAIL=jakubskrzypiec.dev@gmail.com
ADMIN_PASSWORD=tu-wpisz-swoje-haslo-min-10-znakow
OUTREACH_MODE=draft
```

   Zmień wartość `ADMIN_PASSWORD` — to będzie Twoje hasło do panelu. Wymyśl długie,
   inne niż do poczty.

   Ustaw też **`JWT_SECRET`** na stałą, losową wartość (min. 32 znaki, np. z
   `openssl rand -base64 48`). Zostawiony pusty wylosuje się sam i zapisze w bazie —
   a wtedy każde wdrożenie, przy którym baza nie przetrwa, wylogowuje z panelu
   i rozłącza konto Google.

6. Zakładka **Volumes** → **New Volume** → ścieżka **`/app/data`**

   > To jest dysk na Twoje dane: leady, projekty, notatki, spotkania. **Bez niego stracisz
   > wszystko przy pierwszej aktualizacji.** Nie pomijaj tego kroku.

7. Railway przebuduje projekt. W zakładce **Deployments → View logs** powinno pojawić się:

```
21project panel → https://panel.21project.pl (port ..., tryb production)
```

Jeśli zamiast tego widzisz `Brakuje konfiguracji` — wróć do punktu 5, czegoś brakuje w Variables.

---

## Etap 3 — adres panelu (15 minut, w tym czekanie)

1. Railway → **Settings → Networking → Custom Domain** → wpisz `panel.21project.pl`
2. Railway pokaże adres w stylu `costam.up.railway.app` — skopiuj go
3. Wejdź tam, gdzie kupiłeś domenę, znajdź **DNS / rekordy DNS** i dodaj:

| Typ | Nazwa (host) | Wartość |
| --- | --- | --- |
| CNAME | `panel` | `costam.up.railway.app` |

4. Odczekaj kilkanaście minut i wejdź na **<https://panel.21project.pl/admin>**

Zaloguj się adresem z `ADMIN_EMAIL` i hasłem z `ADMIN_PASSWORD`.

**Panel działa.** Poczta i kalendarz są jeszcze puste — to następny etap.

> Główna domena `21project.pl` pozostaje nietknięta. Strona dalej stoi na GitHub Pages,
> panel to osobna subdomena.

---

## Etap 4 — Google: poczta i kalendarz (20 minut)

Najwięcej klikania, ale wszystko w jednym panelu Google.

1. <https://console.cloud.google.com> → góra ekranu, lista projektów → **New Project**
   → nazwa `21project panel` → **Create**
2. Menu → **APIs & Services → Library** → wyszukaj **Gmail API** → **Enable**
3. To samo dla **Google Calendar API** → **Enable**
4. **APIs & Services → OAuth consent screen**:
   - User Type: **External** → **Create**
   - App name: `21project panel`, e-mail wsparcia i kontaktowy: Twój
   - **Scopes** — pomiń, kliknij dalej
   - **Test users** → **Add users** → wpisz swój adres Gmail → zapisz
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs → **Add URI** → wklej dokładnie:
     `https://panel.21project.pl/api/google/callback`
   - **Create** → wyskoczy okienko z **Client ID** i **Client Secret**
6. Wróć do Railway → **Variables** → dopisz trzy linie (podmień `...` na wartości z okienka):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://panel.21project.pl/api/google/callback
```

7. Po przebudowaniu wejdź w panel → **Ustawienia → Połącz konto Google** → zaloguj się
   i zaakceptuj dostęp.

   Google pokaże ostrzeżenie „aplikacja nie została zweryfikowana" — to normalne przy własnej
   aplikacji. Kliknij **Zaawansowane → Przejdź do 21project panel**.

Od tej chwili masz w panelu skrzynkę i kalendarz.

> Dopóki aplikacja jest w trybie „Testing", Google co 7 dni prosi o ponowne połączenie.
> Wtedy po prostu klikasz ten sam przycisk. Żeby to wyłączyć: OAuth consent screen → **Publish app**.

---

## Etap 5 — podłączenie strony do panelu (5 minut)

Dopiero teraz strona zacznie raportować ruch, a formularz kontaktowy trafiać do panelu.
Dwie linijki przed `</body>` na każdej podstronie:

```html
<script defer src="https://panel.21project.pl/t.js"></script>
<script defer src="https://panel.21project.pl/form-hook.js" data-endpoint="https://panel.21project.pl"></script>
```

Napisz, kiedy panel będzie już pod swoim adresem — wkleję to we wszystkie podstrony za Ciebie.

Sprawdzenie: wejdź na 21project.pl, kliknij po podstronach, potem w panelu **Ruch na stronie**.
Powinieneś zobaczyć własne wizyty.

---

## Etap 6 — AI (opcjonalnie, 5 minut)

Żeby panel pisał spersonalizowane wiadomości do potencjalnych klientów i streszczał wątki poczty:

1. <https://console.anthropic.com> → załóż konto → **API Keys** → **Create Key**
2. Doładuj konto (płatność za zużycie; jedna wiadomość to ułamek grosza)
3. Railway → **Variables** → dopisz: `ANTHROPIC_API_KEY=sk-ant-...`

Bez tego panel działa normalnie — po prostu wiadomości piszesz z szablonów.

---

## Po wdrożeniu

**Kopia zapasowa.** Raz w miesiącu: Railway → zakładka **Data** przy wolumenie → pobierz
`panel.sqlite`. To cała Twoja baza w jednym pliku.

**Zmiana hasła.** Railway → Variables → zmień `ADMIN_PASSWORD` → zapisz. Restart przeliczy hash.

**Wysyłka.** Zostaw `OUTREACH_MODE=draft`, dopóki nie przeczytasz kilkunastu wygenerowanych
wiadomości. W tym trybie nic nie wychodzi bez Ciebie — wszystko ląduje w Kopiach roboczych Gmaila.
Zanim to zmienisz, przeczytaj punkt 7 w `backend/README.md`.

---

## Gdy coś nie działa

| Objaw | Przyczyna |
| --- | --- |
| Railway: `Brakuje konfiguracji w .env` | brak którejś zmiennej w **Variables** — komunikat mówi której |
| Railway buduje, ale nic nie startuje | nie ustawiony **Root Directory = `backend`** |
| `panel.21project.pl` nie otwiera się | DNS jeszcze nie zadziałał — odczekaj do godziny |
| Panel prosi o hasło w kółko | najczęściej brak wolumenu na `/app/data` albo pusty `JWT_SECRET` — sprawdź na Pulpicie, czy jest ostrzeżenie o dysku, i w logach linijkę `dysk: N. uruchomienie` (na trwałym dysku N rośnie po każdym wdrożeniu) |
| Poczta: „Konto Google nie jest połączone" | Etap 4 niedokończony albo trzeba odnowić połączenie |
| Google: `redirect_uri_mismatch` | adres w Google Cloud musi być **co do znaku** taki jak `GOOGLE_REDIRECT_URI` |
| Dane zniknęły po aktualizacji | nie dodany **wolumen** na `/app/data` (Etap 2, punkt 6) |
