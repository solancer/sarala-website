// Records the site's product clips from the real Sarala web app.
//
// 1. In the sarala repo: pnpm build:web && (cd web && pnpm preview)   -> http://localhost:1422
// 2. Here: node scripts/record-clips.mjs [scene...]
//
// Each scene drives real Chrome through Playwright (from the sarala repo's
// node_modules, or PLAYWRIGHT=/path/to/playwright/index.mjs), captures 2x
// JPEG frames as fast as Chrome serves them, and encodes public/video/<name>.mp4
// (H.264, 30 fps) plus <name>.webp, the finished last frame, as its poster.
// Needs ffmpeg and cwebp on PATH. HEADED=1 shows the browser.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT || join(here, "../../sarala/node_modules/playwright/index.mjs"));
const OUT = join(here, "../public/video");
const WORK = join(tmpdir(), "sarala-clips");
const ONLY = process.argv.slice(2);
const APP = process.env.APP || "http://localhost:1422/";
mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A drawn cursor, since the screencast has none.
const CURSOR = `(() => {
  const c = document.createElement('div');
  c.id = '__cur';
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L9.5 19z" fill="#29251f" stroke="#fffefa" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .12s ease', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' });
  document.documentElement.appendChild(c);
  addEventListener('mousemove', e => { c.style.left = (e.clientX - 4) + 'px'; c.style.top = (e.clientY - 2) + 'px'; }, true);
  addEventListener('mousedown', () => c.style.transform = 'scale(.85)', true);
  addEventListener('mouseup', () => c.style.transform = '', true);
})()`;

async function scene(name, { w = 1280, h = 800, sidebar = true }, body) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const browser = await chromium.launch({ channel: "chrome", headless: process.env.HEADED ? false : true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const p = await ctx.newPage();
  await p.goto(APP, { waitUntil: "load" });
  await sleep(1800);
  await p.evaluate(CURSOR);
  if (!sidebar) await p.getByRole("button", { name: "Toggle sidebar" }).first().click();
  await p.getByRole("button", { name: "New file" }).first().click({ force: true }).catch(async () => {
    await p.keyboard.press("Meta+n");
  });
  await sleep(600);
  await p.mouse.move(w * 0.78, h * 0.72);

  const frames = join(WORK, `${name}-frames`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames);
  const cdp = await ctx.newCDPSession(p);
  const list = [];
  let recording = true;
  const t0 = Date.now();
  const loop = (async () => {
    while (recording) {
      const t = (Date.now() - t0) / 1000;
      const r = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 88, optimizeForSpeed: true, clip: { x: 0, y: 0, width: w, height: h, scale: 2 } }).catch(() => null);
      if (!r) continue;
      const file = join(frames, `${String(list.length).padStart(5, "0")}.jpg`);
      writeFileSync(file, Buffer.from(r.data, "base64"));
      list.push({ file, t });
    }
  })();
  await sleep(300);

  const api = {
    p,
    sleep,
    async type(s, base = 38) {
      for (const ch of s) {
        await p.keyboard.type(ch);
        await sleep(base + Math.random() * base * 0.9 + (ch === " " ? 25 : 0));
      }
    },
    key: (k) => p.keyboard.press(k),
    async paste(md) {
      await p.evaluate((m) => navigator.clipboard.writeText(m), md);
      await p.keyboard.press("Meta+v");
    },
    async moveTo(x, y, steps = 28) { await p.mouse.move(x, y, { steps }); },
    async click(x, y) { await p.mouse.move(x, y, { steps: 28 }); await sleep(120); await p.mouse.down(); await sleep(70); await p.mouse.up(); },
    async clickEl(locator, dx = 0.5, dy = 0.5) {
      const b = await locator.boundingBox();
      await api.click(b.x + b.width * dx, b.y + b.height * dy);
    },
  };
  await body(api);
  await sleep(200);
  recording = false;
  await loop;
  await browser.close();

  // Hold each frame until the next one arrived; give the last a short tail.
  const lines = [];
  for (let i = 0; i < list.length; i++) {
    const d = i + 1 < list.length ? list[i + 1].t - list[i].t : 0.6;
    lines.push(`file '${list[i].file}'`, `duration ${Math.max(d, 0.001).toFixed(4)}`);
  }
  lines.push(`file '${list[list.length - 1].file}'`);
  const concat = join(WORK, `${name}.txt`);
  writeFileSync(concat, lines.join("\n"));
  const mp4 = join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", concat,
    "-vf", `fps=30,scale=${Math.min(w * 2, 1920)}:-2:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-tune", "animation", "-movflags", "+faststart", "-an", mp4]);
  execFileSync("cwebp", ["-quiet", "-q", "80", "-resize", String(Math.min(w * 2, 1920)), "0",
    list[list.length - 1].file, "-o", join(OUT, `${name}.webp`)]);
  console.log(name, list.length, "frames", ((list.at(-1).t - list[0].t)).toFixed(1) + "s");
}

/* ---------------- scenes ---------------- */

// Hero: a document written from nothing, rendering as it is typed.
await scene("hero", { w: 1280, h: 520 }, async (a) => {
  await a.sleep(700);
  await a.type("# Launch notes", 55);
  await a.key("Enter"); await a.sleep(250);
  await a.type("Write plain Markdown and the page renders **as you type**.", 32);
  await a.key("Enter"); await a.sleep(250);
  await a.type("- [x] Draft the release notes", 34);
  await a.key("Enter");
  await a.type("Record the demo", 34);
  await a.key("Enter"); await a.key("Enter"); await a.sleep(300);
  await a.type("```mermaid", 50);
  await a.key("Enter"); await a.sleep(200);
  await a.type("flowchart LR", 34);
  await a.key("Enter");
  await a.type("  Write --> Review --> Ship", 34);
  await a.sleep(500);
  await a.click(980, 462);
  await a.sleep(1800);
  // Click the heading: its marker comes back. Click away: rendered again.
  await a.click(640, 135);
  await a.sleep(1500);
  await a.click(980, 468);
  await a.sleep(2200);
});

