document.addEventListener("DOMContentLoaded", () => {
  const loader = document.querySelector(".intro-loader");

  // Loader — znika zawsze, nawet gdy coś na stronie wolniej się ładuje.
  if (loader) {
    document.body.classList.add("is-loading");

    window.setTimeout(() => {
      loader.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
    }, 1850);

    window.setTimeout(() => {
      loader.remove();
    }, 2750);
  } else {
    document.body.classList.remove("is-loading");
  }

  // Failsafe — gdyby przeglądarka zablokowała animację, loader i tak znika.
  window.setTimeout(() => {
    const fallbackLoader = document.querySelector(".intro-loader");
    if (fallbackLoader) {
      fallbackLoader.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
      window.setTimeout(() => fallbackLoader.remove(), 600);
    }
  }, 3600);

  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("visible"));
  }

  const header = document.querySelector(".site-header");
  let lastY = window.scrollY;
  let headerTicking = false;

  const updateHeader = () => {
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
    headerTicking = false;
  };

  window.addEventListener("scroll", () => {
    if (!headerTicking) {
      window.requestAnimationFrame(updateHeader);
      headerTicking = true;
    }
  }, { passive: true });
portfolioZoomTicking = false;
      });
      portfolioZoomTicking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updatePortfolioZoom);
  updatePortfolioZoom();
  const cinematicSection = document.querySelector(".cinematic-portfolio");

  const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
  const smoothStep = (value) => value * value * (3 - 2 * value);
  const easeOutQuart = (value) => 1 - Math.pow(1 - value, 4);

  let targetProgress = 0;
  let currentProgress = 0;
  let cinematicTicking = false;

  const calculateCinematicTarget = () => {
    if (!cinematicSection) return 0;

    const rect = cinematicSection.getBoundingClientRect();
    const scrollable = cinematicSection.offsetHeight - window.innerHeight;
    return scrollable > 0 ? clampValue(-rect.top / scrollable, 0, 1) : 0;
  };

  const renderCinematic = () => {
    if (!cinematicSection) return;

    targetProgress = calculateCinematicTarget();
    currentProgress += (targetProgress - currentProgress) * 0.085;

    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
      currentProgress = targetProgress;
    }

    const enter = smoothStep(clampValue(currentProgress / 0.32, 0, 1));
    const main = clampValue((currentProgress - 0.08) / 0.78, 0, 1);
    const eased = easeOutQuart(smoothStep(main));
    const exit = smoothStep(clampValue((currentProgress - 0.72) / 0.28, 0, 1));

    cinematicSection.style.setProperty("--p", currentProgress.toFixed(4));
    cinematicSection.style.setProperty("--enter", enter.toFixed(4));
    cinematicSection.style.setProperty("--e", eased.toFixed(4));
    cinematicSection.style.setProperty("--exit", exit.toFixed(4));

    if (Math.abs(targetProgress - currentProgress) > 0.0006) {
      window.requestAnimationFrame(renderCinematic);
    } else {
      cinematicTicking = false;
    }
  };

  const requestCinematicRender = () => {
    if (!cinematicTicking) {
      cinematicTicking = true;
      window.requestAnimationFrame(renderCinematic);
    }
  };

  window.addEventListener("scroll", requestCinematicRender, { passive: true });
  window.addEventListener("resize", requestCinematicRender);
  requestCinematicRender();

});
