/* ============================================================
   SARALA — interactions
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
      el.classList.toggle("active", el.getAttribute("data-set-theme") === name);
    });
    document.querySelectorAll(".theme-card").forEach(function (el) {
      el.classList.toggle("current", el.getAttribute("data-set-theme") === name);
    });
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-set-theme]");
    if (t) { applyTheme(t.getAttribute("data-set-theme"), true); }
  });

  var saved = "classic";
  try { saved = localStorage.getItem(STORE) || "classic"; } catch (e) {}
  applyTheme(saved, false);

  /* ---------- NAV scrolled state ---------- */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- SCROLL REVEAL (manual, robust in embedded iframes) ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  revealEls.forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i % 6, 5) * 55) + "ms";
  });
  function checkReveal() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = revealEls.length - 1; i >= 0; i--) {
      var el = revealEls[i];
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        el.classList.add("in");
        (function (node) {
          // safety net: if the transition can't run (paused timeline),
          // force the final visible state after the transition window.
          setTimeout(function () { node.classList.add("settled"); }, 760);
        })(el);
        revealEls.splice(i, 1);
      }
    }
  }
  window.addEventListener("scroll", checkReveal, { passive: true });
  window.addEventListener("resize", checkReveal);
  checkReveal();
  // safety nets: ensure nothing stays hidden in any environment
  setTimeout(checkReveal, 250);
  setTimeout(function () {
    document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < (window.innerHeight || 800)) { el.classList.add("in"); }
    });
  }, 600);
  // Deep-links / nav-jumps to an in-page anchor (e.g. #download) smooth-scroll
  // to a target whose .reveal content may still be hidden once scrolling stops.
  // Re-run checkReveal for a beat after any hash navigation so it can't stay blank.
  function revealBurst() {
    var n = 0;
    var id = setInterval(function () { checkReveal(); if (++n > 14) clearInterval(id); }, 90);
  }
  window.addEventListener("hashchange", revealBurst);
  if (location.hash && location.hash.length > 1) { setTimeout(revealBurst, 60); }

  /* ---------- HERO TYPING DEMO ---------- */
  // Each step: {type:"type", el, segs:[{t,c}], speed} or {type:"show", el}
  var editor = document.getElementById("hero-editor");
  if (editor) {
    var blocks = Array.prototype.slice.call(editor.querySelectorAll("[data-block]"));
    // stash target html + hide
    blocks.forEach(function (b) {
      b._typeSegs = b.getAttribute("data-segs");
      b.style.opacity = "0";
    });

    var caret = document.createElement("span");
    caret.className = "caret";

    function renderSegs(segsJSON, n) {
      var segs;
      try { segs = JSON.parse(segsJSON); } catch (e) { return ""; }
      var out = "", count = 0;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i], txt = s.t;
        if (n !== undefined) {
          if (count >= n) break;
          var take = Math.min(txt.length, n - count);
          txt = txt.slice(0, take);
          count += take;
        }
        var open = s.c ? '<span class="' + s.c + '">' : "";
        var close = s.c ? "</span>" : "";
        out += open + escapeHtml(txt) + close;
        if (n !== undefined && count >= n) break;
      }
      return out;
    }
    function totalLen(segsJSON) {
      try {
        return JSON.parse(segsJSON).reduce(function (a, s) { return a + s.t.length; }, 0);
      } catch (e) { return 0; }
    }
    function escapeHtml(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function typeBlock(b, done) {
      b.style.opacity = "1";
      var segs = b._typeSegs;
      if (!segs) { // complex prebuilt block, just reveal
        b.appendChild(caret);
        setTimeout(function () { if (caret.parentNode === b) b.removeChild(caret); done(); }, 360);
        return;
      }
      var total = totalLen(segs), n = 0;
      b.innerHTML = "";
      b.appendChild(caret);
      var speed = 16;
      function tick() {
        n++;
        b.innerHTML = renderSegs(segs, n);
        b.appendChild(caret);
        if (n < total) {
          // vary speed slightly for natural feel
          setTimeout(tick, speed + (Math.random() * 22));
        } else {
          setTimeout(done, 220);
        }
      }
      tick();
    }

    var idx = 0;
    function runSeq() {
      if (idx >= blocks.length) {
        if (caret.parentNode) caret.parentNode.removeChild(caret);
        return;
      }
      var b = blocks[idx++];
      typeBlock(b, runSeq);
    }

    var started = false;
    function startHero() {
      if (started) return;
      started = true;
      setTimeout(runSeq, 400);
    }
    // hero is above the fold — start shortly after load
    setTimeout(startHero, 650);
  }

  /* ---------- COMPARE TOGGLE (source / rendered) ---------- */
  document.querySelectorAll("[data-compare]").forEach(function (wrap) {
    var btns = wrap.querySelectorAll(".flip-toggle button");
    var src = wrap.querySelector(".src-view");
    var rendered = wrap.querySelector(".rendered-view");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        var mode = btn.getAttribute("data-mode");
        if (src) src.style.display = mode === "src" ? "block" : "none";
        if (rendered) rendered.style.display = mode === "rendered" ? "block" : "none";
      });
    });
  });

  /* ---------- HERO FLOATING GLYPHS ---------- */
  var glyphHost = document.getElementById("hero-glyphs");
  if (glyphHost) {
    var GLYPHS = ["#", "*", "_", ">", "`", "-", "[ ]", "##", "**", "~~", "1.", "|"];
    var GCOLORS = ["var(--red)", "var(--orange)", "var(--yellow)", "var(--green)", "var(--blue)", "var(--purple)"];
    var N = 16;
    for (var i = 0; i < N; i++) {
      var s = document.createElement("span");
      s.textContent = GLYPHS[i % GLYPHS.length];
      s.style.left = (4 + Math.random() * 92) + "%";
      s.style.top = (Math.random() * 100) + "%";
      s.style.fontSize = (15 + Math.random() * 30) + "px";
      s.style.color = GCOLORS[i % GCOLORS.length];
      s.style.setProperty("--dur", (11 + Math.random() * 9).toFixed(1) + "s");
      s.style.setProperty("--del", (-Math.random() * 14).toFixed(1) + "s");
      glyphHost.appendChild(s);
    }
  }

  /* ---------- typewriter mini in bento ---------- */
  var tw = document.getElementById("tw-line");
  if (tw) {
    var phrases = ["The cursor stays centered.", "Your eyes never move.", "Just keep writing."];
    var pi = 0, ci = 0, deleting = false;
    function twTick() {
      var p = phrases[pi];
      tw.textContent = p.slice(0, ci);
      if (!deleting) {
        ci++;
        if (ci > p.length) { deleting = true; setTimeout(twTick, 1400); return; }
        setTimeout(twTick, 55);
      } else {
        ci--;
        if (ci < 0) { deleting = false; ci = 0; pi = (pi + 1) % phrases.length; setTimeout(twTick, 300); return; }
        setTimeout(twTick, 28);
      }
    }
    var twStarted = false;
    function startTw() {
      if (twStarted) return;
      var r = tw.getBoundingClientRect();
      if (r.top < (window.innerHeight || 800) * 1.1) { twStarted = true; twTick(); }
    }
    window.addEventListener("scroll", startTw, { passive: true });
    setTimeout(startTw, 800);
  }

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
    }

    osBtns.forEach(function (b) {
      b.addEventListener("click", function () { selectOS(b.getAttribute("data-os")); });
    });

    // auto-detect the visitor's OS
    var probe = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "") +
                " " + (navigator.userAgent || "");
    var os = "mac"; // sensible default
    if (/Win/i.test(probe)) os = "win";
    else if (/Mac|iPhone|iPad|iPod/i.test(probe)) os = "mac";
    else if (/Linux|X11|Ubuntu|Debian|Fedora|CrOS/i.test(probe) && !/Android/i.test(probe)) os = "linux";
    selectOS(os);
  }

  /* ---------- SCREENSHOTS CAROUSEL + LIGHTBOX ---------- */
  var track = document.getElementById("shots-track");
  if (track) {
    var shots = Array.prototype.slice.call(track.querySelectorAll(".shot"));
    var dotsWrap = document.getElementById("shots-dots");
    var prevBtn = document.querySelector(".shots-nav.prev");
    var nextBtn = document.querySelector(".shots-nav.next");

    var dots = shots.map(function (s, i) {
      var d = document.createElement("button");
      d.setAttribute("aria-label", "Go to screenshot " + (i + 1));
      d.addEventListener("click", function () { scrollToShot(i); });
      dotsWrap.appendChild(d);
      return d;
    });

    function currentIndex() {
      var c = track.scrollLeft + track.clientWidth / 2;
      var best = 0, bestDist = Infinity;
      shots.forEach(function (s, i) {
        var center = s.offsetLeft + s.offsetWidth / 2;
        var dist = Math.abs(center - c);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    }
    function updateDots() {
      var idx = currentIndex();
      dots.forEach(function (d, i) { d.classList.toggle("on", i === idx); });
    }
    function scrollToShot(i) {
      i = Math.max(0, Math.min(shots.length - 1, i));
      var s = shots[i];
      track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2, behavior: "smooth" });
    }
    if (prevBtn) prevBtn.addEventListener("click", function () { scrollToShot(currentIndex() - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { scrollToShot(currentIndex() + 1); });
    var craf;
    track.addEventListener("scroll", function () {
      if (craf) cancelAnimationFrame(craf);
      craf = requestAnimationFrame(updateDots);
    }, { passive: true });
    updateDots();

    // ----- lightbox -----
    var lb = document.getElementById("lightbox");
    var lbImg = document.getElementById("lb-img");
    var lbCap = document.getElementById("lb-cap");
    var lbIndex = 0;
    var dragged = false;

    function openLb(i) {
      lbIndex = ((i % shots.length) + shots.length) % shots.length;
      var s = shots[lbIndex];
      var img = s.querySelector("img");
      var cap = s.querySelector("figcaption");
      lbImg.src = s.getAttribute("data-full") || img.getAttribute("src");
      lbImg.alt = img.getAttribute("alt") || "";
      lbCap.textContent = cap ? cap.textContent : "";
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add("open"); });
      document.body.style.overflow = "hidden";
    }
    function closeLb() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { lb.hidden = true; lbImg.src = ""; }, 260);
    }
    function lbGo(dir) { openLb(lbIndex + dir); scrollToShot(((lbIndex % shots.length) + shots.length) % shots.length); }

    // distinguish a click from a swipe/drag on the track
    track.addEventListener("pointerdown", function () { dragged = false; }, { passive: true });
    track.addEventListener("pointermove", function (e) { if (e.buttons) dragged = true; }, { passive: true });
    shots.forEach(function (s, i) {
      s.addEventListener("click", function () { if (!dragged) openLb(i); });
    });

    if (lb) {
      lb.addEventListener("click", function (e) {
        if (e.target === lb || e.target.closest(".lb-close")) closeLb();
      });
      var lbPrev = lb.querySelector(".lb-prev");
      var lbNext = lb.querySelector(".lb-next");
      if (lbPrev) lbPrev.addEventListener("click", function (e) { e.stopPropagation(); lbGo(-1); });
      if (lbNext) lbNext.addEventListener("click", function (e) { e.stopPropagation(); lbGo(1); });
      document.addEventListener("keydown", function (e) {
        if (lb.hidden) return;
        if (e.key === "Escape") closeLb();
        else if (e.key === "ArrowLeft") lbGo(-1);
        else if (e.key === "ArrowRight") lbGo(1);
      });
    }
  }

})();
