"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";

const projects = [
  { name: "Monika Serbista", label: "Projektowanie wnętrz", tone: "warm", href: "https://monikaserbista.pl/", headline: "Wnętrza, w których chce się żyć." },
  { name: "Maciejewska Design", label: "Architektura wnętrz", tone: "stone", href: "https://jakubskrzypiec.github.io/maciejewskadesign/", headline: "Wnętrza z ciszą, funkcją i światłem." },
  { name: "DRG Auto", label: "Motoryzacja", tone: "dark", href: "https://jakubskrzypiec.github.io/drgauto/", headline: "Samochody. Detailing." },
  { name: "Werka Bramy", label: "Bramy i ogrodzenia", tone: "gate", href: "https://jakubskrzypiec.github.io/werkabramy/", headline: "Na wymiar. Na Śląsku." },
];

const offers = [
  { number: "01", title: "Landing page", text: "Jedna dopracowana strona, która przedstawia ofertę i prowadzi klienta prosto do kontaktu.", items: ["Projekt indywidualny", "Treści sprzedażowe", "Mobile-first", "SEO na start"] },
  { number: "02", title: "Strona firmowa", text: "Pełna witryna budująca wiarygodność firmy, porządkująca ofertę i wspierająca sprzedaż.", items: ["Strona główna", "Podstrony oferty", "Formularz kontaktowy", "Publikacja i domena"] },
  { number: "03", title: "Rework + SEO", text: "Nowy wygląd, lepsza struktura, wyższa szybkość oraz lokalna widoczność w Google.", items: ["Audyt strony", "Redesign i copy", "Optymalizacja", "Lokalne SEO"] },
];

const reasons = [
  ["01", "Projekt bez szablonu", "Każdy ekran powstaje pod markę, ofertę i odbiorców Twojej firmy."],
  ["02", "Sprzedażowy układ", "Strona prowadzi od pierwszego wrażenia do konkretnego działania."],
  ["03", "Dopracowany mobile", "Telefon nie jest dodatkiem — projektujemy go równolegle z desktopem."],
  ["04", "Szybkość i SEO", "Lekki kod, logiczna struktura i lokalne frazy od samego początku."],
];

const steps = [
  ["01", "Rozmowa i kierunek", "Poznajemy firmę, cel strony i klientów, do których ma trafiać."],
  ["02", "Struktura i teksty", "Porządkujemy ofertę i układamy komunikaty nastawione na kontakt."],
  ["03", "Projekt i kod", "Tworzymy wygląd, animacje oraz w pełni responsywne wdrożenie."],
  ["04", "Start strony", "Podpinamy domenę, konfigurujemy SEO i uruchamiamy gotową witrynę."],
];

function Mark() {
  return <span className="mark" aria-hidden="true"><i /><b /><em /></span>;
}

function Brand({ light = false }: { light?: boolean }) {
  return <span className={light ? "brand brand-light" : "brand"}><Mark /><strong>21project</strong></span>;
}

function MiniSite({ compact = false, tone = "warm", name = "Monika Serbista", headline = "Wnętrza, w których chce się żyć." }: { compact?: boolean; tone?: string; name?: string; headline?: string }) {
  return (
    <div className={`mini-site mini-${tone} ${compact ? "mini-compact" : ""}`}>
      <div className="mini-nav">
        <span>{name}</span>
        <div>{compact ? <b>☰</b> : <><i>O nas</i><i>Oferta</i><i>Realizacje</i><i>Kontakt</i></>}</div>
      </div>
      <div className="mini-hero">
        <div className="mini-architecture" aria-hidden="true"><span /><i /><b /></div>
        <div className="mini-copy">
          <small>INDYWIDUALNY PROJEKT</small>
          <strong>{headline}</strong>
          <p>Nowoczesna forma. Przemyślany detal.</p>
          <button type="button">ZOBACZ WIĘCEJ</button>
        </div>
      </div>
      {!compact && <div className="mini-bottom"><span>01 — Projekt</span><span>02 — Realizacja</span><span>03 — Kontakt</span></div>}
    </div>
  );
}

function DeviceStage() {
  const ref = useRef<HTMLDivElement>(null);

  function move(event: MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = node.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    node.style.setProperty("--rx", `${-y * 4.5}deg`);
    node.style.setProperty("--ry", `${x * 5.5}deg`);
    node.style.setProperty("--px", `${x * 12}px`);
    node.style.setProperty("--py", `${y * 10}px`);
  }

  function reset() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
    node.style.setProperty("--px", "0px");
    node.style.setProperty("--py", "0px");
  }

  return (
    <div className="device-stage" ref={ref} onMouseMove={move} onMouseLeave={reset}>
      <div className="stage-grid" />
      <div className="laptop">
        <div className="laptop-lid"><div className="laptop-camera" /><div className="laptop-screen"><MiniSite /></div></div>
        <div className="laptop-base"><span /></div>
      </div>
      <div className="phone">
        <div className="phone-speaker" /><div className="phone-screen"><MiniSite compact /></div><div className="phone-home" />
      </div>
      <div className="stage-tag tag-one">DESKTOP <span>1440</span></div>
      <div className="stage-tag tag-two">MOBILE <span>390</span></div>
      <div className="cursor-note"><i>↗</i><span>Najedź na urządzenia</span></div>
    </div>
  );
}

