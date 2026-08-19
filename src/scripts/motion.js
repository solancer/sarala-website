/* ============================================================
   SARALA — motion layer (motion.dev)

   Everything in here is progressive enhancement: the page is
   fully usable, readable and navigable if this module never
   loads. `html.mo` tells the stylesheet that JS motion is live;
   a fallback timer in Layout.astro un-hides scroll-reveal
   content if it isn't.

   Every effect is skipped when the visitor asks for reduced
   motion — state still changes, it just changes instantly.
   ============================================================ */
import { animate, hover, inView, press, scroll, spring, stagger } from "motion";

const root = document.documentElement;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

root.classList.add("mo");
if (REDUCED) root.classList.add("mo-reduced");

/* Springs used across the site, so motion feels like one system. */
const SNAP = { type: spring, stiffness: 520, damping: 34, mass: 0.8 };
const GLIDE = { type: spring, stiffness: 260, damping: 30, mass: 0.9 };
const EASE = [0.2, 0.7, 0.2, 1];

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

/** Run a block without letting one broken effect take down the rest. */
function safely(name, fn) {
  try { fn(); } catch (err) { console.warn("[motion] " + name + " skipped:", err); }
}

/** Instant when reduced motion is on, animated otherwise. */
function move(el, keyframes, options) {
  if (!el || (el.length === 0 && el.nodeType === undefined)) return null;
  return animate(el, keyframes, REDUCED ? { duration: 0 } : options);
}

/* Animations freeze while a tab sits in the background, which can strand a
   transition halfway. Every choreographed change registers how to land on its
   final state; that lands on completion, on a timeout, or straight away if the
   page is hidden mid-flight. */
const pendingSettles = new Set();

/**
 * Land a transition on its end state no matter what.
 * `controls` are the running animations: they have to be completed rather
 * than merely overwritten, because a WAAPI animation keeps applying its
 * current frame on top of any inline style we set.
 */
function settleLater(controls, fn, ms) {
  function land() {
    if (!pendingSettles.has(land)) return;
    pendingSettles.delete(land);
    controls.forEach(function (c) {
      try { if (c && typeof c.complete === "function") c.complete(); } catch (err) { /* already done */ }
    });
    try { fn(); } catch (err) { /* nothing left to do */ }
  }
  pendingSettles.add(land);
  setTimeout(land, ms || 900);
  return land;
}

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    Array.from(pendingSettles).forEach(function (land) { land(); });
  }
});

/** Clear the inline styles an animation left behind. */
function clearInline(nodes) {
  (nodes.length === undefined ? [nodes] : Array.prototype.slice.call(nodes)).forEach(function (n) {
    if (!n) return;
    n.style.opacity = "";
    n.style.transform = "";
  });
}

/* ------------------------------------------------------------
   Scroll progress rail
   ------------------------------------------------------------ */
safely("progress rail", function () {
  if (REDUCED) return;
  const rail = document.createElement("div");
  rail.className = "mo-rail";
  rail.setAttribute("aria-hidden", "true");
  document.body.appendChild(rail);
  scroll(animate(rail, { scaleX: [0, 1] }, { ease: "linear" }));
});

/* ------------------------------------------------------------
   Scroll reveal
   Replaces the CSS-transition version: springs in, and staggers
   the children of any [data-stagger] container.
   ------------------------------------------------------------ */
