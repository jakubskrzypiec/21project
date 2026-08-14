(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeMenu = () => {
    body.classList.remove("menu-open");
    mobileMenu?.classList.remove("is-open");
    mobileMenu?.setAttribute("aria-hidden", "true");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Otwórz menu");
  };

  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    body.classList.toggle("menu-open", open);
    mobileMenu?.classList.toggle("is-open", open);
    mobileMenu?.setAttribute("aria-hidden", String(!open));
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
  });

  mobileMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) closeMenu();
  });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const rotatingWord = document.querySelector("[data-rotating-word]");
  const words = ["sprzedają.", "przekonują.", "pracują."];
  let wordIndex = 0;
  if (rotatingWord && !reducedMotion) {
    window.setInterval(() => {
      rotatingWord.classList.add("word-out");
      window.setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        rotatingWord.textContent = words[wordIndex];
      }, 210);
      window.setTimeout(() => rotatingWord.classList.remove("word-out"), 430);
    }, 3300);
  }

  const reveals = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(element => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });
    reveals.forEach(element => revealObserver.observe(element));
  }

  document.querySelectorAll(".seo-faq details").forEach(details => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      document.querySelectorAll(".seo-faq details[open]").forEach(other => {
        if (other !== details) other.removeAttribute("open");
      });
    });
  });

  const consentKey = "21project-consent-v1";
  const cookieBanner = document.querySelector("[data-cookie-banner]");
  const cookieDialog = document.querySelector("[data-cookie-dialog]");
  const privacyDialog = document.querySelector("[data-privacy-dialog]");
  const analyticsToggle = document.querySelector("[data-analytics-consent]");

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });

  let analyticsLoaded = false;
  const loadAnalytics = () => {
    const measurementId = document.documentElement.dataset.gaId?.trim();
    if (!measurementId || analyticsLoaded) return;
    analyticsLoaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(script);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });
  };

  const applyConsent = consent => {
    const analyticsGranted = Boolean(consent?.analytics);
    window.gtag("consent", "update", {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    if (analyticsGranted) loadAnalytics();
  };

  const readConsent = () => {
    try { return JSON.parse(localStorage.getItem(consentKey)); }
    catch { return null; }
  };

  const saveConsent = analytics => {
    const consent = { necessary: true, analytics: Boolean(analytics), savedAt: new Date().toISOString() };
    localStorage.setItem(consentKey, JSON.stringify(consent));
    applyConsent(consent);
    cookieBanner?.classList.remove("is-visible");
    cookieDialog?.close();
  };

  const storedConsent = readConsent();
  if (storedConsent) {
    applyConsent(storedConsent);
    if (analyticsToggle) analyticsToggle.checked = Boolean(storedConsent.analytics);
  } else {
    window.setTimeout(() => cookieBanner?.classList.add("is-visible"), 650);
  }

  document.querySelector("[data-cookie-accept]")?.addEventListener("click", () => saveConsent(true));
  document.querySelector("[data-cookie-reject]")?.addEventListener("click", () => saveConsent(false));
  document.querySelector("[data-cookie-save]")?.addEventListener("click", () => saveConsent(analyticsToggle?.checked));

  document.querySelectorAll("[data-open-cookies]").forEach(button => button.addEventListener("click", () => {
    const consent = readConsent();
    if (analyticsToggle) analyticsToggle.checked = Boolean(consent?.analytics);
    cookieDialog?.showModal();
  }));

  document.querySelectorAll("[data-open-privacy]").forEach(button => button.addEventListener("click", () => privacyDialog?.showModal()));
  document.querySelectorAll("[data-dialog-close]").forEach(button => button.addEventListener("click", () => button.closest("dialog")?.close()));
  [cookieDialog, privacyDialog].forEach(dialog => dialog?.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  }));

  document.querySelectorAll("[data-year]").forEach(element => { element.textContent = String(new Date().getFullYear()); });

  const params = new URLSearchParams(window.location.search);
  if (params.get("sent") === "1") {
    const toast = document.querySelector("[data-toast]");
    toast?.classList.add("is-visible");
    window.setTimeout(() => toast?.classList.remove("is-visible"), 5000);
    params.delete("sent");
    const cleanQuery = params.toString();
    history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
  }
})();
