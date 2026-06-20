document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loading");

  const loader = document.querySelector(".intro-loader");
  setTimeout(() => {
    loader?.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
  }, 2450);

  const revealItems = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealItems.forEach((item) => revealObserver.observe(item));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const header = document.querySelector(".site-header");
  let lastY = window.scrollY;

  window.addEventListener("scroll", () => {
    if (!header) return;

    const currentY = window.scrollY;
    if (currentY > lastY && currentY > 120) {
      header.style.transform = "translateX(-50%) translateY(-135%)";
      header.style.opacity = "0";
    } else {
      header.style.transform = "translateX(-50%) translateY(0)";
      header.style.opacity = "1";
    }
    lastY = Math.max(currentY, 0);
  }, { passive: true });

  const portalSection = document.querySelector(".portal-section");
  const portalCard = document.querySelector("#portalCard");
  const cases = document.querySelector("#cases");
  const portalCopy = document.querySelector(".portal-copy");

  const updatePortal = () => {
    if (!portalSection || !portalCard || !cases || !portalCopy) return;

    const rect = portalSection.getBoundingClientRect();
    const total = portalSection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);

    const copyOpacity = Math.max(0, 1 - progress * 2.2);
    portalCopy.style.opacity = copyOpacity;
    portalCopy.style.transform = `translateY(${-progress * 36}px)`;

    if (window.innerWidth > 1060) {
      const scale = 0.72 + progress * 3.25;
      const shift = 16 - progress * 16;
      portalCard.style.transform = `translateX(${shift}vw) scale(${scale})`;
    } else {
      const scale = 0.78 + progress * 2.7;
      const shiftY = 10 - progress * 10;
      portalCard.style.transform = `translateY(${shiftY}vh) scale(${scale})`;
    }

    cases.classList.toggle("is-visible", progress > 0.62);
  };

  window.addEventListener("scroll", updatePortal, { passive: true });
  window.addEventListener("resize", updatePortal);
  updatePortal();
});
