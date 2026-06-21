document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loading");

  const loader = document.querySelector(".intro-loader");

  window.setTimeout(() => {
    if (loader) loader.classList.add("is-hide");
    document.body.classList.remove("is-loading");
  }, 1850);

  window.setTimeout(() => {
    if (loader) loader.remove();
  }, 2700);

  const reveals = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  reveals.forEach((item) => revealObserver.observe(item));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const deskSection = document.querySelector(".desk-zoom");
  const deskCard = document.querySelector(".desk-card");

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const updateDeskZoom = () => {
    if (!deskSection || !deskCard) return;

    const rect = deskSection.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const raw = scrollable > 0 ? -rect.top / scrollable : 0;
    const progress = clamp(raw, 0, 1);

    deskCard.style.setProperty("--deskProgress", progress.toFixed(3));
  };

  updateDeskZoom();

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateDeskZoom();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updateDeskZoom);
});
