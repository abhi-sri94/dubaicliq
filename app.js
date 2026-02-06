// Shared UI behaviors for all pages.

function qs(sel, root = document) {
  return root.querySelector(sel);
}
function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

// Always start the homepage from the top (ignore any existing #hash).
// This prevents the site from reopening at e.g. #contact if the URL keeps the hash.
(function forceHomeToTop() {
  const isIndex =
    window.location.pathname.endsWith("/") ||
    window.location.pathname.endsWith("/index.html") ||
    window.location.pathname.endsWith("index.html");
  if (!isIndex) return;

  if (!window.location.hash) return;

  window.addEventListener("load", () => {
    // Remove hash without adding a new history entry.
    history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
})();

// Auto-hide header on scroll down, show on scroll up (saves vertical space).
(function autoHideHeader() {
  const header = qs(".site-header");
  if (!header) return;

  let lastY = window.pageYOffset || 0;
  let ticking = false;

  const update = () => {
    const y = window.pageYOffset || 0;
    const delta = y - lastY;

    // Don't hide at the very top.
    if (y < 20) {
      header.classList.remove("is-hidden");
      header.style.setProperty("--header-hide", "0px");
      lastY = y;
      ticking = false;
      return;
    }

    // If the drawer is open, keep header visible.
    if (document.documentElement.classList.contains("drawer-open")) {
      header.classList.remove("is-hidden");
      header.style.setProperty("--header-hide", "0px");
      lastY = y;
      ticking = false;
      return;
    }

    // Compute hide distance from current header height.
    const h = header.offsetHeight || 0;
    header.style.setProperty("--header-hide", `${h}px`);

    // Small jitters shouldn't toggle.
    if (Math.abs(delta) > 6) {
      if (delta > 0) {
        // scrolling down -> hide
        header.classList.add("is-hidden");
      } else {
        // scrolling up -> show
        header.classList.remove("is-hidden");
      }
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
})();

// Drawer (hamburger) + mega categories behavior
(function initDrawer() {
  const menuToggles = qsa(".menu-toggle");
  const allCategoriesBtn = qs(".all-categories-btn");
  const drawer = qs(".side-drawer");
  const overlay = qs(".drawer-overlay");
  const closeBtn = qs(".drawer-close");

  let resetMegaToDefault = null;

  const setDrawerOpen = (open) => {
    const primaryToggle = menuToggles[0];
    if (!drawer || !overlay || !primaryToggle) return;
    document.documentElement.classList.toggle("drawer-open", open);
    document.body.classList.toggle("no-scroll", open);
    menuToggles.forEach((t) => {
      t.classList.toggle("open", open);
      t.setAttribute("aria-expanded", open ? "true" : "false");
    });
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    overlay.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) {
      // Always reset to the first category when opening (eMax-style).
      if (typeof resetMegaToDefault === "function") {
        resetMegaToDefault();
      }
      const firstCat = drawer.querySelector(".drawer-cat-btn");
      firstCat?.focus();
    } else {
      primaryToggle.focus();
    }
  };

  if (menuToggles.length && drawer && overlay && closeBtn) {
    menuToggles.forEach((t) => {
      t.addEventListener("click", () => {
        const isOpen = document.documentElement.classList.contains("drawer-open");
        setDrawerOpen(!isOpen);
      });
    });
    allCategoriesBtn?.addEventListener("click", () => {
      setDrawerOpen(true);
    });
    closeBtn.addEventListener("click", () => setDrawerOpen(false));
    overlay.addEventListener("click", () => setDrawerOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    });
  }

  // Mega menu switching
  if (drawer) {
    const catButtons = qsa(".drawer-cat-btn", drawer);
    const panels = qsa(".drawer-panel", drawer);
    const setActive = (key) => {
      catButtons.forEach((b) =>
        b.classList.toggle("is-active", b.dataset.category === key)
      );
      panels.forEach((p) =>
        p.classList.toggle("is-active", p.dataset.panel === key)
      );
    };

    catButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.dataset.category));
      btn.addEventListener("mouseenter", () => {
        // Desktop-like hover behavior
        if (window.matchMedia("(hover: hover)").matches) {
          setActive(btn.dataset.category);
        }
      });
    });

    const defaultKey = catButtons[0]?.dataset.category;
    resetMegaToDefault = () => {
      if (!defaultKey) return;
      setActive(defaultKey);
      const megaPanel = drawer.querySelector(".mega-panel");
      if (megaPanel) megaPanel.scrollTop = 0;
    };
    resetMegaToDefault();

    // Close drawer when clicking a real navigation link in panel
    qsa(".drawer-panel a", drawer).forEach((a) => {
      a.addEventListener("click", () => {
        setDrawerOpen(false);
      });
    });
  }
})();

