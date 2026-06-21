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
  const portfolioZoom = document.querySelector(".portfolio-zoom");
  const portfolioZoomFrame = document.querySelector("#portfolioZoomFrame");

  const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

  const updatePortfolioZoom = () => {
    if (!portfolioZoom || !portfolioZoomFrame) return;

    const rect = portfolioZoom.getBoundingClientRect();
    const scrollable = portfolioZoom.offsetHeight - window.innerHeight;
    const progress = scrollable > 0 ? clampValue(-rect.top / scrollable, 0, 1) : 0;

    portfolioZoom.style.setProperty("--zoomProgress", progress.toFixed(3));
  };

  let zoomTicking = false;

  window.addEventListener("scroll", () => {
    if (!zoomTicking) {
      window.requestAnimationFrame(() => {
        updatePortfolioZoom();
        zoomTicking = false;
      });
      zoomTicking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updatePortfolioZoom);
  updatePortfolioZoom();

});
