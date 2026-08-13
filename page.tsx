"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";

type CaseStudy = {
  index: string; name: string; sector: string; desktop: string; mobile: string; href?: string;
  summary: string; challenge: string; solution: string; scope: string[];
};

const caseStudies: CaseStudy[] = [
  { index: "01", name: "DRG Auto", sector: "Motoryzacja / sprzedaż samochodów / detailing", desktop: "/cases/drg-desktop.webp", mobile: "/cases/drg-mobile.webp", href: "https://jakubskrzypiec.github.io/drgauto/", summary: "Mocna, wizualna strona łącząca sprzedaż wybranych aut z ofertą detailingu.", challenge: "Dwie różne usługi trzeba było zamknąć w jednym prostym doświadczeniu i szybko doprowadzić użytkownika do telefonu lub oferty.", solution: "Pełnoekranowy produkt, oszczędna nawigacja i wyraźne wezwania do działania — osobno dopracowane dla desktopu i telefonu.", scope: ["UX/UI", "Projekt", "Wdrożenie", "Mobile"] },
  { index: "02", name: "Maciejewska Design", sector: "Projektowanie wnętrz / marka premium", desktop: "/cases/maciejewska-desktop.webp", mobile: "/cases/maciejewska-mobile.webp", href: "https://jakubskrzypiec.github.io/maciejewskadesign/", summary: "Portfolio, w którym realizacje grają pierwszoplanową rolę, a interfejs pozostaje niemal niewidoczny.", challenge: "Pokazać jakość wnętrz bez przeładowania strony i zachować premium charakter na małym ekranie.", solution: "Duże kadry, precyzyjna typografia i spokojna hierarchia prowadząca od realizacji prosto do zapytania o projekt.", scope: ["Kierunek wizualny", "UX/UI", "Wdrożenie", "RWD"] },
  { index: "03", name: "Werka Bramy", sector: "Bramy i ogrodzenia / usługi lokalne", desktop: "/cases/werka-desktop.webp", mobile: "/cases/werka-mobile.webp", href: "https://jakubskrzypiec.github.io/werkabramy/", summary: "Sprzedażowy landing page dla lokalnej marki z ofertą na wymiar i jasnym obszarem działania.", challenge: "W kilka sekund wyjaśnić zakres usług, lokalizację i przewagę oferty, a potem skierować klienta do bezpłatnej wyceny.", solution: "Jednoznaczny komunikat, lokalne frazy, czytelne CTA i układ zaprojektowany przede wszystkim pod ruch z telefonu.", scope: ["Landing page", "Copy", "Local SEO", "Wdrożenie"] },
  { index: "04", name: "Pani Projekt", sector: "Projektowanie wnętrz / studio autorskie", desktop: "/cases/pani-projekt-desktop.webp", mobile: "/cases/pani-projekt-mobile.webp", summary: "Spokojny, edytorialowy serwis dla studia projektującego prywatne wnętrza.", challenge: "Zbudować zaufanie do marki i pokazać jej styl bez agresywnej sprzedaży ani zbędnych elementów.", solution: "Wyważona typografia, miękkie tempo sekcji i komunikacja, która sprzedaje kompetencje przez jakość realizacji.", scope: ["Strategia", "Projekt", "Mobile", "Front-end"] },
];

const services = [
  ["01", "Landing page", "Jedna dopracowana strona z jednym celem: zamienić ruch z reklamy lub Google w konkretne zapytania."],
  ["02", "Strona firmowa", "Pełna witryna, która porządkuje ofertę, buduje wiarygodność i wspiera sprzedaż przez całą dobę."],
  ["03", "Rework strony", "Nowy kierunek, lepsza struktura i szybsze działanie bez utraty tego, co w obecnej stronie ma wartość."],
  ["04", "SEO lokalne", "Techniczna optymalizacja i treści pod Rudę Śląską, Katowice, Chorzów oraz miasta w całym regionie."],
];

const process = [
  ["01", "Kierunek", "Krótka rozmowa o firmie, ofercie i kliencie, którego strona ma przekonać."],
  ["02", "Struktura i treści", "Układamy argumenty oraz komunikaty w kolejności, która prowadzi do decyzji."],
  ["03", "Projekt i kod", "Projektujemy desktop i mobile, a następnie budujemy szybkie, responsywne wdrożenie."],
  ["04", "Publikacja", "Podpinamy domenę, konfigurujemy analitykę i SEO, testujemy całość i uruchamiamy stronę."],
];

function Logo({ inverse = false }: { inverse?: boolean }) {
  return <span className={`logo ${inverse ? "inverse" : ""}`}><b>21</b><span>project</span></span>;
}

