/* ============================================================
   SARALA website: interactions
   Everything here is progressive enhancement; the page reads
   fine without it.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- THEME SWITCHING ---------- */
  var THEMES = ["pro", "classic", "octagon", "machine", "ristretto", "spectrum", "paper"];
  var STORE = "sarala-theme";

  function applyTheme(name, persist) {
    if (THEMES.indexOf(name) === -1) name = "classic";
    document.documentElement.setAttribute("data-theme", name);
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute("content", name === "paper" ? "#f3eee3" : "#221f22");
    if (persist !== false) {
      try { localStorage.setItem(STORE, name); } catch (e) {}
    }
    document.querySelectorAll("[data-set-theme]").forEach(function (el) {
      el.setAttribute("aria-pressed", el.getAttribute("data-set-theme") === name ? "true" : "false");
    });
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-set-theme]");
    if (t) applyTheme(t.getAttribute("data-set-theme"), true);
  });

  var saved = "classic";
  try { saved = localStorage.getItem(STORE) || "classic"; } catch (e) {}
  applyTheme(saved, false);

  /* ---------- NAV: border once the page scrolls ---------- */
  var nav = document.querySelector(".nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- HERO: Markdown symbols drifting up the grid ---------- */
  var glyphHost = document.getElementById("hero-glyphs");
  if (glyphHost) {
    var GLYPHS = ["#", "*", "_", ">", "`", "-", "[ ]", "##", "**", "~~", "1.", "|"];
    var GCOLORS = ["var(--red)", "var(--orange)", "var(--yellow)", "var(--green)", "var(--blue)", "var(--purple)"];
    for (var g = 0; g < 16; g++) {
      var sp = document.createElement("span");
      sp.textContent = GLYPHS[g % GLYPHS.length];
      sp.style.left = (4 + Math.random() * 92) + "%";
      sp.style.top = (Math.random() * 100) + "%";
      sp.style.fontSize = (15 + Math.random() * 30) + "px";
      sp.style.color = GCOLORS[g % GCOLORS.length];
      sp.style.setProperty("--dur", (11 + Math.random() * 9).toFixed(1) + "s");
      sp.style.setProperty("--del", (-Math.random() * 14).toFixed(1) + "s");
      glyphHost.appendChild(sp);
    }
  }

  /* ---------- FEATURE TOUR: advance on its own until the visitor takes over ----------
     WCAG 2.2.2: pauses on hover, focus, when off-screen or in a hidden tab,
     stops for good once a feature is picked, and never runs with reduced motion. */
  var flow = document.querySelector(".flow");
  if (flow && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var flowTabs = Array.prototype.slice.call(flow.querySelectorAll('[role="tab"]'));
    var DUR = 6000, timer = 0, startedAt = 0, left = DUR, stopped = false, visible = false, hovering = false, focused = false;
    flow.style.setProperty("--flow-dur", DUR / 1000 + "s");
    function current() { return flowTabs.findIndex(function (t) { return t.getAttribute("aria-selected") === "true"; }); }
    function restartBar() {
      var bar = flowTabs[current()].querySelector(".flow-progress span");
      if (!bar) return;
      bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
    }
    function advance() {
      var next = flowTabs[(current() + 1) % flowTabs.length];
      next.dataset.auto = "1"; next.click(); delete next.dataset.auto;
      left = DUR; restartBar(); schedule();
    }
    function schedule() {
      clearTimeout(timer);
      var run = !stopped && visible && !hovering && !focused && !document.hidden;
      flow.classList.toggle("playing", !stopped);
      flow.classList.toggle("paused", !run);
      if (!run) return;
      startedAt = Date.now();
      timer = setTimeout(advance, left);
    }
    function pause() { if (startedAt && !flow.classList.contains("paused")) left = Math.max(0, left - (Date.now() - startedAt)); schedule(); }
    flowTabs.forEach(function (t) {
      t.addEventListener("click", function () { if (!t.dataset.auto) { stopped = true; clearTimeout(timer); flow.classList.remove("playing"); } });
    });
    flow.addEventListener("pointerenter", function () { hovering = true; pause(); });
    flow.addEventListener("pointerleave", function () { hovering = false; schedule(); });
    flow.addEventListener("focusin", function () { focused = true; pause(); });
    flow.addEventListener("focusout", function () { focused = false; schedule(); });
    document.addEventListener("visibilitychange", function () { document.hidden ? pause() : schedule(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? schedule() : pause(); }, { threshold: 0.4 }).observe(flow);
    } else { visible = true; schedule(); }
  }

  /* ---------- #themes lives in a tab panel: open it when linked to ---------- */
  function openThemes() {
    if (location.hash !== "#themes") return;
    var tab = document.getElementById("flow-tab-themes");
    if (!tab) return;
    tab.click();
    var flow = tab.closest(".flow");
    if (flow) requestAnimationFrame(function () { flow.scrollIntoView({ block: "center" }); });
  }
  window.addEventListener("hashchange", openThemes);

  /* ---------- HERO STAGE: fan the windows out once the page settles ---------- */
  var stage = document.querySelector(".stage");
  if (stage) {
    var fan = function () { setTimeout(function () { stage.classList.add("fanned"); }, 350); };
    if (document.readyState === "complete") fan(); else window.addEventListener("load", fan);
  }

  /* ---------- VISITOR'S OS (hero button + download picker) ---------- */
  var probe = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "") +
              " " + (navigator.userAgent || "");
  var detectedOS = null;
  if (/Android|iPhone|iPad|iPod/i.test(probe)) detectedOS = null; // no mobile build
  else if (/Win/i.test(probe)) detectedOS = "win";
  else if (/Mac/i.test(probe)) detectedOS = "mac";
  else if (/Linux|X11|CrOS/i.test(probe)) detectedOS = "linux";
  var OS_LABEL = { mac: "macOS", win: "Windows", linux: "Linux" };
  var heroDl = document.getElementById("hero-dl");
  if (heroDl && detectedOS) {
    heroDl.querySelector("span").textContent = "Download for " + OS_LABEL[detectedOS];
  }

  /* ---------- SHOWCASE TABS (WAI-ARIA tabs pattern) ---------- */
  document.querySelectorAll('[role="tablist"].tabs, [role="tablist"].flow-list').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next, true);
      });
    });
  });

  /* ---------- DOWNLOAD: highlight the visitor's platform, open its install help ---------- */
  var helpOS = detectedOS || "mac";
  if (detectedOS) {
    var mine = document.querySelector('.pcard[data-os="' + detectedOS + '"]');
    if (mine) mine.classList.add("is-you");
  }
  function openHelp(os) {
    var tab = document.getElementById("help-tab-" + os);
    if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
  }
  openHelp(helpOS);
  // In-page links into a help panel (#help-mac from the Homebrew link, or the
  // long-standing /#macos-first-launch deep link) open the right tab first.
  function followHelpHash() {
    var h = location.hash.slice(1);
    var os = /^(help-mac|macos-first-launch|macos-homebrew)$/.test(h) ? "mac" : h === "help-win" ? "win" : h === "help-linux" ? "linux" : null;
    if (!os) return;
    openHelp(os);
    var target = document.getElementById(h);
    if (target) requestAnimationFrame(function () { target.scrollIntoView({ block: "start" }); });
  }
  window.addEventListener("hashchange", followHelpHash);
  followHelpHash();

  /* ---------- LIGHTBOX for every [data-zoom] screenshot ---------- */
  var lb = document.getElementById("lightbox");
  var zooms = Array.prototype.slice.call(document.querySelectorAll("[data-zoom]"));
  if (lb && zooms.length) {
    var lbImg = document.getElementById("lb-img");
    var lbCap = document.getElementById("lb-cap");
    var current = 0;
    var opener = null;

    function show(i) {
      current = (i + zooms.length) % zooms.length;
      var img = zooms[current].querySelector("img");
      var fig = zooms[current].closest("figure");
      var cap = fig && fig.querySelector("figcaption");
      lbImg.src = img.getAttribute("src");
      lbImg.alt = img.getAttribute("alt") || "";
      lbCap.textContent = cap ? cap.textContent : (img.getAttribute("alt") || "");
    }
    function open(i) {
      opener = document.activeElement;
      show(i);
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add("open"); });
      document.body.style.overflow = "hidden";
      lb.querySelector(".lb-close").focus();
    }
    function close() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { lb.hidden = true; lbImg.src = ""; }, 220);
      if (opener && opener.focus) opener.focus();
    }

    zooms.forEach(function (z, i) { z.addEventListener("click", function () { open(i); }); });
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.closest(".lb-close")) close();
    });
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); show(current - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); show(current + 1); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
      else if (e.key === "Tab") {
        // keep focus inside the dialog
        var f = Array.prototype.slice.call(lb.querySelectorAll("button"));
        var idx = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }
  openThemes();
})();
