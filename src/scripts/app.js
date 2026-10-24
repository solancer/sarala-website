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

  /* ---------- DOWNLOAD OS PICKER ---------- */
  var dlPicker = document.getElementById("dl-picker");
  if (dlPicker) {
    var dlCta = document.getElementById("dl-cta");
    var dlLabel = document.getElementById("dl-cta-label");
    var dlFile = document.getElementById("dl-file");
    var dlSize = document.getElementById("dl-size");
    var osBtns = Array.prototype.slice.call(dlPicker.querySelectorAll(".dl-os"));
    var altBlocks = Array.prototype.slice.call(document.querySelectorAll(".dl-alt"));

    function selectOS(os) {
      var matched = false;
      osBtns.forEach(function (b) {
        var on = b.getAttribute("data-os") === os;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        if (on) {
          matched = true;
          dlCta.href = b.getAttribute("data-href");
          dlLabel.textContent = "Download for " + b.getAttribute("data-label");
          dlFile.textContent = b.getAttribute("data-file");
          dlSize.textContent = b.getAttribute("data-size");
        }
      });
      if (!matched) return;
      altBlocks.forEach(function (a) {
        a.classList.toggle("on", a.getAttribute("data-os") === os);
      });
      document.dispatchEvent(new CustomEvent("sarala:os", { detail: { os: os } }));
    }

    osBtns.forEach(function (b, i) {
      b.addEventListener("click", function () { selectOS(b.getAttribute("data-os")); });
      // Roving-tabindex arrow keys, as a tablist is expected to behave.
      b.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = osBtns[(i + 1) % osBtns.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = osBtns[(i - 1 + osBtns.length) % osBtns.length];
        else if (e.key === "Home") next = osBtns[0];
        else if (e.key === "End") next = osBtns[osBtns.length - 1];
        if (!next) return;
        e.preventDefault();
        selectOS(next.getAttribute("data-os"));
        next.focus();
      });
    });

    // Preselect the visitor's OS (macOS when it can't be told, e.g. on a phone).
    var os = detectedOS || "mac";
    selectOS(os);

    // Deep link: /#macos-first-launch opens the Gatekeeper panel on any platform,
    // so release notes and support replies can point straight at it. The panel
    // starts hidden, so the browser's own hash jump never finds it.
    var docEl = document.documentElement;

    function aimAtNote(note, smooth) {
      // The page uses `scroll-behavior: smooth`, and everything above the panel
      // (lazy screenshots, reveal transforms) keeps resizing while a long
      // animated scroll is in flight, which lands us past the target. Jump
      // instantly instead, and re-aim as the layout settles.
      var prev = docEl.style.scrollBehavior;
      if (!smooth) docEl.style.scrollBehavior = "auto";
      // block:"start" + scroll-margin-top lands on the heading, clearing the
      // sticky nav; the panel is taller than a phone viewport.
      note.scrollIntoView({ block: "start" });
      if (!smooth) docEl.style.scrollBehavior = prev;
    }

    function openMacNote(smooth) {
      if (location.hash !== "#macos-first-launch") return;
      selectOS("mac");
      var note = document.getElementById("macos-first-launch");
      if (!note) return;
      requestAnimationFrame(function () { aimAtNote(note, smooth); });
      if (smooth) return;
      window.addEventListener("load", function () {
        aimAtNote(note, false);
        setTimeout(function () { aimAtNote(note, false); }, 400);
      });
    }
    window.addEventListener("hashchange", function () { openMacNote(true); });
    openMacNote(false);
  }

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