function DeviceShowcase({ project }: { project: CaseStudy }) {
  const stage = useRef<HTMLDivElement>(null);
  function move(event: MouseEvent<HTMLDivElement>) {
    const node = stage.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--desk-x", `${x * 8}px`); node.style.setProperty("--desk-y", `${y * 6}px`);
    node.style.setProperty("--phone-x", `${x * -18}px`); node.style.setProperty("--phone-y", `${y * -12}px`);
    node.style.setProperty("--tilt", `${x * 1.3}deg`);
  }
  function reset() {
    const node = stage.current; if (!node) return;
    ["--desk-x", "--desk-y", "--phone-x", "--phone-y", "--tilt"].forEach((property) => node.style.removeProperty(property));
  }
  return (
    <div className="device-showcase" ref={stage} onMouseMove={move} onMouseLeave={reset}>
      <div className="screen-label label-desktop"><span />DESKTOP</div>
      <div className="notebook" aria-label={`Widok desktop strony ${project.name}`}>
        <div className="notebook-lid"><span className="camera" /><div className="notebook-screen"><Image src={project.desktop} alt={`Strona ${project.name} — widok desktop`} fill sizes="(max-width: 760px) 88vw, 68vw" /></div></div>
        <div className="notebook-base"><i /></div>
      </div>
      <div className="screen-label label-mobile"><span />MOBILE</div>
      <div className="smartphone" aria-label={`Widok mobilny strony ${project.name}`}>
        <div className="smartphone-screen" style={{ position: "relative" }}><Image src={project.mobile} alt={`Strona ${project.name} — widok mobilny`} fill sizes="(max-width: 760px) 24vw, 16vw" /></div>
        <span className="dynamic-island" /><span className="side-key key-one" /><span className="side-key key-two" />
      </div>
      <div className="stage-shadow" />
    </div>
  );
}

