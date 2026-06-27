/* =========================================================
   VERDE — interactions & motion
   Lenis smooth scroll · GSAP ScrollTrigger · Swiper
   Degrades gracefully + respects prefers-reduced-motion
   ========================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------------------------------------------------------
     1. Smooth scroll (Lenis) + GSAP ScrollTrigger sync
  --------------------------------------------------------- */
  let lenis = null;
  const hasGSAP = typeof gsap !== "undefined";
  if (hasGSAP && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  if (!reduceMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasGSAP && typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  /* Anchor links → smooth scroll (works with or without Lenis) */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id === "#" || id === "#top") {
        e.preventDefault();
        lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" });
        closeOverlay();
        return;
      }
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        closeOverlay();
        const y = target.getBoundingClientRect().top + window.pageYOffset - 70;
        lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
  });

  /* ---------------------------------------------------------
     2. Nav: solidify on scroll
  --------------------------------------------------------- */
  const nav = $("#nav");
  const onScroll = () => {
    if (window.scrollY > 60) nav.classList.add("is-solid");
    else nav.classList.remove("is-solid");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------------------------------------------------
     3. Mobile overlay menu
  --------------------------------------------------------- */
  const overlay = $("#overlay");
  const toggle = $("#navToggle");
  const overlayClose = $("#overlayClose");

  function openOverlay() {
    overlay.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (lenis) lenis.stop();
  }
  function closeOverlay() {
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lenis) lenis.start();
  }
  toggle && toggle.addEventListener("click", openOverlay);
  overlayClose && overlayClose.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeOverlay(); });

  /* ---------------------------------------------------------
     4. Reveal on scroll (IntersectionObserver fallback-safe)
  --------------------------------------------------------- */
  const revealEls = $$("[data-reveal]");
  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add("is-visible"));
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset.delay ? parseFloat(el.dataset.delay) : 0;
          el.style.transition = `opacity .9s cubic-bezier(.22,1,.36,1) ${delay}s, transform .9s cubic-bezier(.22,1,.36,1) ${delay}s`;
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el, i) => { el.dataset.delay = ((i % 4) * 0.07).toFixed(2); io.observe(el); });
    /* Failsafe: never leave content permanently hidden if the observer under-fires */
    window.addEventListener("load", () => {
      setTimeout(() => {
        revealEls.forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && !el.classList.contains("is-visible")) {
            el.classList.add("is-visible");
          }
        });
      }, 1200);
    });
  } else {
    revealEls.forEach(el => el.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------
     5. Hero: Ken-Burns + parallax
  --------------------------------------------------------- */
  const heroImg = $("#heroImg");
  if (heroImg && !reduceMotion && hasGSAP) {
    gsap.to(heroImg, { scale: 1.0, duration: 9, ease: "power1.out" });
    gsap.to(heroImg, {
      yPercent: 14, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
  } else if (heroImg) {
    heroImg.style.transform = "scale(1.04)";
  }

  /* ---------------------------------------------------------
     6. Parallax images
  --------------------------------------------------------- */
  if (!reduceMotion && hasGSAP) {
    $$("[data-parallax]").forEach(img => {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: img.closest("[data-parallax-wrap]") || img, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* ---------------------------------------------------------
     7. Signature titles: letter stagger
  --------------------------------------------------------- */
  if (!reduceMotion && hasGSAP) {
    $$("[data-letters]").forEach(el => {
      const text = el.textContent;
      el.innerHTML = text.split("").map(ch =>
        ch === " " ? " " : `<span class="ltr">${ch}</span>`
      ).join("");
      gsap.from(el.querySelectorAll(".ltr"), {
        yPercent: 110, opacity: 0, duration: .8, ease: "power3.out", stagger: 0.025,
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
  }

  /* ---------------------------------------------------------
     8. Stat counters
  --------------------------------------------------------- */
  const statsSection = $("#stats");
  if (statsSection) {
    const runCounters = () => {
      $$("[data-count]", statsSection).forEach(el => {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const suffix = el.dataset.suffix || "";
        if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
        const obj = { v: 0 };
        if (hasGSAP) {
          gsap.to(obj, {
            v: target, duration: 1.8, ease: "power2.out",
            onUpdate: () => { el.textContent = obj.v.toFixed(decimals) + suffix; }
          });
        } else {
          el.textContent = target.toFixed(decimals) + suffix;
        }
      });
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries, o) => {
        entries.forEach(e => { if (e.isIntersecting) { runCounters(); o.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(statsSection);
    } else { runCounters(); }
  }

  /* ---------------------------------------------------------
     9. Menu tabs
  --------------------------------------------------------- */
  const tabs = $$(".menu__tab");
  const panels = $$(".menu__panel");
  function activateTab(name) {
    let matched = false;
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      if (on) matched = true;
    });
    if (!matched) return;
    panels.forEach(p => p.classList.toggle("is-active", p.dataset.panel === name));
    if (lenis) lenis.resize();
    if (hasGSAP && typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }
  tabs.forEach(tab => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));

  /* Deep-links to a specific tab (e.g. the "See the bar" link → #bar) */
  $$('a[href="#bar"], a[href="#menu"]').forEach(a => {
    a.addEventListener("click", () => {
      if (a.getAttribute("href") === "#bar") activateTab("bar");
    });
  });
  if (location.hash === "#bar") activateTab("bar");

  /* ---------------------------------------------------------
     10. Swiper carousels
  --------------------------------------------------------- */
  if (typeof Swiper !== "undefined") {
    new Swiper(".gallery__swiper", {
      slidesPerView: "auto",
      spaceBetween: 20,
      grabCursor: true,
      navigation: { nextEl: ".gallery__btn--next", prevEl: ".gallery__btn--prev" },
      breakpoints: { 760: { spaceBetween: 28 } }
    });

    new Swiper(".reviews__swiper", {
      slidesPerView: 1,
      loop: true,
      autoplay: reduceMotion ? false : { delay: 5200, disableOnInteraction: false },
      speed: 800,
      pagination: { el: ".reviews__dots", clickable: true }
    });
  }

  /* ---------------------------------------------------------
     11. Open-now highlight on hours table
     Tue–Thu 17–21 · Fri–Sat 11–14 & 17–21
  --------------------------------------------------------- */
  (function openNow() {
    const now = new Date();
    const day = now.getDay();           // 0 Sun … 6 Sat
    const mins = now.getHours() * 60 + now.getMinutes();
    const inRange = (a, b) => mins >= a && mins < b;
    const lunch = inRange(11 * 60, 14 * 60);
    const dinner = inRange(17 * 60, 21 * 60);
    let openRow = null;
    if (day >= 2 && day <= 4 && dinner) openRow = 2;          // Tue–Thu
    else if ((day === 5 || day === 6) && (lunch || dinner)) openRow = 3; // Fri–Sat
    if (openRow !== null) {
      const rows = $$("#hours tr");
      if (rows[openRow]) rows[openRow].classList.add("is-now");
    }
  })();

  /* ---------------------------------------------------------
     12. Magnetic gold buttons (subtle)
  --------------------------------------------------------- */
  if (!reduceMotion && window.matchMedia("(hover:hover)").matches) {
    $$(".btn--gold").forEach(btn => {
      btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }
})();