// Carousel (index only)
(function initCarousel() {
  const carousel = qs(".carousel");
  if (!carousel) return;

  const track = qs(".carousel-track", carousel);
  const slides = qsa(".carousel-slide", carousel);
  const dots = qsa(".dot", carousel);
  const prevBtn = qs(".carousel-btn.prev", carousel);
  const nextBtn = qs(".carousel-btn.next", carousel);

  let index = 0;
  let timerId = null;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setActive = (i) => {
    index = (i + slides.length) % slides.length;
    if (track) track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((s, si) => s.classList.toggle("is-active", si === index));
    dots.forEach((d, di) => {
      const active = di === index;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  const next = () => setActive(index + 1);
  const prev = () => setActive(index - 1);

  const start = () => {
    if (prefersReduced || timerId) return;
    timerId = window.setInterval(next, 6500);
  };
  const stop = () => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  prevBtn?.addEventListener("click", () => {
    stop();
    prev();
    start();
  });
  nextBtn?.addEventListener("click", () => {
    stop();
    next();
    start();
  });
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      stop();
      setActive(i);
      start();
    });
  });

  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);
  carousel.addEventListener("focusin", stop);
  carousel.addEventListener("focusout", start);

  setActive(0);
  start();
})();

// Lead form (index only)
(function initLeadForm() {
  const leadForm = qs("#lead-form");
  if (!leadForm) return;

  leadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(leadForm);
    const lead = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      project: String(formData.get("project") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      source: String(formData.get("source") || "website"),
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem("dubaicliq_lead", JSON.stringify(lead));
    window.location.href = "thank-you.html";
  });
})();

// Search routing: send queries to products page.
(function initSearchRouting() {
  const form = qs(".search-form");
  const input = qs(".search-input");
  if (!form || !input) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    const url = `products.html?q=${encodeURIComponent(query)}`;
    window.location.href = url;
  });
})();

// Products page filters (products.html).
(function initProductFilters() {
  const grid = qs(".catalog-grid");
  const cards = qsa(".catalog-card");
  const pills = qsa(".catalog-filters .pill");
  const hint = qs(".search-hint");
  const input = qs(".search-input");
  const form = qs(".search-form");

  if (!grid || cards.length === 0) return;

  const applyFilters = (cat, q) => {
    const query = (q || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const tags = String(card.getAttribute("data-tags") || "").toLowerCase();
      const text = (card.textContent || "").toLowerCase();
      const cardCat = String(card.getAttribute("data-cat") || "").toLowerCase();
      const matchCat = !cat || cat === "all" || cardCat === cat;
      const matchQ = !query || tags.includes(query) || text.includes(query);
      const match = matchCat && matchQ;
      card.style.display = match ? "" : "none";
      if (match) visible += 1;
    });
    if (hint) {
      const parts = [];
      if (cat && cat !== "all") parts.push(`Category: ${cat}`);
      if (query) parts.push(`Search: “${q.trim()}”`);
      hint.textContent = parts.length
        ? `${visible} result${visible === 1 ? "" : "s"} • ${parts.join(" • ")}`
        : "";
    }
  };

  const setActivePill = (cat) => {
    pills.forEach((p) => p.classList.toggle("is-active", p.dataset.cat === cat));
  };

  // URL param support.
  const params = new URLSearchParams(window.location.search);
  const paramCat = params.get("cat") || "all";
  const paramQ = params.get("q") || "";
  if (input && paramQ) input.value = paramQ;
  setActivePill(paramCat);
  applyFilters(paramCat, paramQ);

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const cat = pill.dataset.cat || "all";
      setActivePill(cat);
      applyFilters(cat, input ? input.value : "");
    });
  });

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      applyFilters(
        (qsa(".catalog-filters .pill.is-active")[0]?.dataset.cat) || "all",
        input.value
      );
    });
  }
})();

// Thank-you page: build WhatsApp + email links from saved lead
(function initThankYou() {
  const wa = qs("#send-whatsapp");
  const email = qs("#send-email");
  const preview = qs("#lead-preview");
  if (!wa || !email) return;

  const raw = sessionStorage.getItem("dubaicliq_lead");
  const phone = "971509876683";
  const toEmail = "hello@dubaicliq.com";

  if (!raw) return;
  try {
    const lead = JSON.parse(raw);
    const name = (lead.name || "").trim();
    const fromEmail = (lead.email || "").trim();
    const project = (lead.project || "").trim();
    const message = (lead.message || "").trim();

    const textLines = [
      "Hi Dubaicliq, I'd like to enquire about an AV project.",
      "",
      `Name: ${name || "-"}`,
      `Email: ${fromEmail || "-"}`,
      `Project: ${project || "-"}`,
      "",
      "Message:",
      message || "-",
    ];
    const text = textLines.join("\n");

    wa.setAttribute(
      "href",
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    );

    const subject = encodeURIComponent(
      `Website enquiry - ${project || "AV Project"}`
    );
    const body = encodeURIComponent(text);
    email.setAttribute("href", `mailto:${toEmail}?subject=${subject}&body=${body}`);

    if (preview) {
      preview.textContent = `Preview: ${name || "Name"} • ${
        project || "Project"
      } • ${fromEmail || "Email"}`;
    }
  } catch (_) {
    // ignore
  }
})();