safely("scroll reveal", function () {
  const items = $$(".reveal");
  if (!items.length) return;

  function show(el) {
    if (el.dataset.moShown) return;
    el.dataset.moShown = "1";
    el.classList.add("in", "settled");
    if (REDUCED) return;
    // `.settled` already paints the end state, so the keyframes below start
    // from an explicit 0 rather than from the computed style.

    const kids = el.hasAttribute("data-stagger")
      ? $$(":scope > *", el)
      : [];

    const running = [move(el, { opacity: [0, 1], y: [24, 0] }, { duration: 0.7, ease: EASE })];
    if (kids.length > 1) {
      running.push(move(kids, { opacity: [0, 1], y: [16, 0] }, {
        duration: 0.55,
        ease: EASE,
        delay: stagger(0.06, { startDelay: 0.08 }),
      }));
    }
    settleLater(running, function () { clearInline(el); clearInline(kids); }, 1600);
  }

  items.forEach(function (el) {
    inView(el, function () { show(el); }, { margin: "0px 0px -8% 0px" });
  });

  // Safety nets, matching the behaviour the CSS version had: nothing may
  // stay invisible because an observer misfired inside an embed or because
  // a hash jump landed past an element without ever crossing it.
  function sweep() {
    const vh = window.innerHeight || 800;
    items.forEach(function (el) {
      if (el.dataset.moShown) return;
      // Anything whose top has crossed the trigger line gets shown, including
      // content already scrolled past: a fast jump can skip an element between
      // scroll samples, and it must never be left invisible on the way back.
      if (el.getBoundingClientRect().top < vh * 1.05) show(el);
    });
  }
  window.addEventListener("hashchange", function () {
    let n = 0;
    const id = setInterval(function () { sweep(); if (++n > 14) clearInterval(id); }, 90);
  });
  window.addEventListener("resize", sweep);
  // A scroll sweep backs up the observer without ever revealing content the
  // visitor hasn't reached: `sweep` only shows what is actually near the
  // viewport. (If this module never loads at all, the inline fallback in
  // Layout.astro un-hides everything instead.)
  window.addEventListener("scroll", sweep, { passive: true });
  setTimeout(sweep, 400);
});

/* ------------------------------------------------------------
   Press feedback — everything clickable gives a little.
   ------------------------------------------------------------ */
safely("press feedback", function () {
  if (REDUCED) return;
  // Only controls whose hover state is *not* a CSS transform. Animating scale
  // here writes an inline transform, which would otherwise outrank rules like
  // `.theme-card:hover { transform: translateY(-4px) }` for good.
  const targets = ".dl-os, .gk-tab, .gk-ver, .gk-copy, .dl-all";
  press(targets, function (el) {
    el.setAttribute("data-motion", "");
    animate(el, { scale: 0.965 }, { duration: 0.12, ease: "easeOut" });
    return function () { animate(el, { scale: 1 }, SNAP); };
  });
});

/* ------------------------------------------------------------
   Magnetic call-to-action — the button leans toward the cursor.
   ------------------------------------------------------------ */
safely("magnetic buttons", function () {
  if (REDUCED || window.matchMedia("(pointer: coarse)").matches) return;

  $$("[data-magnetic]").forEach(function (el) {
    let raf = 0;

    function onMove(e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.setAttribute("data-motion", "");
        animate(el, { x: dx * 9, y: dy * 5, scale: 1.03 }, { duration: 0.25, ease: "easeOut" });
      });
    }

    hover(el, function () {
      el.addEventListener("pointermove", onMove);
      return function () {
        el.removeEventListener("pointermove", onMove);
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        animate(el, { x: 0, y: 0, scale: 1 }, GLIDE);
      };
    });
  });
});

/* ------------------------------------------------------------
   Pointer spotlight — panels pick up a soft highlight that
   tracks the cursor. Pure CSS custom properties, so it never
   fights a transform.
   ------------------------------------------------------------ */
safely("pointer spotlight", function () {
  if (REDUCED || window.matchMedia("(pointer: coarse)").matches) return;

  $$(".bento-cell, .theme-card").forEach(function (el) {
    el.classList.add("mo-lit");
    el.addEventListener("pointermove", function (e) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    }, { passive: true });
  });
});

/* ------------------------------------------------------------
   Hero parallax — the floating glyph field and the editor
   mockup drift at different rates as you scroll away.
   ------------------------------------------------------------ */
safely("hero parallax", function () {
  if (REDUCED) return;
  const glyphs = $("#hero-glyphs");
  const hero = $(".hero");
  if (!hero) return;

  if (glyphs) {
    scroll(animate(glyphs, { y: [0, -120], opacity: [1, 0.15] }, { ease: "linear" }), {
      target: hero,
      offset: ["start start", "end start"],
    });
  }
});

/* ------------------------------------------------------------
   Sliding thumb behind a segmented control.
   Shared by the OS picker, the Gatekeeper tabs and the macOS
   version chips so they all move with the same physics.
   ------------------------------------------------------------ */
