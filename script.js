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

  const deskSection = document.querySelector(".desk-portal");
  const deskFrame = document.querySelector("#deskFrame");
  const deskScreen = document.querySelector("#deskScreen");
  const deskCopy = document.querySelector(".desk-copy");

  const updateDeskPortal = () => {
    if (!deskSection || !deskFrame || !deskScreen || !deskCopy) return;
    if (window.innerWidth <= 720) {
      deskScreen.classList.add("is-visible");
      deskCopy.style.opacity = "1";
      deskCopy.style.transform = "translateY(0)";
      return;
    }

    const rect = deskSection.getBoundingClientRect();
    const total = deskSection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);

    const scale = 0.68 + progress * 0.54;
    const shift = 10 - progress * 10;
    const copyOpacity = Math.max(0, 1 - progress * 1.65);

    deskFrame.style.transform = `translateY(${shift}vh) scale(${scale})`;
    deskCopy.style.opacity = copyOpacity;
    deskCopy.style.transform = `translateY(${-progress * 36}px)`;

    if (progress > 0.45) {
      deskScreen.classList.add("is-visible");
    } else {
      deskScreen.classList.remove("is-visible");
    }
  };

  window.addEventListener("scroll", updateDeskPortal, { passive: true });
  window.addEventListener("resize", updateDeskPortal);
  updateDeskPortal();
});
