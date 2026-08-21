#!/usr/bin/env python3
"""Generuje podstrony realizacji z jednego szablonu."""
import re, pathlib

ROOT = pathlib.Path(__file__).parent

CASES = [
    dict(
        slug="monika-serbista", name="Monika Serbista",
        cat="Projektowanie wnętrz", city="Ciechanów",
        url="https://monikaserbista.pl/", label="monikaserbista.pl",
        img="monika", year="2025", pkg="Premium",
        lead="Studio wnętrzarskie, które potrzebowało strony w tonie własnych realizacji — "
             "spokojnej, ciemnej i opartej na fotografii.",
        challenge="Projekty wnętrz sprzedają się obrazem, a dotychczasowa komunikacja opierała się "
                  "głównie na Instagramie. Brakowało miejsca, które pokazuje pełne realizacje "
                  "i porządkuje zapytania — zamiast rozmów rozsypanych po wiadomościach prywatnych.",
        solution="Strona powstała wokół fotografii: pełnoekranowy hero, ciemna paleta, "
                 "dużo powietrza i typografia, która nie konkuruje ze zdjęciami. "
                 "Portfolio podzielone na osobne realizacje, a zamiast zwykłego formularza — "
                 "brief online, który prowadzi klienta przez konkretne pytania.",
        result="Klient dostał jedno miejsce, do którego kieruje z social mediów, "
               "i zapytania z gotowym zakresem: metraż, rodzaj wnętrza i oczekiwania — "
               "wszystko jeszcze przed pierwszą rozmową.",
        scope=["Projekt graficzny", "Strona wielopodstronowa", "Brief online",
               "Portfolio realizacji", "Wdrożenie i publikacja"],
    ),
    dict(
        slug="maciejewska-design", name="Maciejewska Design",
        cat="Projektowanie wnętrz", city="",
        url="https://maciejewskadesign.pl/", label="maciejewskadesign.pl",
        img="maciejewska", year="2025", pkg="Premium",
        lead="Elegancka wizytówka pracowni zbudowana wokół portfolio i krótkiej ścieżki "
             "do zapytania o projekt.",
        challenge="Pracownia miała mocne realizacje, ale rozproszone materiały. "
                  "Potrzebna była strona, która od pierwszego ekranu ustawia poziom — "
                  "premium, ale bez przepychu — i szybko prowadzi do kontaktu.",
        solution="Całość oparto na dużych kadrach realizacji, stonowanej typografii i wyraźnym podziale "
                 "na ofertę, realizacje i kontakt. Każda sekcja kończy się jednym, "
                 "czytelnym krokiem dalej, więc odwiedzający nigdy nie zostaje bez wskazówki.",
        result="Spójna identyfikacja w sieci i strona, którą pracownia może wysłać "
               "zamiast folderu z plikami. Do tego optymalizacja pod wyszukiwarki.",
        scope=["Projekt graficzny", "Strona wielopodstronowa", "Portfolio realizacji",
               "SEO i optymalizacja", "Wdrożenie i publikacja"],
    ),
    dict(
        slug="pani-projekt", name="Pani Projekt",
        cat="Wnętrza prywatne", city="",
        url="https://jakubskrzypiec.github.io/paniprojekt/", label="Zobacz stronę",
        img="pani", year="2025", pkg="Standard",
        lead="Kameralna strona dla projektantki wnętrz prywatnych — ciepła paleta "
             "i czytelnie opisany proces współpracy.",
        challenge="Klientka pracuje z osobami, które urządzają mieszkanie pierwszy raz. "
                  "Największą barierą nie była cena, tylko niepewność: co się właściwie dzieje "
                  "po podpisaniu umowy i ile to trwa.",
        solution="Strona została zbudowana wokół procesu. Ciepła, jasna paleta zamiast zimnego minimalizmu, "
                 "spokojna kompozycja i sekcja krok po kroku opisująca współpracę — "
                 "od pierwszej rozmowy po odbiór projektu.",
        result="Klient wchodzi na rozmowę wiedząc, czego się spodziewać. "
               "Mniej pytań o podstawy, więcej rozmów o samym wnętrzu.",
        scope=["Projekt graficzny", "Landing page", "Treści i redakcja",
               "Opis procesu współpracy", "Wdrożenie i publikacja"],
    ),
    dict(
        slug="drg-auto", name="DRG Auto",
        cat="Komis i detailing", city="Miastko",
        url="https://jakubskrzypiec.github.io/drgauto/", label="Zobacz stronę",
        img="drg", year="2025", pkg="Standard",
        lead="Dwie usługi na jednej stronie — sprzedaż samochodów i detailing — "
             "bez mieszania ich ze sobą.",
        challenge="Komis i detailing to dwie różne grupy klientów. Wrzucone na jedną stronę "
                  "bez pomysłu zaczynają sobie przeszkadzać: kupujący auto gubi się w usługach, "
                  "a klient detailingu nie wie, czy trafił pod właściwy adres.",
        solution="Mocny, kontrastowy hero ustawia markę, a zaraz pod nim strona rozdziela się "
                 "na dwie wyraźne ścieżki. Doszła sekcja FAQ zdejmująca powtarzalne pytania "
                 "i wyeksponowany numer telefonu — w tej branży klient najpierw dzwoni, "
                 "a dopiero potem pisze.",
        result="Jeden adres dla obu usług, bez chaosu. Telefon dostępny z każdego miejsca "
               "na stronie, na komputerze i na telefonie.",
        scope=["Projekt graficzny", "Landing page", "Sekcja FAQ",
               "Kontakt telefoniczny", "Wdrożenie i publikacja"],
    ),
    dict(
        slug="werka-bramy", name="Werka Bramy",
        cat="Bramy i ogrodzenia", city="Ruda Śląska",
        url="https://werkabramy.pl/", label="werkabramy.pl",
        img="werka", year="2025", pkg="Premium",
        lead="Strona firmy montującej bramy i ogrodzenia na Śląsku — techniczna, "
             "konkretna i nastawiona na wycenę.",
        challenge="Klienci szukają lokalnie: „bramy Ruda Śląska”, „ogrodzenia Katowice”. "
                  "Bez obecności w tych wynikach firma traci zapytania na rzecz większych, "
                  "ale wcale nie lepszych wykonawców.",
        solution="Techniczny, kontrastowy styl dopasowany do branży, realizacje pokazane "
                 "na dużych zdjęciach i bezpłatna wycena dostępna z każdego miejsca na stronie. "
                 "Do tego lokalne SEO pod konkretne miasta w regionie.",
        result="Firma jest widoczna tam, gdzie faktycznie szukają jej klienci, "
               "a droga od wejścia na stronę do wysłania zapytania to dwa kliknięcia.",
        scope=["Projekt graficzny", "Strona firmowa", "Lokalne SEO",
               "Formularz wyceny", "Wdrożenie i publikacja"],
    ),
]