function makeThumb(track, thumb, activeSelector) {
  if (!track || !thumb) return function () {};
  let first = true;

  function place() {
    const active = $(activeSelector, track);
    if (!active) return;
    const t = track.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    if (!a.width) return;

    const target = { x: a.left - t.left, width: a.width, height: a.height, opacity: 1 };
    thumb.style.top = a.top - t.top + "px";

    function land() {
      thumb.style.transform = "translateX(" + target.x + "px)";
      thumb.style.width = target.width + "px";
      thumb.style.height = target.height + "px";
      thumb.style.opacity = "1";
    }

    if (first || REDUCED) {
      first = false;
      land();
    } else {
      const run = animate(thumb, target, GLIDE);
      run.then(land);
      settleLater([run], land, 900);
    }
  }

  window.addEventListener("resize", place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  // A hidden track measures zero, so re-place whenever it becomes visible.
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(place).observe(track);
  place();
  return place;
}

/* ------------------------------------------------------------
   Download OS picker
   app.js owns the state; motion just moves the thumb.
   ------------------------------------------------------------ */
safely("os picker", function () {
  const picker = $("#dl-picker");
  const thumb = $("#dl-thumb");
  if (!picker || !thumb) return;

  const place = makeThumb(picker, thumb, ".dl-os.active");
  document.addEventListener("sarala:os", function () {
    requestAnimationFrame(place);
    if (REDUCED) return;
    const active = $(".dl-os.active", picker);
    if (active) animate(active.querySelector("svg"), { rotate: [-14, 0], scale: [0.8, 1] }, SNAP);
  });
});

/* ------------------------------------------------------------
   Copy-to-clipboard, with a sweep across the copied line
   ------------------------------------------------------------ */
safely("copy buttons", function () {
  $$("[data-copy]").forEach(function (btn) {
    const label = $(".gk-copy-label", btn) || btn.querySelector("span") || btn;
    const idle = label.textContent;
    const done = btn.getAttribute("data-copied-label") || "Copied";
    const status = $("#gk-copy-status");
    let timer;

    function paint(text, ok) {
      label.textContent = text;
      btn.classList.toggle("copied", !!ok);
      if (status) status.textContent = ok ? done : text;

      if (!REDUCED && ok) {
        const term = btn.closest(".gk-term");
        const sweep = term && $(".gk-sweep", term);
        if (sweep) animate(sweep, { scaleX: [0, 1], opacity: [0.9, 0] }, { duration: 0.75, ease: "easeOut" });
        animate(btn, { scale: [1, 1.06, 1] }, { duration: 0.4, ease: EASE });
      }

      clearTimeout(timer);
      timer = setTimeout(function () {
        label.textContent = idle;
        btn.classList.remove("copied");
        if (status) status.textContent = "";
      }, 2200);
    }

    btn.addEventListener("click", function () {
      const src = $(btn.getAttribute("data-copy"));
      if (!src) return;
      // Multi-line blocks (like the Homebrew tap/trust/install trio) mark each
      // command with .ln, so joining on newlines pastes as three real lines a
      // shell runs one after another, instead of one fused, broken command.
      const lines = $$(".ln", src);
      const text = lines.length
        ? lines.map(function (l) { return (l.textContent || "").trim(); }).join("\n")
        : (src.textContent || "").trim();

      // Legacy execCommand only counts as "triggered by a user gesture" -
      // and so is only allowed to run at all - while it's still inside the
      // synchronous call stack of this click handler. Running it later,
      // from inside a rejected clipboard.writeText() promise, silently
      // no-ops in several browsers, so it's attempted first and eagerly
      // rather than as an async fallback.
      function legacyCopy() {
        let ok = false;
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-9999px";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          ta.setSelectionRange(0, text.length);
          ok = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch (e) { ok = false; }
        return ok;
      }

      // Last resort when the browser/embedding context blocks scripted
      // clipboard access entirely (sandboxed iframes, strict Permissions
      // Policy, etc.): select the visible command text so ⌘C/Ctrl+C still
      // works by hand.
      function selectManually() {
        try {
          const range = document.createRange();
          range.selectNodeContents(src);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) { /* nothing more we can do */ }
      }

      if (legacyCopy()) {
        paint(done, true);
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { paint(done, true); },
          function () { selectManually(); paint("Press ⌘C", false); }
        );
      } else {
        selectManually();
        paint("Press ⌘C", false);
      }
    });
  });
});

/* ------------------------------------------------------------
   Gatekeeper card — tabbed methods with a height morph
   ------------------------------------------------------------ */
