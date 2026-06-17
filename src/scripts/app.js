/* ============================================================
   SARALA — interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- THEME SWITCHING ---------- */
  var THEMES = ["pro", "classic", "octagon", "machine", "ristretto", "spectrum", "paper"];
  var STORE = "sarala-theme";

  function applyTheme(name, persist) {
    if (THEMES.indexOf(name) === -1) name = "pro";
    document.documentElement.setAttribute("data-theme", name);
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

  var saved = "pro";
  try { saved = localStorage.getItem(STORE) || "pro"; } catch (e) {}
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

})();
