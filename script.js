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
zoomTicking = false;
      });
      zoomTicking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updatePortfolioZoom);
  updatePortfolioZoom();

  const portfolioZoom = document.querySelector(".portfolio-zoom");
  const portfolioZoomFrame = document.querySelector("#portfolioZoomFrame");

  const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
  const smoothStep = (value) => value * value * (3 - 2 * value);
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  const updatePortfolioZoom = () => {
    if (!portfolioZoom || !portfolioZoomFrame) return;

    const rect = portfolioZoom.getBoundingClientRect();
    const scrollable = portfolioZoom.offsetHeight - window.innerHeight;
    const rawProgress = scrollable > 0 ? clampValue(-rect.top / scrollable, 0, 1) : 0;

    const enter = clampValue(rawProgress / 0.38, 0, 1);
    const main = clampValue((rawProgress - 0.12) / 0.72, 0, 1);
    const exit = clampValue((rawProgress - 0.70) / 0.30, 0, 1);

    const eased = easeOutCubic(smoothStep(main));

    portfolioZoom.style.setProperty("--zoomProgress", rawProgress.toFixed(4));
    portfolioZoom.style.setProperty("--zoomEnter", smoothStep(enter).toFixed(4));
    portfolioZoom.style.setProperty("--zoomEase", eased.toFixed(4));
    portfolioZoom.style.setProperty("--zoomExit", smoothStep(exit).toFixed(4));
  };

  let portfolioZoomTicking = false;

  window.addEventListener("scroll", () => {
    if (!portfolioZoomTicking) {
      window.requestAnimationFrame(() => {
        updatePortfolioZoom();
        portfolioZoomTicking = false;
      });
      portfolioZoomTicking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updatePortfolioZoom);
  updatePortfolioZoom();

});