HEADER = '''<header class="header" id="top">
  <div class="shell header__inner">

    <a class="logo" href="index.html" aria-label="21 project — strona główna">
      <img src="assets/img/logo.svg" width="4616" height="1360" alt="21 project">
    </a>

    <button class="burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="Menu">
      <span></span><span></span>
    </button>

    <nav class="nav" id="nav" aria-label="Nawigacja główna">
      <a href="index.html#realizacje">Realizacje</a>
      <a href="index.html#oferta">Oferta</a>
      <a href="index.html#proces">Proces</a>
      <a href="index.html#kontakt">Kontakt</a>
      <a href="index.html#kontakt" class="btn btn--dark btn--sm nav__cta">Bezpłatna wycena</a>
    </nav>

  </div>
</header>'''

FOOTER = '''<footer class="footer">
  <div class="shell">
    <div class="footer__inner">

      <div class="footer__brand">
        <a class="logo logo--inv logo--mark" href="index.html" aria-label="21 project — strona główna">
          <img src="assets/img/logo-mark.svg" width="1588" height="1356" alt="21 project">
        </a>
        <p>
          Projektowanie i wdrażanie stron internetowych dla firm.<br>
          Katowice, Śląsk i cała Polska — zdalnie.
        </p>
      </div>

      <nav class="footer__nav" aria-label="Stopka">
        <a href="index.html#realizacje">Realizacje</a>
        <a href="index.html#oferta">Oferta</a>
        <a href="index.html#proces">Proces</a>
        <a href="index.html#kontakt">Kontakt</a>
        <a href="polityka-prywatnosci.html">Polityka prywatności</a>
      </nav>

      <div class="footer__contact">
        <a href="tel:+48601863788">601 863 788</a>
        <a href="mailto:jakubskrzypiec.dev@gmail.com">jakubskrzypiec.dev@gmail.com</a>
        <span>Katowice, Śląsk</span>
      </div>

    </div>

    <div class="footer__bottom">
      <span>© <span id="year">2026</span> 21 project · Jakub Skrzypiec</span>
      <span>Projekt i wykonanie: 21 project</span>
    </div>
  </div>
</footer>

<script src="assets/js/script.js"></script>
</body>
</html>'''