function CaseStudyCard({ project }: { project: CaseStudy }) {
  return (
    <article className="case-study reveal">
      <div className="case-topline"><span>{project.index} / 04</span><span>{project.sector}</span></div>
      <DeviceShowcase project={project} />
      <div className="case-copy">
        <div className="case-name"><p>REALIZACJA</p><h3>{project.name}</h3><p>{project.summary}</p></div>
        <div className="case-note"><small>WYZWANIE</small><p>{project.challenge}</p></div>
        <div className="case-note"><small>ROZWIĄZANIE</small><p>{project.solution}</p></div>
      </div>
      <div className="case-footer">
        <div>{project.scope.map((item) => <span key={item}>{item}</span>)}</div>
        {project.href ? <a href={project.href} target="_blank" rel="noreferrer">Zobacz stronę <i>↗</i></a> : <span className="case-status">PROJEKT I WDROŻENIE</span>}
      </div>
    </article>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")), { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  function closeMenu() { setMenuOpen(false); }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const subject = `Zapytanie 21project — ${data.get("service")}`;
    const body = [`Imię / firma: ${data.get("name")}`, `E-mail: ${data.get("email")}`, `Telefon: ${data.get("phone") || "nie podano"}`, `Usługa: ${data.get("service")}`, "", `${data.get("message")}`].join("\n");
    window.location.href = `mailto:jakubskrzypiec.dev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  const schema = { "@context": "https://schema.org", "@type": "ProfessionalService", name: "21project", url: "https://21project.pl/", email: "jakubskrzypiec.dev@gmail.com", telephone: "+48601863788", description: "Projektowanie i tworzenie nowoczesnych stron internetowych dla firm na Śląsku.", areaServed: ["Ruda Śląska", "Katowice", "Chorzów", "Zabrze", "Bytom", "Gliwice", "Mikołów", "Świętochłowice", "Tychy"] };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="header">
        <a href="#start" aria-label="21project — początek"><Logo /></a>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Główna nawigacja">
          <a href="#realizacje" onClick={closeMenu}>Realizacje</a><a href="#oferta" onClick={closeMenu}>Oferta</a><a href="#dlaczego" onClick={closeMenu}>Dlaczego my</a><a href="#proces" onClick={closeMenu}>Proces</a><a className="header-cta" href="#kontakt" onClick={closeMenu}>Bezpłatna wycena <span>↗</span></a>
        </nav>
        <button className={`menu ${menuOpen ? "active" : ""}`} type="button" aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><i /><i /></button>
      </header>

      <section className="hero" id="start">
        <div className="hero-eyebrow"><span>STRONY INTERNETOWE</span><span>RUDA ŚLĄSKA / KATOWICE / ŚLĄSK</span></div>
        <div className="hero-main">
          <h1>Strony, które<br />robią <span>robotę.</span></h1>
          <div className="hero-side"><p>Projektujemy i wdrażamy strony, które wyglądają profesjonalnie, jasno tłumaczą ofertę i prowadzą klienta do kontaktu.</p><div><a className="button black" href="#kontakt">Wyceń moją stronę <span>↗</span></a><a className="text-link" href="#realizacje">Zobacz realizacje <span>↓</span></a></div></div>
        </div>
        <div className="hero-bottom">
          <div className="proof"><span>01</span><p><b>Indywidualny projekt</b><small>bez gotowego szablonu</small></p></div>
          <div className="proof"><span>02</span><p><b>Desktop + mobile</b><small>projektowane równolegle</small></p></div>
          <div className="proof"><span>03</span><p><b>Sprzedaż + SEO</b><small>gotowe od pierwszego dnia</small></p></div>
          <a href="#realizacje" aria-label="Przewiń do realizacji">↓</a>
        </div>
        <div className="hero-word" aria-hidden="true">21</div>
      </section>

      <section className="cases" id="realizacje">
        <div className="intro reveal"><p className="section-tag">01 / WYBRANE REALIZACJE</p><h2>Desktop obok mobile.<br /><span>Tak samo dopracowane.</span></h2><p>Nie pokazujemy przypadkowych miniaturek. Poniżej prawdziwe strony i krótko: problem, kierunek oraz zakres pracy.</p></div>
        <div className="case-list">{caseStudies.map((project) => <CaseStudyCard project={project} key={project.name} />)}</div>
      </section>

      <section className="offer section" id="oferta">
        <div className="section-heading reveal"><p className="section-tag">02 / OFERTA</p><h2>Jedna strona.<br /><span>Jeden konkretny cel.</span></h2></div>
        <div className="service-list reveal">{services.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p><a href="#kontakt" aria-label={`Zapytaj o ${title}`}>↗</a></article>)}</div>
      </section>

      <section className="why section" id="dlaczego">
        <div className="why-copy reveal"><p className="section-tag">03 / DLACZEGO 21PROJECT</p><h2>Ładna strona to dopiero <span>początek.</span></h2><p>Dobra strona ma w kilka sekund pokazać, że trafiłeś do właściwej firmy. Dlatego łączymy design z konkretnym komunikatem, szybkością i ścieżką prowadzącą do zapytania.</p><a className="button white" href="#kontakt">Porozmawiajmy <span>↗</span></a></div>
        <div className="why-grid reveal"><article><strong>01</strong><h3>Najpierw oferta</h3><p>Projektujemy wokół tego, co klient ma zrozumieć i zrobić — nie wokół przypadkowego efektu.</p></article><article><strong>02</strong><h3>Mobile bez kompromisów</h3><p>Każdy widok telefonu powstaje świadomie. Nie jest tylko zmniejszoną wersją desktopu.</p></article><article><strong>03</strong><h3>Bez pośredników</h3><p>Od pierwszej rozmowy do publikacji masz jeden kontakt i spójną odpowiedzialność za efekt.</p></article><article><strong>04</strong><h3>Gotowa do wzrostu</h3><p>Techniczne SEO, wydajność, analityka i struktura przygotowana do dalszej rozbudowy.</p></article></div>
      </section>

      <section className="process section" id="proces">
        <div className="section-heading reveal"><p className="section-tag">04 / PROCES WSPÓŁPRACY</p><h2>Od rozmowy do<br /><span>gotowej strony.</span></h2></div>
        <div className="process-list reveal">{process.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p><i>↘</i></article>)}</div>
      </section>

      <section className="local-seo reveal"><p className="section-tag">STRONY INTERNETOWE / ŚLĄSK</p><h2>Lokalnie na Śląsku.<br /><span>Zdalnie w całej Polsce.</span></h2><p>Tworzymy strony internetowe dla firm z Rudy Śląskiej, Katowic, Chorzowa, Zabrza, Bytomia, Gliwic, Świętochłowic, Mikołowa, Tychów i okolic. Jeśli jesteś dalej — cały proces możemy przeprowadzić online.</p></section>

      <section className="contact section" id="kontakt">
        <div className="contact-copy reveal"><p className="section-tag">05 / BEZPŁATNA WYCENA</p><h2>Masz firmę.<br /><span>Zróbmy jej dobrą stronę.</span></h2><p>Napisz, czym się zajmujesz i czego potrzebujesz. Wrócimy z konkretnym pomysłem na zakres oraz następny krok.</p><div className="direct"><a href="tel:+48601863788"><small>TELEFON</small><b>601 863 788</b></a><a href="mailto:jakubskrzypiec.dev@gmail.com"><small>E-MAIL</small><b>jakubskrzypiec.dev@gmail.com</b></a></div></div>
        <form className="form reveal" onSubmit={handleSubmit}>
          <div><label>Imię / firma *</label><input name="name" required autoComplete="name" placeholder="Jak mamy się zwracać?" /></div><div><label>E-mail *</label><input name="email" required type="email" autoComplete="email" placeholder="twoj@email.pl" /></div><div><label>Telefon</label><input name="phone" type="tel" autoComplete="tel" placeholder="+48 000 000 000" /></div><div><label>Interesuje mnie</label><select name="service"><option>Nowa strona firmowa</option><option>Landing page</option><option>Rework strony</option><option>SEO lokalne</option></select></div><div className="full"><label>Krótko o projekcie *</label><textarea name="message" required rows={5} placeholder="Czym zajmuje się firma i czego potrzebujesz?" /></div><button className="button black full" type="submit">Wyślij zapytanie <span>↗</span></button><small className="full">Przycisk otworzy gotową wiadomość w Twojej aplikacji pocztowej.</small>
        </form>
      </section>

      <footer><div><Logo inverse /><a href="#start">Do góry ↑</a></div><div><span>© {new Date().getFullYear()} 21project</span><span>Ruda Śląska / Katowice / Chorzów / Śląsk</span><a href="mailto:jakubskrzypiec.dev@gmail.com">jakubskrzypiec.dev@gmail.com</a></div></footer>
    </main>
  );
}