// One page: the same document in Source and in Live.
const RUNBOOK = `# Zero-downtime deploys

Roll out a new version **without dropping a request**.

> [!WARNING]
> Never change \`maxUnavailable\` above zero for the API.

| Setting | Value |
| :-- | --: |
| replicas | 3 |
| maxSurge | 25% |

- [x] Readiness probe passes
- [x] Pod disruption budget set
- [ ] Watch error rates for 10 minutes
`;
await scene("source-live", { w: 1120, h: 620, sidebar: false }, async (a) => {
  await a.paste(RUNBOOK);
  await a.sleep(400);
  await a.click(1000, 575);
  await a.sleep(1400);
  await a.clickEl(a.p.getByRole("button", { name: "Source", exact: true }).first());
  await a.sleep(2600);
  await a.clickEl(a.p.getByRole("button", { name: "Live", exact: true }).first());
  await a.sleep(1500);
  // Click into the table and the task list: Markdown appears where the caret is.
  await a.click(560, 420);
  await a.sleep(1600);
  await a.click(600, 500);
  await a.sleep(1500);
  await a.click(1000, 575);
  await a.sleep(1600);
});

// Diagrams: Mermaid typed in, rendered on leaving the block.
await scene("diagrams", { w: 1120, h: 560, sidebar: false }, async (a) => {
  await a.paste("# Request path\n\nEvery request crosses three hops before it reaches a pod.");
  await a.sleep(500);
  await a.key("Enter");
  await a.sleep(250);
  await a.type("```mermaid", 50);
  await a.key("Enter"); await a.sleep(200);
  await a.type("flowchart LR", 34); await a.key("Enter");
  await a.type("  user --> ingress", 34); await a.key("Enter");
  await a.type("  ingress --> service", 34); await a.key("Enter");
  await a.type("  service --> pod", 34);
  await a.sleep(500);
  await a.click(980, 490);
  await a.sleep(2600);
});

// Math: an equation typed and typeset.
await scene("math", { w: 1120, h: 560, sidebar: false }, async (a) => {
  await a.paste("# Queueing math\n\nFor an M/M/1 queue, the average time in the system is");
  await a.sleep(500);
  await a.key("Enter");
  await a.sleep(250);
  await a.type("$$", 60); await a.key("Shift+Enter");
  await a.type("W = \\frac{1}{\\mu - \\lambda}", 45); await a.key("Shift+Enter");
  await a.type("$$", 60);
  await a.sleep(500);
  await a.click(980, 490);
  await a.sleep(1000);
  await a.type("where $\\lambda$ is the arrival rate and $\\mu$ the service rate.", 30);
  await a.sleep(400);
  await a.click(980, 490);
  await a.sleep(2400);
});

// Code: a fenced block highlighted as it is typed.
await scene("code", { w: 1120, h: 560, sidebar: false }, async (a) => {
  await a.paste("# Producer\n\nSend a record and wait for the broker to acknowledge it.");
  await a.sleep(500);
  await a.key("Enter");
  await a.sleep(250);
  await a.type("```java", 50);
  await a.key("Enter"); await a.sleep(200);
  await a.type('var record = new ProducerRecord<>("orders", key, value);', 26); await a.key("Enter");
  await a.type("producer.send(record).get();", 30);
  await a.sleep(500);
  await a.click(980, 490);
  await a.sleep(2400);
});

// Tables: cell by cell with Tab.
await scene("tables", { w: 1120, h: 560, sidebar: false }, async (a) => {
  await a.paste(`# Rollout\n\n| Setting | Value |\n| :-- | --: |\n| replicas | 3 |\n| maxSurge | 25% |\n\n- [x] Readiness probe\n- [ ] Watch error rates\n`);
  await a.sleep(500);
  await a.click(1000, 490);
  await a.sleep(1000);
  const cell = a.p.locator("td").filter({ hasText: "3" }).first();
  await a.clickEl(cell, 0.8);
  await a.sleep(500);
  await a.key("Backspace");
  await a.type("5", 80);
  await a.sleep(600);
  await a.click(1000, 490);
  await a.sleep(800);
  const box = a.p.locator('input[type="checkbox"], .task-checkbox, [role="checkbox"]').nth(1);
  if (await box.count()) { await a.clickEl(box); }
  await a.sleep(2000);
});

// Themes: the status bar picker recolours the page.
await scene("themes", { w: 1120, h: 640, sidebar: true }, async (a) => {
  await a.paste(RUNBOOK);
  await a.sleep(300);
  await a.click(1000, 580);
  await a.sleep(800);
  await a.clickEl(a.p.getByRole("button", { name: /^Sarala/ }).last());
  await a.sleep(700);
  const sw = a.p.locator(".palette-dot");
  console.log("swatches", await sw.count());
  const n = Math.min(await sw.count(), 14);
  for (const i of [1, 2, 3, 4, 6, 7, 9, 0]) {
    if (i >= n) continue;
    await a.clickEl(sw.nth(i));
    await a.sleep(1100);
  }
  await a.sleep(800);
});
