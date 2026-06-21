document.addEventListener("DOMContentLoaded", () => {
  const loader = document.querySelector(".intro-loader");

  if (loader) {
    document.body.classList.add("is-loading");
    setTimeout(() => {
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
  const deskCopy = document.querySelector(".desk-side-copy");
  const screenHotspot = document.querySelector("#screenHotspot");

  const smooth = {
    progress: 0,
    target: 0
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const calculateTarget = () => {
    if (!deskSection) return;
    const rect = deskSection.getBoundingClientRect();
    const total = deskSection.offsetHeight - window.innerHeight;
    smooth.target = clamp(-rect.top / total, 0, 1);
  };

  const renderDeskPortal = () => {
    if (!deskSection || !deskFrame || !deskScreen || !deskCopy) return;

    smooth.progress += (smooth.target - smooth.progress) * 0.065;
    const p = smooth.progress;

    if (window.innerWidth <= 620) {
      deskFrame.style.transform = "scale(1)";
      deskCopy.style.opacity = "1";
      deskCopy.style.transform = "translateY(0)";
      deskScreen.classList.toggle("is-visible", p > 0.48);
      if (screenHotspot) screenHotspot.classList.toggle("is-visible", p > 0.34);
      requestAnimationFrame(renderDeskPortal);
      return;
    }

    const scale = 0.78 + p * 0.78;
    const xShift = 12 - p * 12;
    const rotate = p * -1.25;
    const copyOpacity = clamp(1 - p * 1.85, 0, 1);

    deskFrame.style.transform = `translateX(${xShift}vw) scale(${scale}) rotate(${rotate}deg)`;
    deskCopy.style.opacity = copyOpacity;
    deskCopy.style.transform = `translateY(${-p * 44}px)`;

    if (screenHotspot) {
      screenHotspot.classList.toggle("is-visible", p > 0.30 && p < 0.72);
    }

    deskScreen.classList.toggle("is-visible", p > 0.58);

    requestAnimationFrame(renderDeskPortal);
  };

  window.addEventListener("scroll", calculateTarget, { passive: true });
  window.addEventListener("resize", calculateTarget);
  calculateTarget();
  renderDeskPortal();
});