function ProjectPreview({ project }: { project: (typeof projects)[number] }) {
  return (
    <a className="project-card" href={project.href} target="_blank" rel="noreferrer">
      <div className="project-device">
        <div className="project-browser">
          <div className="browser-bar"><i /><i /><i /><span>21project / {project.name.toLowerCase().replaceAll(" ", "-")}</span></div>
          <MiniSite tone={project.tone} name={project.name} headline={project.headline} />
        </div>
        <div className="project-phone"><MiniSite compact tone={project.tone} name={project.name} headline={project.headline} /></div>
      </div>
      <div className="project-info"><div><small>{project.label}</small><h3>{project.name}</h3></div><span>Otwórz projekt ↗</span></div>
    </a>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeOffer, setActiveOffer] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible"));
    }, { threshold: 0.13 });
    document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `Zapytanie ze strony 21project — ${data.get("service")}`;
    const body = [`Imię i firma: ${data.get("name")}`, `E-mail: ${data.get("email")}`, `Telefon: ${data.get("phone") || "nie podano"}`, `Usługa: ${data.get("service")}`, "", `${data.get("message")}`].join("\n");
    window.location.href = `mailto:jakubskrzypiec.dev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const schema = {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: "21project", url: "https://21project.pl/", email: "jakubskrzypiec.dev@gmail.com", telephone: "+48601863788",
    description: "Projektowanie i tworzenie nowoczesnych stron internetowych dla firm na Śląsku.",
    areaServed: ["Ruda Śląska", "Katowice", "Chorzów", "Zabrze", "Bytom", "Gliwice", "Mikołów", "Świętochłowice", "Tychy", "Żory"],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <header className="site-header">
        <a href="#start" aria-label="21project — strona główna"><Brand /></a>
        <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="Główna nawigacja">
          <a href="#realizacje" onClick={closeMenu}>Realizacje</a><a href="#oferta" onClick={closeMenu}>Oferta</a><a href="#dlaczego" onClick={closeMenu}>Dlaczego my</a><a href="#proces" onClick={closeMenu}>Proces</a>
          <a className="nav-cta" href="#kontakt" onClick={closeMenu}>Bezpłatna wycena <span>↗</span></a>
        </nav>
        <button className={menuOpen ? "menu-button open" : "menu-button"} type="button" aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><i /><i /></button>
      </header>

      <section className="hero" id="start">
        <div className="hero-copy">
          <p className="kicker"><span>21</span> STRONY INTERNETOWE DLA FIRM</p>
          <h1>Projektujemy strony,<br />które <em>sprzedają.</em></h1>
          <p>Indywidualny design, dopracowana wersja mobilna i układ prowadzący klienta prosto do kontaktu.</p>
          <div className="hero-actions"><a className="button primary" href="#kontakt">Bezpłatna wycena <span>↗</span></a><a className="button ghost" href="#realizacje">Zobacz realizacje <span>↓</span></a></div>
          <div className="hero-proof"><div><strong>100%</strong><span>indywidualnego projektu</span></div><div><strong>01</strong><span>kontakt od startu do końca</span></div><div><strong>SEO</strong><span>w standardzie realizacji</span></div></div>
        </div>
        <DeviceStage />
        <div className="hero-index">21<span>/</span>PROJECT</div>
      </section>

      <div className="marquee" aria-hidden="true"><div><span>DESIGN</span><i>✦</i><span>WDROŻENIE</span><i>✦</i><span>MOBILE-FIRST</span><i>✦</i><span>SEO</span><i>✦</i><span>DESIGN</span><i>✦</i><span>WDROŻENIE</span><i>✦</i><span>MOBILE-FIRST</span><i>✦</i><span>SEO</span><i>✦</i></div></div>

      <section className="section projects" id="realizacje">
        <div className="section-head reveal"><div><p className="section-number">01 / REALIZACJE</p><h2>Nie opowiadamy.<br /><em>Pokazujemy.</em></h2></div><p>Każdy projekt ma własny charakter, strukturę i sposób prezentacji oferty. Poniżej strony zaprojektowane dla prawdziwych firm.</p></div>
        <div className="projects-grid reveal">{projects.map((project) => <ProjectPreview project={project} key={project.name} />)}</div>
      </section>

      <section className="section offer" id="oferta">
        <div className="section-head offer-head reveal"><div><p className="section-number">02 / OFERTA</p><h2>Wszystko, czego potrzebuje<br /><em>dobra strona.</em></h2></div><p>Projekt, treści, kod, wersja mobilna, SEO i uruchomienie — spójnie, bez przekazywania projektu pomiędzy kilkoma osobami.</p></div>
        <div className="offer-layout reveal">
          <div className="offer-tabs" role="tablist" aria-label="Zakres usług">
            {offers.map((offer, index) => <button key={offer.title} className={activeOffer === index ? "active" : ""} role="tab" aria-selected={activeOffer === index} onClick={() => setActiveOffer(index)}><span>{offer.number}</span><strong>{offer.title}</strong><i>↗</i></button>)}
          </div>
          <article className="offer-detail" role="tabpanel">
            <div className="offer-big-number">{offers[activeOffer].number}</div><p>WYBRANA USŁUGA</p><h3>{offers[activeOffer].title}</h3><p className="offer-text">{offers[activeOffer].text}</p>
            <ul>{offers[activeOffer].items.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul><a href="#kontakt">Zapytaj o wycenę <span>↗</span></a>
          </article>
        </div>
      </section>

      <section className="section reasons" id="dlaczego">
        <div className="section-head reveal"><div><p className="section-number">03 / STANDARD</p><h2>Ładnie to za mało.<br /><em>Strona ma pracować.</em></h2></div><p>Każda decyzja projektowa ma cel: zbudować zaufanie, ułatwić zrozumienie oferty i skrócić drogę do zapytania.</p></div>
        <div className="reason-grid reveal">{reasons.map(([number, title, text]) => <article key={number}><span>{number}</span><div className="reason-icon"><i /><b /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="section process" id="proces">
        <div className="process-title reveal"><p className="section-number">04 / PROCES WSPÓŁPRACY</p><h2>Od pomysłu<br />do <em>publikacji.</em></h2><p>Przejrzysty proces. Jasne etapy. Stały kontakt.</p><a className="button ghost-light" href="#kontakt">Zacznijmy rozmowę <span>↗</span></a></div>
        <div className="step-list reveal">{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><i>↘</i></article>)}</div>
      </section>

      <section className="local reveal">
        <p className="section-number">STRONY INTERNETOWE / ŚLĄSK</p><h2>Ruda Śląska. Katowice.<br />Chorzów. <em>I cała Polska.</em></h2><p>Tworzymy strony dla firm z Rudy Śląskiej, Katowic, Chorzowa, Zabrza, Bytomia, Gliwic, Mikołowa, Świętochłowic, Tychów, Żor i okolic. Współpracujemy również w pełni zdalnie.</p>
      </section>

      <section className="section contact" id="kontakt">
        <div className="contact-copy reveal"><p className="section-number">05 / KONTAKT</p><h2>Opowiedz nam<br />o swoim <em>projekcie.</em></h2><p>Otrzymasz konkretną propozycję zakresu, terminu oraz wycenę — bez zobowiązań.</p><div className="contact-links"><a href="tel:+48601863788"><small>TELEFON</small><strong>601 863 788</strong></a><a href="mailto:jakubskrzypiec.dev@gmail.com"><small>E-MAIL</small><strong>jakubskrzypiec.dev@gmail.com</strong></a></div></div>
        <form className="contact-form reveal" onSubmit={handleSubmit}>
          <div className="form-row"><label><span>Imię i firma *</span><input name="name" required autoComplete="name" placeholder="Jak mamy się zwracać?" /></label><label><span>E-mail *</span><input name="email" type="email" required autoComplete="email" placeholder="twoj@email.pl" /></label></div>
          <div className="form-row"><label><span>Telefon</span><input name="phone" type="tel" autoComplete="tel" placeholder="+48 000 000 000" /></label><label><span>Interesuje mnie</span><select name="service"><option>Nowa strona firmowa</option><option>Landing page</option><option>Rework strony</option><option>SEO</option></select></label></div>
          <label><span>Opowiedz krótko o projekcie *</span><textarea name="message" required rows={5} placeholder="Czym zajmuje się firma i czego potrzebujesz?" /></label><button className="button primary" type="submit">Wyślij zapytanie <span>↗</span></button><small>Kliknięcie otworzy gotową wiadomość w aplikacji pocztowej.</small>
        </form>
      </section>

      <footer><div><Brand light /><a href="#start">Wróć do góry ↑</a></div><div><span>© {new Date().getFullYear()} 21project</span><span>Ruda Śląska • Katowice • Chorzów • Śląsk</span><a href="mailto:jakubskrzypiec.dev@gmail.com">jakubskrzypiec.dev@gmail.com</a></div></footer>
    </main>
  );
}