safely("gatekeeper card", function () {
  const card = $("#macos-first-launch");
  if (!card) return;

  /* --- the lock breathes once when the card comes into view --- */
  const sigil = $(".gk-sigil", card);
  if (sigil && !REDUCED) {
    inView(card, function () {
      animate(sigil, { scale: [0.86, 1] }, SNAP);
      animate($(".gk-sigil-ring", sigil), { scale: [0.7, 1.9], opacity: [0.55, 0] }, { duration: 1.4, ease: "easeOut" });
    }, { margin: "0px 0px -20% 0px" });
  }

  /* --- swap two siblings inside a stage, morphing its height --- */
  function swap(stage, from, to, dir) {
    if (from === to) return;
    const start = stage.offsetHeight;

    if (from) { from.hidden = true; from.classList.remove("on"); }
    to.hidden = false;
    to.classList.add("on");

    if (REDUCED) return;

    const end = stage.offsetHeight;
    const steps = $$(".gk-step", to);

    function land() {
      stage.style.height = "";
      stage.style.overflow = "";
      clearInline(to);
      clearInline(steps);
    }

    stage.style.overflow = "hidden";
    const running = [
      animate(stage, { height: [start + "px", end + "px"] }, GLIDE),
      animate(to, { opacity: [0, 1], x: [dir * 22, 0] }, { duration: 0.42, ease: EASE }),
    ];
    if (steps.length) {
      running.push(animate(steps, { opacity: [0, 1], y: [14, 0] }, {
        duration: 0.45,
        ease: EASE,
        delay: stagger(0.055, { startDelay: 0.06 }),
      }));
    }
    running[0].then(land);
    settleLater(running, land, 1100);
  }

  /* --- macOS version chips, declared first so the tab switch can re-place
         their thumb once the panel they live in becomes measurable --- */
  const vers = $$(".gk-ver", card);
  const verStage = $("#gk-verstage", card);
  const placeVer = makeThumb($("#gk-vers", card), $("#gk-vthumb", card), ".gk-ver.on");

  /* --- method tabs: one command / no Terminal --- */
  const tabs = $$(".gk-tab", card);
  const stage = $("#gk-stage", card);
  const tabThumb = $("#gk-thumb", card);
  const placeTab = makeThumb($("#gk-tabs", card), tabThumb, ".gk-tab.on");

  function selectTab(tab, focus) {
    const current = tabs.filter(function (t) { return t.classList.contains("on"); })[0];
    if (current === tab) return;
    const dir = tabs.indexOf(tab) > tabs.indexOf(current) ? 1 : -1;

    tabs.forEach(function (t) {
      const on = t === tab;
      t.classList.toggle("on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    placeTab();
    swap(stage, $("#" + current.getAttribute("aria-controls")), $("#" + tab.getAttribute("aria-controls")), dir);
    // The version chips live inside the panel we just revealed: their track
    // measured zero while it was hidden, so the thumb can only be placed now.
    // setTimeout rather than rAF, because rAF is parked in a background tab.
    setTimeout(placeVer, 0);
    setTimeout(placeVer, 420);
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (e) {
      const i = tabs.indexOf(tab);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length], true); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      else if (e.key === "Home") { e.preventDefault(); selectTab(tabs[0], true); }
      else if (e.key === "End") { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
    });
  });

  vers.forEach(function (chip) {
    chip.addEventListener("click", function () {
      const current = vers.filter(function (c) { return c.classList.contains("on"); })[0];
      if (current === chip) return;
      const dir = vers.indexOf(chip) > vers.indexOf(current) ? 1 : -1;

      vers.forEach(function (c) {
        const on = c === chip;
        c.classList.toggle("on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      placeVer();
      swap(
        verStage,
        $('[data-gk-verpanel="' + current.getAttribute("data-gk-ver") + '"]', verStage),
        $('[data-gk-verpanel="' + chip.getAttribute("data-gk-ver") + '"]', verStage),
        dir
      );
    });
  });

  /* --- step numbers pop on hover --- */
  if (!REDUCED) {
    hover(".gk-step", function (step) {
      const dot = $(".gk-dot", step);
      if (dot) animate(dot, { scale: 1.16 }, SNAP);
      return function () { if (dot) animate(dot, { scale: 1 }, GLIDE); };
    });
  }

  // The card is hidden until macOS is picked, so re-measure the thumbs then.
  document.addEventListener("sarala:os", function (e) {
    if (e.detail && e.detail.os === "mac") requestAnimationFrame(function () { placeTab(); placeVer(); });
  });
});
