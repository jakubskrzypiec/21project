# Narzędzia

Skrypty pomocnicze. **Nie są częścią strony** — GitHub Pages ich nie publikuje
(wykluczone w `_config.yml`). Uruchamiasz je ręcznie, tylko gdy są potrzebne.

## `build-cases.py`

Generuje sześć podstron realizacji (`realizacja-*.html`) z jednego szablonu.
Przydatne, gdy dodajesz nową realizację albo zmieniasz układ wszystkich naraz.

```bash
python3 narzedzia/build-cases.py
```

> **Uwaga:** skrypt **nadpisuje** pliki `realizacja-*.html` w katalogu głównym.
> Szablon w środku musi być zgodny z resztą serwisu — jeśli zmienisz pasek górny
> albo arkusze stylów na stronie, popraw je też tutaj. Inaczej uruchomienie
> skryptu cofnie te zmiany na sześciu podstronach naraz.
>
> Ostatnia synchronizacja szablonu: 26 sierpnia 2026.

## Co zostało usunięte

`build-hero.py` wkomponowywał logo w zdjęcie laptopa i generował
`hero-laptop-real.webp`. Obecny hero nie używa już tego zdjęcia — ani plik,
ani skrypt nie były do niczego podpięte, więc oba zniknęły z repozytorium.
W razie potrzeby są w historii gita.
