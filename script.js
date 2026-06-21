(() => {
  const safeRun = (fn) => {
    try {
      fn();
    } catch (error) {
      console.warn("21project safe mode:", error);
      const loader = document.querySelector(".intro-loader");
      if (loader) {
        loader.classList.add("is-hidden");
        setTimeout(() => loader.remove(), 700);
      }
      document.body.classList.remove("is-loading");
    }
  };

  const hideLoader = () => {
    const loader = document.querySelector(".intro-loader");
    document.body.classList.remove("is-loading");

    if (!loader) return;

    loader.classList.add("is-hidden");
    setTimeout(() => {
      if (loader && loader.parentNode) loader.remove();
    }, 700);
  };

  // Najważniejsze: loader nie ma prawa zablokować strony.
  window.setTimeout(hideLoader, 2300);
  window.setTimeout(hideLoader, 3600);
  window.addEventListener("load", () => window.setTimeout(hideLoader, 450));

  document.addEventListener("DOMContentLoaded", () => safeRun(() => {
    document.body.classList.add("is-loading");

    const revealItems = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("visible"));
    }

    const header = document.querySelector(".site-header");
    let lastY = window.scrollY;
    let ticking = false;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const smooth = (value) => value * value * (3 - 2 * value);
    const easeOut = (value) => 1 - Math.pow(1 - value, 3);

    const cinematicSection = document.querySelector(".cinematic-portfolio");
    let target = 0;
    let current = 0;
    let rafActive = false;

    const updateValues = () => {
      if (header) {
        const currentY = window.scrollY;

        if (currentY > lastY && currentY > 130) {
          header.style.transform = "translateX(-50%) translateY(-135%)";
          header.style.opacity = "0";
        } else {
          header.style.transform = "translateX(-50%) translateY(0)";
          header.style.opacity = "1";
        }

        lastY = Math.max(currentY, 0);
      }

      if (cinematicSection) {
        const rect = cinematicSection.getBoundingClientRect();
        const scrollable = cinematicSection.offsetHeight - window.innerHeight;
        target = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;
      }

      ticking = false;
    };

    const animateCinematic = () => {
      if (!cinematicSection) {
        rafActive = false;
        return;
      }

      current += (target - current) * 0.10;

      if (Math.abs(target - current) < 0.001) {
        current = target;
      }

      const main = clamp((current - 0.08) / 0.78, 0, 1);
      const eased = easeOut(smooth(main));

      cinematicSection.style.setProperty("--p", current.toFixed(4));
      cinematicSection.style.setProperty("--e", eased.toFixed(4));

      if (Math.abs(target - current) > 0.001) {
        requestAnimationFrame(animateCinematic);
      } else {
        rafActive = false;
      }
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        requestAnimationFrame(updateValues);
        ticking = true;
      }

      if (!rafActive) {
        rafActive = true;
        requestAnimationFrame(animateCinematic);
      }
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    updateValues();
    animateCinematic();

    // Smooth anchor only, bez ryzyka blokady.
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const selector = link.getAttribute("href");
        const targetElement = document.querySelector(selector);

        if (!targetElement) return;

        event.preventDefault();
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    window.setTimeout(hideLoader, 1850);
  }));
})();
