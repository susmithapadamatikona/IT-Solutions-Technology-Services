/**
 * Stackly Technology — Graphite Signal
 * Vanilla JS: preloader, nav, AOS, marquee, slider, FAQ, forms, pagination, dashboards
 */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------------------------
     Preloader
     -------------------------------------------------------------------------- */
  function initPreloader() {
    const el = document.querySelector(".preloader");
    if (!el) return;

    document.body.classList.add("is-loading");

    let done = false;
    const started = performance.now();
    const minShow = reduceMotion ? 0 : 700;

    const hide = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, minShow - (performance.now() - started));
      setTimeout(() => {
        el.classList.add("is-done");
        document.body.classList.remove("is-loading");
        const cleanup = () => {
          if (el.parentNode) el.remove();
        };
        el.addEventListener(
          "transitionend",
          (e) => {
            if (e.target === el) cleanup();
          },
          { once: true }
        );
        setTimeout(cleanup, 700);
      }, wait);
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
    }
    setTimeout(hide, 2200); // failsafe so the screen never stays blocked
  }

  /* --------------------------------------------------------------------------
     Header scroll + mobile nav
     -------------------------------------------------------------------------- */
  function initHeader() {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");

    if (header) {
      const onScroll = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 12);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = !nav.classList.contains("is-open");
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        document.body.style.overflow = open ? "hidden" : "";
      });

      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
     Active nav link
     -------------------------------------------------------------------------- */
  function initActiveNav() {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav__link").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("/").pop().toLowerCase();
      if (href === path || (path === "" && href === "index.html")) {
        link.classList.add("is-active");
      }
    });
  }

  /* --------------------------------------------------------------------------
     Lightweight AOS (Animate On Scroll)
     -------------------------------------------------------------------------- */
  function initAOS() {
    // Animate the individual content blocks instead of nesting moving sections.
    document.querySelectorAll("[data-aos]").forEach((node) => {
      if (node.querySelector("[data-aos]")) {
        node.removeAttribute("data-aos");
        node.removeAttribute("data-aos-delay");
      }
    });
    const nodes = Array.from(document.querySelectorAll("[data-aos]"));
    if (!nodes.length || reduceMotion || !("IntersectionObserver" in window)) return;

    const style = document.createElement("style");
    style.textContent = `
      [data-aos].aos-init {
        opacity: 0;
        transform: translateY(22px);
        transition: opacity .65s cubic-bezier(.22,1,.36,1), transform .65s cubic-bezier(.22,1,.36,1);
      }
      [data-aos="fade-right"].aos-init { transform: translateX(-22px); }
      [data-aos="fade-left"].aos-init { transform: translateX(22px); }
      [data-aos="zoom-in"].aos-init { transform: scale(.96); }
      [data-aos].aos-init.aos-animate { opacity: 1; transform: none; }
      @media (max-width: 640px) {
        [data-aos="fade-right"].aos-init, [data-aos="fade-left"].aos-init { transform: translateY(16px); }
        [data-aos].aos-init.aos-animate { transform: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-aos].aos-init { opacity: 1; transform: none; transition: none; }
      }
    `;
    document.head.appendChild(style);

    const reveal = (node, immediate = false) => {
      if (node.classList.contains("aos-animate")) return;
      const siblings = Array.from(node.parentElement.children).filter((el) => el.hasAttribute("data-aos"));
      const configured = Number(node.getAttribute("data-aos-delay"));
      const delay = immediate ? 0 : Math.min(240, Math.max(0,
        node.hasAttribute("data-aos-delay") && Number.isFinite(configured)
          ? configured : siblings.indexOf(node) * 70));
      node.style.transitionDelay = `${delay}ms`;
      node.classList.add("aos-animate");
      // Release animation styles so card hover effects keep their normal timing.
      setTimeout(() => {
        node.classList.remove("aos-init");
        node.style.removeProperty("transition-delay");
      }, 700 + delay);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

    nodes.forEach((node) => {
      node.classList.add("aos-init");
      observer.observe(node);
    });
    // Keyboard navigation must never land on invisible content.
    document.addEventListener("focusin", (event) => {
      const node = event.target.closest("[data-aos]");
      if (node) {
        reveal(node, true);
        observer.unobserve(node);
      }
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener("change", (event) => {
      if (event.matches) {
        nodes.forEach((node) => reveal(node, true));
        observer.disconnect();
      }
    });
  }

  /* --------------------------------------------------------------------------
     Testimonial / generic slider
     -------------------------------------------------------------------------- */
  function initSliders() {
    document.querySelectorAll("[data-slider]").forEach((root) => {
      const track = root.querySelector(".slider__track");
      const slides = root.querySelectorAll(".slider__slide");
      const dotsWrap = root.querySelector(".slider__dots");
      const prev = root.querySelector("[data-slider-prev]");
      const next = root.querySelector("[data-slider-next]");
      if (!track || !slides.length) return;

      let index = 0;
      let timer = null;
      const autoplay = root.getAttribute("data-autoplay") !== "false";
      const interval = Number(root.getAttribute("data-interval") || 5000);

      slides.forEach((_, i) => {
        if (!dotsWrap) return;
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "slider__dot" + (i === 0 ? " is-active" : "");
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.addEventListener("click", () => go(i));
        dotsWrap.appendChild(dot);
      });

      const dots = dotsWrap ? dotsWrap.querySelectorAll(".slider__dot") : [];

      function render() {
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
      }

      function go(i) {
        index = (i + slides.length) % slides.length;
        render();
        restart();
      }

      function restart() {
        if (!autoplay || reduceMotion) return;
        clearInterval(timer);
        timer = setInterval(() => go(index + 1), interval);
      }

      prev && prev.addEventListener("click", () => go(index - 1));
      next && next.addEventListener("click", () => go(index + 1));

      root.addEventListener("mouseenter", () => clearInterval(timer));
      root.addEventListener("mouseleave", restart);
      root.addEventListener("focusin", () => clearInterval(timer));
      root.addEventListener("focusout", restart);

      render();
      restart();
    });
  }

  /* --------------------------------------------------------------------------
     FAQ accordion
     -------------------------------------------------------------------------- */
  function initFaq() {
    document.querySelectorAll(".faq__item").forEach((item) => {
      const btn = item.querySelector(".faq__question");
      if (!btn) return;
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", () => {
        const open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(open));
      });
    });
  }

  /* --------------------------------------------------------------------------
     Form validation (UI states)
     -------------------------------------------------------------------------- */
  function initForms() {
    function validateField(field, form) {
      let ok = true;
      const matchSelector = field.getAttribute("data-match");

      if (field.type === "checkbox") {
        ok = field.checked;
      } else if (field.type === "radio") {
        const group = form.querySelectorAll('input[type="radio"][name="' + field.name + '"]');
        ok = Array.from(group).some((r) => r.checked);
      } else if (field.type === "email") {
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
      } else if (field.type === "password") {
        ok = field.value.length > 0;
        if (field.minLength > 0) ok = ok && field.value.length >= field.minLength;
        if (matchSelector) {
          const matchField = form.querySelector(matchSelector);
          ok = ok && Boolean(matchField) && field.value === matchField.value;
        }
      } else if (matchSelector) {
        const matchField = form.querySelector(matchSelector);
        ok = field.value.trim().length > 0 && Boolean(matchField) && field.value === matchField.value;
      } else {
        ok = field.value.trim().length > 0;
      }

      field.classList.toggle("is-invalid", !ok);
      const wrap = field.closest(".field");
      if (wrap) wrap.classList.toggle("is-invalid", !ok);
      return ok;
    }

    document.querySelectorAll("form[data-validate]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        let valid = true;
        const seenRadios = new Set();

        form.querySelectorAll("[required]").forEach((field) => {
          if (field.type === "radio") {
            if (seenRadios.has(field.name)) return;
            seenRadios.add(field.name);
          }
          if (!validateField(field, form)) valid = false;
        });

        if (!valid) return;

        if (form.hasAttribute("data-auth-redirect") || form.hasAttribute("data-auth-login")) {
          const nameInput = form.querySelector('input[name="name"]');
          const emailInput = form.querySelector('input[name="email"]');
          const role = (form.querySelector('input[name="role"]:checked') || {}).value || "client";
          const profile = {
            name: nameInput ? nameInput.value.trim() : "",
            email: emailInput ? emailInput.value.trim() : "",
            role: role,
          };
          try {
            const payload = JSON.stringify(profile);
            localStorage.setItem("stacklyUser", payload);
            sessionStorage.setItem("stacklyUser", payload);
          } catch (err) {
            /* ignore storage errors in demo */
          }

          if (form.hasAttribute("data-auth-login")) {
            window.location.href = role === "admin" ? "admin.html" : "client.html";
            return;
          }

          const target = form.getAttribute("data-auth-redirect");
          if (target && target !== "") {
            window.location.href = target;
            return;
          }
          window.location.href = role === "admin" ? "admin.html" : "client.html";
          return;
        }

        const redirect = form.getAttribute("data-success-redirect");
        if (redirect) {
          form.reset();
          form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
          window.location.href = redirect;
          return;
        }

        const note = form.querySelector("[data-form-success]");
        if (note) {
          note.hidden = false;
        } else {
          alert("Thanks — your message is ready to send (demo UI).");
        }
        form.reset();
        form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
      });

      form.querySelectorAll("[required]").forEach((field) => {
        const clear = () => {
          field.classList.remove("is-invalid");
          const wrap = field.closest(".field");
          if (wrap) wrap.classList.remove("is-invalid");
        };
        field.addEventListener("input", () => {
          clear();
          const confirm = form.querySelector("[data-match]");
          if (confirm && (field === confirm || "#" + field.id === confirm.getAttribute("data-match"))) {
            if (confirm.value) validateField(confirm, form);
            else {
              confirm.classList.remove("is-invalid");
              const wrap = confirm.closest(".field");
              if (wrap) wrap.classList.remove("is-invalid");
            }
          }
        });
        field.addEventListener("change", clear);
      });
    });
  }

  function initPasswordToggle() {
    document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrap = btn.closest(".field__password");
        const input = wrap ? wrap.querySelector("input") : null;
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        const icon = btn.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye", !show);
          icon.classList.toggle("fa-eye-slash", show);
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     Blog filters + pagination
     -------------------------------------------------------------------------- */
  function initBlog() {
    const grid = document.querySelector("[data-blog-grid]");
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll("[data-category]"));
    const filterBtns = document.querySelectorAll("[data-filter]");
    const search = document.querySelector("[data-blog-search]");
    const pagination = document.querySelector("[data-pagination]");
    const perPage = Number(grid.getAttribute("data-per-page") || 6);

    let category = "all";
    let query = "";
    let page = 1;

    function filtered() {
      return cards.filter((card) => {
        const cat = card.getAttribute("data-category") || "";
        const text = card.textContent.toLowerCase();
        const catOk = category === "all" || cat === category;
        const qOk = !query || text.includes(query);
        return catOk && qOk;
      });
    }

    function render() {
      const list = filtered();
      const pages = Math.max(1, Math.ceil(list.length / perPage));
      if (page > pages) page = pages;
      const start = (page - 1) * perPage;
      const visible = new Set(list.slice(start, start + perPage));

      cards.forEach((card) => {
        card.style.display = visible.has(card) ? "" : "none";
      });

      if (!pagination) return;
      pagination.innerHTML = "";

      const prev = document.createElement("button");
      prev.type = "button";
      prev.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i><span class="sr-only">Previous</span>';
      prev.disabled = page <= 1;
      prev.addEventListener("click", () => {
        page -= 1;
        render();
        grid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
      pagination.appendChild(prev);

      for (let i = 1; i <= pages; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(i);
        btn.className = i === page ? "is-active" : "";
        btn.setAttribute("aria-label", `Page ${i}`);
        if (i === page) btn.setAttribute("aria-current", "page");
        btn.addEventListener("click", () => {
          page = i;
          render();
          grid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        });
        pagination.appendChild(btn);
      }

      const next = document.createElement("button");
      next.type = "button";
      next.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span class="sr-only">Next</span>';
      next.disabled = page >= pages;
      next.addEventListener("click", () => {
        page += 1;
        render();
        grid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
      pagination.appendChild(next);
    }

    const toolbarFilters = document.querySelectorAll(".filter-btn[data-filter]");
    const topicChannels = document.querySelectorAll(".topic-channel[data-filter], .topic-tile[data-filter]");

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-filter") || "all";
        const isTopic = btn.classList.contains("topic-channel") || btn.classList.contains("topic-tile");
        toolbarFilters.forEach((b) => {
          b.classList.toggle("is-active", (b.getAttribute("data-filter") || "all") === next);
        });
        topicChannels.forEach((tile) => {
          tile.classList.toggle(
            "is-active",
            isTopic
              ? tile === btn
              : (tile.getAttribute("data-filter") || "") === next && next !== "all"
          );
        });
        category = next;
        page = 1;
        render();
        if (isTopic) {
          const target = document.getElementById("all-posts") || grid;
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      });
    });

    if (search) {
      search.addEventListener("input", () => {
        query = search.value.trim().toLowerCase();
        page = 1;
        render();
      });
    }

    render();
  }

  /* --------------------------------------------------------------------------
     Dashboard sidebar drawer + hash subpages
     -------------------------------------------------------------------------- */
  function initDashboard() {
    const dash = document.querySelector(".dash");
    if (!dash) return;
    const toggle = dash.querySelector(".sidebar-toggle");
    const overlay = dash.querySelector(".dash-overlay");
    const views = Array.from(dash.querySelectorAll("[data-dash-view]"));
    const navLinks = Array.from(dash.querySelectorAll(".dash-nav a[href^='#']"));
    const titleEl = dash.querySelector("[data-dash-title]");
    const isAdmin = /admin\.html/i.test(window.location.pathname) || dash.querySelector('[data-dash-view="dashboard"]');
    const close = () => {
      dash.classList.remove("is-sidebar-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    };

    function readStoredUser() {
      try {
        const raw = sessionStorage.getItem("stacklyUser") || localStorage.getItem("stacklyUser");
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    }

    const user = readStoredUser();
    const fallback = isAdmin
      ? { name: "Morgan Chen", email: "morgan@stackly.io", role: "admin" }
      : { name: "Jordan Lee", email: "jordan@acme.co", role: "client" };
    const profile = {
      name: (user && user.name) || fallback.name,
      email: (user && user.email) || fallback.email,
      role: (user && user.role) || fallback.role,
    };

    const userCard = dash.querySelector(".dash-user");
    if (userCard) userCard.hidden = false;

    dash.querySelectorAll("[data-user-name]").forEach((el) => {
      el.textContent = profile.name;
    });
    dash.querySelectorAll("[data-user-email]").forEach((el) => {
      el.textContent = profile.email;
    });
    dash.querySelectorAll("[data-user-role]").forEach((el) => {
      el.textContent = profile.role === "admin" ? "Admin" : "Client";
    });

    dash.querySelectorAll("[data-logout]").forEach((link) => {
      link.addEventListener("click", () => {
        try {
          localStorage.removeItem("stacklyUser");
          sessionStorage.removeItem("stacklyUser");
        } catch (err) {
          /* ignore */
        }
      });
    });

    const defaultView =
      (views.find((v) => v.classList.contains("is-active")) || views[0])?.getAttribute("data-dash-view") ||
      "overview";

    function showView(name, options) {
      const opts = options || {};
      const target = name && views.some((v) => v.getAttribute("data-dash-view") === name) ? name : defaultView;

      views.forEach((view) => {
        const active = view.getAttribute("data-dash-view") === target;
        view.classList.toggle("is-active", active);
        view.hidden = !active;
      });

      navLinks.forEach((link) => {
        const hash = (link.getAttribute("href") || "").replace(/^#/, "");
        link.classList.toggle("is-active", hash === target);
      });

      if (titleEl) {
        const activeLink = navLinks.find((l) => (l.getAttribute("href") || "").replace(/^#/, "") === target);
        const label = activeLink ? activeLink.textContent.trim() : target;
        titleEl.textContent = label;
      }

      const current = window.location.hash.replace(/^#/, "");
      if (current !== target) {
        const url = "#" + target;
        if (opts.push) history.pushState(null, "", url);
        else history.replaceState(null, "", url);
      }

      if (!opts.silent) window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function syncFromHash(silent) {
      showView(window.location.hash.replace(/^#/, "") || defaultView, { silent: !!silent });
    }

    toggle &&
      toggle.addEventListener("click", () => {
        const open = !dash.classList.contains("is-sidebar-open");
        dash.classList.toggle("is-sidebar-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    overlay && overlay.addEventListener("click", close);

    navLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        const hash = (a.getAttribute("href") || "").replace(/^#/, "");
        if (!hash) return;
        e.preventDefault();
        showView(hash, { push: true });
        close();
      });
    });

    window.addEventListener("hashchange", () => syncFromHash(false));
    window.addEventListener("popstate", () => syncFromHash(false));
    syncFromHash(true);
  }

  /* --------------------------------------------------------------------------
     Table pagination (dashboards)
     -------------------------------------------------------------------------- */
  function initTablePagination() {
    document.querySelectorAll("[data-table-page]").forEach((wrap) => {
      const table = wrap.querySelector("tbody");
      const pager = wrap.querySelector("[data-table-pager]");
      if (!table || !pager) return;
      const rows = Array.from(table.querySelectorAll("tr"));
      const perPage = Number(wrap.getAttribute("data-per-page") || 5);
      let page = 1;

      function render() {
        const pages = Math.max(1, Math.ceil(rows.length / perPage));
        if (page > pages) page = pages;
        const start = (page - 1) * perPage;
        rows.forEach((row, i) => {
          row.style.display = i >= start && i < start + perPage ? "" : "none";
        });
        pager.innerHTML = "";
        const prev = document.createElement("button");
        prev.type = "button";
        prev.textContent = "Prev";
        prev.disabled = page <= 1;
        prev.addEventListener("click", () => {
          page -= 1;
          render();
        });
        pager.appendChild(prev);
        for (let i = 1; i <= pages; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = String(i);
          if (i === page) b.className = "is-active";
          b.addEventListener("click", () => {
            page = i;
            render();
          });
          pager.appendChild(b);
        }
        const next = document.createElement("button");
        next.type = "button";
        next.textContent = "Next";
        next.disabled = page >= pages;
        next.addEventListener("click", () => {
          page += 1;
          render();
        });
        pager.appendChild(next);
      }
      render();
    });
  }

  /* --------------------------------------------------------------------------
     Blog single — load cover + copy from ?post=slug
     -------------------------------------------------------------------------- */
  const BLOG_POSTS = {
    "progressive-delivery": {
      title: "Designing progressive delivery at scale",
      excerpt: "Feature flags and canaries that match your risk appetite.",
      category: "Product",
      chip: "",
      image: "Images/blog-1.webp",
      date: "Oct 2, 2026",
      read: "6 min read",
      author: "Maya Chen",
      role: "CTO",
      avatar: "Images/team-2.webp",
      body: [
        "Progressive delivery is how platform teams ship without betting the error budget on a single cutover. At Stackly, we treat flags, canaries, and ownership as one signal—not three disconnected tools.",
        "Start with a clear blast radius. Each rollout should name the service, the owning squad, and the SLO it can burn. Graphite Signal attaches that metadata to every promotion so on-call sees the same story as product.",
        "Canaries only help if they fail closed. Wire automated abort on burn-rate alerts, then graduate traffic in deliberate stages. The goal is confidence you can measure—not a calendar commitment to “go live Friday.”",
        "When ownership is explicit, progressive delivery stops being a heroics ritual and becomes a paved path. That is the difference between shipping noise and shipping with signal."
      ]
    },
    "observability-deploy": {
      title: "Observability that follows the deploy",
      excerpt: "Link traces to release metadata automatically.",
      category: "Engineering",
      chip: "chip--teal",
      image: "Images/blog-2.webp",
      date: "Sep 18, 2026",
      read: "8 min read",
      author: "Priya Nair",
      role: "VP Platform",
      avatar: "Images/team-3.webp",
      body: [
        "Most incident timelines start with “what changed?” and end with a scramble across dashboards. Observability that follows the deploy answers that question before the page goes red.",
        "Annotate traces and metrics with release IDs, commit SHAs, and feature-flag states at deploy time. When burn alerts fire, responders land on the exact promotion that shifted the signal.",
        "Graphite Signal correlates CI metadata with runtime telemetry so you do not maintain a second spreadsheet of deploys. One story from commit to customer impact."
      ]
    },
    "finops-guardrails": {
      title: "FinOps guardrails for multi-cloud SaaS",
      excerpt: "Keep spend predictable as workloads grow.",
      category: "Cloud",
      chip: "chip--amber",
      image: "Images/blog-3.webp",
      date: "Sep 4, 2026",
      read: "5 min read",
      author: "Alex Rivera",
      role: "CEO",
      avatar: "Images/team-1.webp",
      body: [
        "Cloud spend drifts when guardrails live in a quarterly spreadsheet. Put policy next to the deploy—budgets, right-sizing hints, and idle cleanup that travel with every environment.",
        "Multi-cloud SaaS teams need the same signal across AWS, GCP, and Azure. Tagging standards and spend alerts should fire in the same place your release notes land.",
        "FinOps is not a finance-only ritual. When engineers see cost impact beside reliability, they make better tradeoffs without waiting for a month-end surprise."
      ]
    },
    "trunk-based": {
      title: "Trunk-based development in practice",
      excerpt: "Short-lived branches without sacrificing review quality.",
      category: "Engineering",
      chip: "chip--teal",
      image: "Images/blog-4.webp",
      date: "Aug 22, 2026",
      read: "7 min read",
      author: "Maya Chen",
      role: "CTO",
      avatar: "Images/team-2.webp",
      body: [
        "Trunk-based development works when preview environments and progressive delivery absorb risk—not when teams pretend long-lived branches are safer.",
        "Keep reviews tight: small diffs, clear ownership, and automated checks that catch the boring failures. Humans should spend time on design, not rebase theater.",
        "Pair short-lived branches with feature flags so incomplete work can merge without exposing customers. The trunk stays shippable; product decides when to open the gate."
      ]
    },
    "platform-roi": {
      title: "Measuring platform team ROI",
      excerpt: "Metrics executives actually care about.",
      category: "Product",
      chip: "",
      image: "Images/blog-5.webp",
      date: "Aug 9, 2026",
      read: "7 min read",
      author: "Jordan Ellis",
      role: "Head of Customer Success",
      avatar: "Images/team-4.webp",
      body: [
        "Platform ROI is not ticket count. Executives care about lead time, change failure rate, and how fast squads recover when something breaks.",
        "Pick a small set of outcome metrics, baseline them before a paved-path rollout, and report the delta after one or two quarters. Narrative without numbers will not survive budget season.",
        "Graphite Signal helps teams show the same velocity and reliability story product leaders already track—so platform work shows up as leverage, not overhead."
      ]
    },
    "k8s-rightsizing": {
      title: "Right-sizing Kubernetes without surprises",
      excerpt: "Autoscaling policies that respect your budget.",
      category: "Cloud",
      chip: "chip--amber",
      image: "Images/blog-6.webp",
      date: "Jul 28, 2026",
      read: "6 min read",
      author: "Priya Nair",
      role: "VP Platform",
      avatar: "Images/team-3.webp",
      body: [
        "Kubernetes waste usually hides in “just in case” requests and forgotten namespaces. Right-sizing starts with honest utilization, not a one-time spreadsheet scrub.",
        "Autoscaling without budget caps creates a different surprise. Pair HPA and cluster autoscaler policy with spend guardrails so scale-out stays intentional.",
        "Treat rightsizing as a continuous signal in your delivery loop—review it with the same cadence you review SLOs."
      ]
    },
    "customer-slos": {
      title: "Customer-facing SLOs that build trust",
      excerpt: "Translate reliability into language buyers understand.",
      category: "Product",
      chip: "",
      image: "Images/signal-shipping.webp",
      date: "Jul 14, 2026",
      read: "5 min read",
      author: "Alex Rivera",
      role: "CEO",
      avatar: "Images/team-1.webp",
      body: [
        "Internal SLOs rarely help a buyer. Customer-facing reliability language should map to journeys they recognize—checkout, login, API latency—not cluster CPU.",
        "Publish what you will burn budget to protect, and what you will not. Clarity builds more trust than a vague “99.9% everything” claim.",
        "When sales, success, and SRE share one reliability story, renewals get easier and escalations get quieter."
      ]
    },
    "preview-envs": {
      title: "Preview environments on every PR",
      excerpt: "Ephemeral stacks with realistic data boundaries.",
      category: "Engineering",
      chip: "chip--teal",
      image: "Images/signal-observability.webp",
      date: "Jun 30, 2026",
      read: "6 min read",
      author: "Maya Chen",
      role: "CTO",
      avatar: "Images/team-2.webp",
      body: [
        "Preview environments turn “works on my machine” into a shared URL reviewers can click. They also expire—so cost and drift stay under control.",
        "Seed data carefully. Realistic shapes without production secrets keep QA useful and compliance calm.",
        "Wire previews into your golden path so every PR gets the same path to feedback—no bespoke YAML for each squad."
      ]
    },
    "game-day": {
      title: "Game-day drills that actually stick",
      excerpt: "Runbooks your team will use when it matters.",
      category: "Cloud",
      chip: "chip--amber",
      image: "Images/signal-cloudops.webp",
      date: "Jun 12, 2026",
      read: "9 min read",
      author: "Priya Nair",
      role: "VP Platform",
      avatar: "Images/team-3.webp",
      body: [
        "Game days fail when they are theater. Design drills around real failure modes, real on-call rotations, and runbooks people will open at 2 a.m.",
        "Capture the gaps in the same place you store deploy history. A drill without follow-up tickets is a story you tell once.",
        "Repeat on a cadence. Muscle memory beats a binder that nobody has opened since last year’s audit."
      ]
    },
    "api-design": {
      title: "API design for internal platforms",
      excerpt: "Consistency patterns for developer portals.",
      category: "Engineering",
      chip: "chip--teal",
      image: "Images/process-flow.webp",
      date: "May 25, 2026",
      read: "8 min read",
      author: "Maya Chen",
      role: "CTO",
      avatar: "Images/team-2.webp",
      body: [
        "Internal platform APIs succeed when they feel boring—predictable auth, pagination, and error shapes across every self-service action.",
        "Document the happy path in the portal, not a wiki graveyard. Examples and copy-paste snippets beat abstract OpenAPI alone.",
        "Version with empathy. Breaking changes need a paved migration, not a Slack apology."
      ]
    },
    "roadmap-alignment": {
      title: "Aligning platform roadmaps with product bets",
      excerpt: "Quarterly planning without siloed backlogs.",
      category: "Product",
      chip: "",
      image: "Images/office-collab.webp",
      date: "May 8, 2026",
      read: "6 min read",
      author: "Jordan Ellis",
      role: "Head of Customer Success",
      avatar: "Images/team-4.webp",
      body: [
        "Platform roadmaps drift when they optimize for internal elegance instead of product bets. Start planning from the customer outcomes product is already funding.",
        "Share one capacity picture. When platform and product see the same constraints, tradeoffs get honest faster.",
        "Review jointly every quarter. Golden paths that do not unlock a product milestone rarely survive the next budget cycle."
      ]
    },
    "carbon-aware": {
      title: "Carbon-aware batch scheduling",
      excerpt: "Shift non-urgent jobs to greener windows.",
      category: "Cloud",
      chip: "chip--amber",
      image: "Images/feature-cloud.webp",
      date: "Apr 19, 2026",
      read: "5 min read",
      author: "Alex Rivera",
      role: "CEO",
      avatar: "Images/team-1.webp",
      body: [
        "Not every batch job needs to run at peak carbon intensity. Carbon-aware scheduling shifts deferrable work into greener windows without missing business SLAs.",
        "Start with jobs that already tolerate delay—reports, reindexes, ML training—then measure energy and cost deltas together.",
        "Sustainability becomes real when it shows up next to FinOps and reliability, not as a side project."
      ]
    }
  };

  function initBlogSingle() {
    const root = document.querySelector("[data-blog-single]");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("post") || "progressive-delivery";
    const post = BLOG_POSTS[slug] || BLOG_POSTS["progressive-delivery"];

    document.title = post.title + " | Stackly Technology";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", post.excerpt);

    const img = root.querySelector("[data-post-image]");
    if (img) {
      img.src = post.image;
      img.alt = post.title;
    }

    const chip = root.querySelector("[data-post-chip]");
    if (chip) {
      chip.textContent = post.category;
      chip.className = "chip" + (post.chip ? " " + post.chip : "");
    }

    const setText = (sel, value) => {
      const el = root.querySelector(sel);
      if (el) el.textContent = value;
    };

    setText("[data-post-title]", post.title);
    setText("[data-post-excerpt]", post.excerpt);
    setText("[data-post-author]", post.author);
    setText("[data-post-role]", post.role);
    setText("[data-post-date]", post.date);
    setText("[data-post-read]", post.read);

    const avatar = root.querySelector("[data-post-avatar]");
    if (avatar) {
      avatar.src = post.avatar;
      avatar.alt = post.author;
    }

    const body = root.querySelector("[data-post-body]");
    if (body) {
      body.innerHTML = post.body.map((p) => "<p>" + p + "</p>").join("");
    }
  }

  /* --------------------------------------------------------------------------
     Year stamp
     -------------------------------------------------------------------------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* --------------------------------------------------------------------------
     404 — browser history back
     -------------------------------------------------------------------------- */
  function initGoBack() {
    document.querySelectorAll("[data-go-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "index.html";
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPreloader();
    initHeader();
    initActiveNav();
    initAOS();
    initSliders();
    initFaq();
    initForms();
    initPasswordToggle();
    initBlog();
    initBlogSingle();
    initDashboard();
    initTablePagination();
    initYear();
    initGoBack();
  });
})();