def page(c, prev, nxt):
    place = f"{c['cat']} · {c['city']}" if c["city"] else c["cat"]
    scope = "\n".join(f"          <li>{s}</li>" for s in c["scope"])
    return f'''<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{c['name']} — realizacja | 21 project</title>
<meta name="description" content="{c['name']} — {place.lower()}. {c['lead']}">
<link rel="canonical" href="https://21project.pl/realizacja-{c['slug']}.html">
<meta name="theme-color" content="#FAFAFA">

<meta property="og:type" content="article">
<meta property="og:locale" content="pl_PL">
<meta property="og:title" content="{c['name']} — realizacja | 21 project">
<meta property="og:description" content="{c['lead']}">

<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/syne-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<a class="skip-link" href="#main">Przejdź do treści</a>
<div class="progress" aria-hidden="true"><span></span></div>

{HEADER}

<main id="main">

  <!-- ---------- nagłówek realizacji ---------- -->
  <section class="cs-hero">
    <div class="shell">
      <a class="cs-back" href="index.html#realizacje">
        <span aria-hidden="true">←</span> Wszystkie realizacje
      </a>

      <p class="eyebrow">{place}</p>
      <h1>{c['name']}</h1>
      <p class="cs-hero__lead">{c['lead']}</p>

      <dl class="cs-meta">
        <div><dt>Zakres</dt><dd>Strona internetowa</dd></div>
        <div><dt>Pakiet</dt><dd>{c['pkg']}</dd></div>
        <div><dt>Rok</dt><dd>{c['year']}</dd></div>
        <div><dt>Adres</dt>
          <dd><a href="{c['url']}" target="_blank" rel="noopener">{c['label']} <span aria-hidden="true">↗</span></a></dd>
        </div>
      </dl>
    </div>
  </section>

  <!-- ---------- duży zrzut ---------- -->
  <section class="cs-shot">
    <div class="shell">
      <div class="browser reveal">
        <div class="browser__bar" aria-hidden="true">
          <span class="browser__dots"><i></i><i></i><i></i></span>
          <span class="browser__url">{c['label']}</span>
        </div>
        <img src="assets/img/{c['img']}-desktop.webp" width="1600" height="909"
             alt="{c['name']} — widok strony na komputerze">
      </div>
    </div>
  </section>

  <!-- ---------- wyzwanie / rozwiązanie / efekt ---------- -->
  <section class="section">
    <div class="shell cs-body">

      <div class="cs-story">
        <article class="cs-block reveal">
          <p class="cs-block__no">01</p>
          <h2>Wyzwanie</h2>
          <p>{c['challenge']}</p>
        </article>

        <article class="cs-block reveal">
          <p class="cs-block__no">02</p>
          <h2>Rozwiązanie</h2>
          <p>{c['solution']}</p>
        </article>

        <article class="cs-block reveal">
          <p class="cs-block__no">03</p>
          <h2>Efekt</h2>
          <p>{c['result']}</p>
        </article>
      </div>

      <aside class="cs-aside reveal">
        <p class="cs-aside__title">Zakres prac</p>
        <ul class="cs-scope">
{scope}
        </ul>
        <a class="btn btn--dark btn--full" href="index.html#kontakt">Chcę podobną stronę</a>
      </aside>

    </div>
  </section>

  <!-- ---------- widok mobilny ---------- -->
  <section class="section section--alt">
    <div class="shell cs-mobile">
      <div class="cs-mobile__text reveal">
        <p class="eyebrow">Wersja mobilna</p>
        <h2>Ta sama strona w telefonie</h2>
        <p class="head__lead">
          Każdy projekt powstaje równolegle w dwóch układach. To nie jest wersja okrojona —
          to ta sama strona, przełożona na mniejszy ekran.
        </p>
      </div>
      <div class="cs-mobile__shot reveal">
        <div class="phone phone--static">
          <img src="assets/img/{c['img']}-mobile.webp" width="560" height="954" loading="lazy"
               alt="{c['name']} — widok strony na telefonie">
        </div>
      </div>
    </div>
  </section>

  <!-- ---------- następna realizacja ---------- -->
  <nav class="cs-nav" aria-label="Nawigacja między realizacjami">
    <a class="cs-nav__item cs-nav__item--prev" href="realizacja-{prev['slug']}.html">
      <span class="cs-nav__label"><span aria-hidden="true">←</span> Poprzednia</span>
      <span class="cs-nav__name">{prev['name']}</span>
    </a>
    <a class="cs-nav__item cs-nav__item--next" href="realizacja-{nxt['slug']}.html">
      <span class="cs-nav__label">Następna <span aria-hidden="true">→</span></span>
      <span class="cs-nav__name">{nxt['name']}</span>
    </a>
  </nav>

  <!-- ---------- CTA ---------- -->
  <section class="cs-cta">
    <div class="shell">
      <h2 class="reveal">Zróbmy coś takiego dla Ciebie</h2>
      <p class="reveal">Napisz kilka zdań o firmie — odeślę wycenę i termin.</p>
      <div class="cs-cta__actions reveal">
        <a href="index.html#kontakt" class="btn btn--light">Bezpłatna wycena</a>
        <a href="index.html#oferta" class="btn btn--ghost-inv">Zobacz pakiety</a>
      </div>
    </div>
  </section>

</main>

{FOOTER}
'''


def main():
    n = len(CASES)
    for i, c in enumerate(CASES):
        prev = CASES[(i - 1) % n]
        nxt = CASES[(i + 1) % n]
        out = ROOT / f"realizacja-{c['slug']}.html"
        out.write_text(page(c, prev, nxt), encoding="utf-8")
        print("zapisano", out.name)


if __name__ == "__main__":
    main()
