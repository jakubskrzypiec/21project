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

  const shapeSection = document.querySelector(".shape-portal");
  const shape = document.querySelector("#rotatingShape");
  const shapeContact = document.querySelector("#shapeContact");
  const shapeCopy = document.querySelector(".shape-copy");

  const updateShape = () => {
    if (!shapeSection || !shape || !shapeContact || !shapeCopy) return;

    const rect = shapeSection.getBoundingClientRect();
    const total = shapeSection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);

    const rotation = progress * 220;
    const opacityCopy = Math.max(0, 1 - progress * 2.2);

    if (window.innerWidth > 1060) {
      const shift = 18 - progress * 18;
      const scale = 0.75 + progress * 2.65;
      shape.style.transform = `translateX(${shift}vw) scale(${scale}) rotate(${rotation}deg)`;
    } else {
      const shift = 10 - progress * 10;
      const scale = 0.72 + progress * 2.45;
      shape.style.transform = `translateY(${shift}vh) scale(${scale}) rotate(${rotation}deg)`;
    }

    shapeCopy.style.opacity = opacityCopy;
    shapeCopy.style.transform = `translateY(${-progress * 36}px)`;

    if (progress > 0.62) {
      shapeContact.classList.add("is-visible");
    } else {
      shapeContact.classList.remove("is-visible");
    }
  };

  window.addEventListener("scroll", updateShape, { passive: true });
  window.addEventListener("resize", updateShape);
  updateShape();
});
