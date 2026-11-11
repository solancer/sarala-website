/* ============================================================
   SARALA — site behaviour
   Everything here is progressive enhancement: without it the page
   still reads top to bottom, every tab panel's poster shows the
   finished result, and every link works.
   ============================================================ */

const root = document.documentElement;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ---------- Reveal sections as they scroll in ---------- */
if (!REDUCED && "IntersectionObserver" in window) {
  root.classList.add("rv-on");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".rv").forEach((el) => io.observe(el));
}

/* ---------- Hero cards lean toward the pointer ---------- */
const cards = document.querySelector(".hero-cards");
if (cards && !REDUCED && matchMedia("(pointer: fine)").matches) {
  let raf = 0;
  cards.closest(".hero").addEventListener("pointermove", (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      cards.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      cards.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    });
  });
}

/* ---------- Recordings: play while on screen ----------
   Reduced motion: nothing autoplays; the play button starts a clip. */
const clips = $$("video[data-clip]");
const userPaused = new WeakSet();
const winOf = (v) => v.closest(".win");
const setPaused = (v, paused) => {
  const w = winOf(v);
  w?.classList.toggle("paused", paused);
  const btn = w?.querySelector(".play");
  const label = v.getAttribute("aria-label") || "recording";
  btn?.setAttribute("aria-label", `${paused ? "Play" : "Pause"}: ${label}`);
};
const tryPlay = (v) => {
  if (v.preload === "none") v.preload = "auto";
  const p = v.play();
  if (p) p.catch(() => setPaused(v, true));
};
clips.forEach((v) => {
  setPaused(v, true);
  v.addEventListener("play", () => setPaused(v, false));
  v.addEventListener("pause", () => setPaused(v, true));
  winOf(v)?.querySelector(".play")?.addEventListener("click", () => {
    if (v.paused) { userPaused.delete(v); if (v.ended) v.currentTime = 0; tryPlay(v); }
    else { userPaused.add(v); v.pause(); }
  });
});
const visible = new WeakSet();
const isShown = (v) => !v.closest("[hidden]");
if ("IntersectionObserver" in window) {
  const vio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        visible.add(v);
        if (!REDUCED && !userPaused.has(v) && isShown(v) && !v.ended) tryPlay(v);
      } else {
        visible.delete(v);
        if (!v.paused) v.pause();
      }
    }
  }, { threshold: 0.35 });
  clips.forEach((v) => vio.observe(v));
}

/* ---------- Tabs (WAI-ARIA pattern, arrow keys move) ---------- */
function tabs(list, onSelect) {
  const items = $$('[role="tab"]', list);
  const select = (tab, focus = false, auto = false) => {
    for (const t of items) {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
    onSelect?.(tab, auto);
  };
  items.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const n = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (e.key === "Home" || e.key === "End") { e.preventDefault(); select(items[e.key === "Home" ? 0 : items.length - 1], true); return; }
      if (!n) return;
      e.preventDefault();
      select(items[(i + n + items.length) % items.length], true);
    });
  });
  return { items, select };
}

/* Rich content: each tab's recording plays through, then the next tab
   takes over. A thin bar under the tab shows how far along it is. */
const richList = document.querySelector('[data-tabs="rich"]');
if (richList) {
  const panelVideo = (tab) => document.getElementById(tab.getAttribute("aria-controls"))?.querySelector("video");
  const rich = tabs(richList, (tab) => {
    for (const t of rich.items) {
      const v = panelVideo(t);
      if (!v) continue;
      if (t === tab) {
        v.currentTime = 0;
        userPaused.delete(v);
        if (!REDUCED && visible.has(v)) tryPlay(v);
      } else {
        v.pause();
        t.style.setProperty("--p", "0%");
      }
    }
  });
  for (const t of rich.items) {
    const v = panelVideo(t);
    if (!v) continue;
    v.addEventListener("timeupdate", () => {
      if (v.duration) t.style.setProperty("--p", `${(v.currentTime / v.duration) * 100}%`);
    });
    v.addEventListener("ended", () => {
      t.style.setProperty("--p", "100%");
      if (REDUCED) return;
      const next = rich.items[(rich.items.indexOf(t) + 1) % rich.items.length];
      setTimeout(() => { if (t.getAttribute("aria-selected") === "true") rich.select(next, false, true); }, 900);
    });
  }
  // The strip under the hero links straight to a tab.
  $$("[data-open-tab]").forEach((a) => a.addEventListener("click", () => {
    const tab = document.getElementById(a.dataset.openTab);
    if (tab) rich.select(tab);
  }));
}

/* Install help, with deep links like #help-mac or #macos-first-launch. */
const helpList = document.querySelector('[data-tabs="help"]');
if (helpList) {
  const help = tabs(helpList);
  const openFromHash = () => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    const panel = target?.closest?.(".help-panel");
    const tab = panel && document.getElementById(panel.getAttribute("aria-labelledby"));
    if (tab) { help.select(tab); requestAnimationFrame(() => target.scrollIntoView({ block: "start" })); }
  };
  addEventListener("hashchange", openFromHash);
  openFromHash();
  $$('a[href^="#help-"]').forEach((a) => a.addEventListener("click", () => setTimeout(openFromHash)));

  /* ---------- Your platform first ---------- */
  const ua = navigator.userAgent;
  const os = /Mac|iPhone|iPad/.test(ua) ? "mac" : /Win/.test(ua) ? "win" : /Linux|X11|CrOS/.test(ua) && !/Android/.test(ua) ? "linux" : null;
  if (os) {
    document.querySelector(`.pf[data-os="${os}"]`)?.classList.add("is-you");
    if (!location.hash) { const t = document.getElementById(`help-tab-${os}`); if (t) help.select(t); }
  }
}

/* ---------- Copy buttons ---------- */
const status = document.getElementById("copy-status");
$$(".copy-btn").forEach((btn) => btn.addEventListener("click", async () => {
  const src = document.querySelector(btn.dataset.copy);
  if (!src) return;
  const text = $$("code", src).map((c) => c.textContent.trim()).join("\n") || src.textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    if (status) status.textContent = "Command copied to the clipboard";
  } catch {
    btn.textContent = "Select and copy";
  }
  setTimeout(() => { btn.textContent = "Copy"; }, 1800);
}));
