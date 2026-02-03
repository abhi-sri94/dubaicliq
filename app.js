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

// Drawer (hamburger) + mega categories behavior
(function initDrawer() {
  const menuToggle = qs(".menu-toggle");
  const allCategoriesBtn = qs(".all-categories-btn");
  const drawer = qs(".side-drawer");
  const overlay = qs(".drawer-overlay");
  const closeBtn = qs(".drawer-close");

  let resetMegaToDefault = null;

  const setDrawerOpen = (open) => {
    if (!drawer || !overlay || !menuToggle) return;
    document.documentElement.classList.toggle("drawer-open", open);
    document.body.classList.toggle("no-scroll", open);
    menuToggle.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
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
      menuToggle.focus();
    }
  };

  if (menuToggle && drawer && overlay && closeBtn) {
    menuToggle.addEventListener("click", () => {
      const isOpen = document.documentElement.classList.contains("drawer-open");
      setDrawerOpen(!isOpen);
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

// Homepage search (index only): filters featured product cards and scrolls to the section.
(function initHomeSearch() {
  const form = qs(".search-form");
  const input = qs(".search-input");
  const hint = qs(".search-hint");
  const featured = qs("#featured");
  const cards = qsa(".product-card");

  if (!form || !input || !featured || cards.length === 0) return;

  const applyFilter = (q) => {
    const query = q.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const tags = String(card.getAttribute("data-tags") || "").toLowerCase();
      const text = (card.textContent || "").toLowerCase();
      const match = !query || tags.includes(query) || text.includes(query);
      card.style.display = match ? "" : "none";
      if (match) visible += 1;
    });
    if (hint) {
      hint.textContent = query
        ? `${visible} result${visible === 1 ? "" : "s"} for “${q.trim()}”`
        : "";
    }
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilter(input.value);
    featured.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  input.addEventListener("input", () => {
    // live filter, but don't auto-scroll on every keystroke
    applyFilter(input.value);
  });
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

