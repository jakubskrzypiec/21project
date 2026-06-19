document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loading");

  const loader = document.querySelector(".loader");

  window.setTimeout(() => {
    if (loader) loader.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
  }, 2600);

  const revealElements = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealElements.forEach((element) => observer.observe(element));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const cards = [...document.querySelectorAll("[data-card]")];
  const scrollLab = document.querySelector(".scroll-lab");

  const updateCards = () => {
    if (!scrollLab || cards.length === 0 || window.innerWidth <= 1080) return;

    const rect = scrollLab.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const current = Math.min(Math.max(-rect.top, 0), total);
    const progress = total > 0 ? current / total : 0;

    const index = Math.min(cards.length - 1, Math.floor(progress * cards.length));

    cards.forEach((card, i) => {
      card.classList.toggle("active", i === index);
    });
  };

  window.addEventListener("scroll", updateCards, { passive: true });
  window.addEventListener("resize", updateCards);
  updateCards();

  const header = document.querySelector(".site-header");
  let lastY = window.scrollY;

  window.addEventListener("scroll", () => {
    if (!header) return;

    const now = window.scrollY;
    if (now > lastY && now > 120) {
      header.style.transform = "translateX(-50%) translateY(-130%)";
    } else {
      header.style.transform = "translateX(-50%) translateY(0)";
    }
    lastY = Math.max(now, 0);
  }, { passive: true });
});
