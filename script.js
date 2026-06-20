document.addEventListener("DOMContentLoaded", () => {
  const loader = document.querySelector(".intro-loader");

  if (loader) {
    document.body.classList.add("is-loading");

    setTimeout(() => {
      loader.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
    }, 2450);
  }

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

  const header = document.querySelector(".site-header");
  let lastY = window.scrollY;

  window.addEventListener("scroll", () => {
    if (!header) return;

    const currentY = window.scrollY;
    if (currentY > lastY && currentY > 130) {
      header.style.transform = "translateX(-50%) translateY(-135%)";
      header.style.opacity = "0";
    } else {
      header.style.transform = "translateX(-50%) translateY(0)";
      header.style.opacity = "1";
    }

    lastY = Math.max(currentY, 0);
  }, { passive: true });

  const portalSection = document.querySelector(".portfolio-portal");
  const portalCard = document.querySelector("#portalCard");
  const portalCases = document.querySelector("#portalCases");
  const portalIntro = document.querySelector(".portal-intro");

  const updatePortal = () => {
    if (!portalSection || !portalCard || !portalCases || !portalIntro) return;

    const rect = portalSection.getBoundingClientRect();
    const total = portalSection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);

    const scaleDesktop = 0.7 + progress * 3.15;
    const shiftDesktop = 16 - progress * 16;
    const scaleMobile = 0.76 + progress * 2.65;
    const shiftMobile = 10 - progress * 10;

    if (window.innerWidth > 1060) {
      portalCard.style.transform = `translateX(${shiftDesktop}vw) scale(${scaleDesktop})`;
    } else {
      portalCard.style.transform = `translateY(${shiftMobile}vh) scale(${scaleMobile})`;
    }

    portalIntro.style.opacity = Math.max(0, 1 - progress * 2.3);
    portalIntro.style.transform = `translateY(${-progress * 38}px)`;

    if (progress > 0.63) {
      portalCases.classList.add("is-visible");
    } else {
      portalCases.classList.remove("is-visible");
    }
  };

  window.addEventListener("scroll", updatePortal, { passive: true });
  window.addEventListener("resize", updatePortal);
  updatePortal();
});
