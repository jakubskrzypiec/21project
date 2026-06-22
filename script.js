document.addEventListener("DOMContentLoaded", () => {
  const loader = document.querySelector(".intro-loader");

  if (loader) {
    document.body.classList.add("is-loading");
    window.setTimeout(() => {
      loader.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
    }, 3400);
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
  const screenHotspot = document.querySelector("#screenHotspot");

  let targetProgress = 0;
  let currentProgress = 0;
  let ticking = false;
  let glowReady = true;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getProgress = () => {
    if (!deskSection) return 0;

    const rect = deskSection.getBoundingClientRect();
    const total = Math.max(deskSection.offsetHeight - window.innerHeight, 1);

    return clamp(-rect.top / total, 0, 1);
  };

  const renderDesk = () => {
    if (!deskSection || !deskFrame || !deskScreen) return;

    currentProgress += (targetProgress - currentProgress) * 0.14;

    const p = currentProgress;
    const isMobile = window.innerWidth <= 620;

    if (isMobile) {
      const mobileScale = 1 + p * 0.12;
      deskFrame.style.transform = `scale(${mobileScale})`;
      deskScreen.classList.toggle("is-visible", p > 0.50);
      if (screenHotspot) screenHotspot.classList.toggle("is-visible", p > 0.30 && p < 0.78);
    } else {
      const scale = 0.68 + p * 1.42;
      const xShift = 24 - p * 24;
      const yShift = 8 - p * 8;
      const rotate = -5 + p * 5;
      const blur = p > 0.85 ? (p - 0.85) * 10 : 0;

      deskFrame.style.transform = `translate3d(${xShift}vw, ${yShift}vh, 0) scale(${scale}) rotate(${rotate}deg)`;
      deskFrame.style.filter = `blur(${blur}px)`;

      const showHotspot = p > 0.26 && p < 0.72;
      if (screenHotspot) screenHotspot.classList.toggle("is-visible", showHotspot);

      const showScreen = p > 0.58;
      deskScreen.classList.toggle("is-visible", showScreen);

      if (p > 0.34 && glowReady) {
        deskFrame.classList.add("is-glowing");
        glowReady = false;

        window.setTimeout(() => {
          deskFrame.classList.remove("is-glowing");
        }, 1250);
      }

      if (p < 0.18) {
        glowReady = true;
      }
    }

    if (Math.abs(targetProgress - currentProgress) > 0.001) {
      window.requestAnimationFrame(renderDesk);
    } else {
      ticking = false;
    }
  };

  const updateDesk = () => {
    targetProgress = getProgress();

    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(renderDesk);
    }
  };

  updateDesk();
  window.addEventListener("scroll", updateDesk, { passive: true });
  window.addEventListener("resize", updateDesk);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(updateDesk, 250);
  });
});
