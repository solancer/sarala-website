# Sarala — Website

Marketing site for [**Sarala**](https://github.com/solancer/sarala), a free, open-source
WYSIWYG Markdown editor that renders as you type — no preview pane, no split view.

Live at **[sarala.solancer.com](https://sarala.solancer.com)**.

## Stack

- **[Astro](https://astro.build)** — static-site generator. Ships zero JavaScript by
  default, so the page is fully server-rendered HTML for fast loads and clean SEO.
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** —
  generates `sitemap-index.xml` at build time.
- A single small client script (`src/scripts/app.js`) powers the live palette switcher,
  the hero typing demo, scroll reveals, and the source/rendered toggle.

## SEO

- Per-page `<title>`, meta description, and canonical URL.
- Open Graph + Twitter Card tags (`og:image` uses `public/screenshots/hero-final.png`).
- `SoftwareApplication` JSON-LD structured data.
- `robots.txt` and an auto-generated sitemap.
- Theme palette is restored before first paint to avoid a flash of the default colors.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
```

## Build

```bash
npm run build    # outputs static site to ./dist
npm run preview  # preview the production build locally
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes `dist/` to **GitHub Pages**.

One-time setup in the repo (**Settings → Pages**):

1. Set **Source** to **GitHub Actions**.
2. The custom domain `sarala.solancer.com` is configured via `public/CNAME`. Add a DNS
   `CNAME` record pointing `sarala` → `solancer.github.io`.
3. Enable **Enforce HTTPS** once the certificate is provisioned.

## Project structure

```
public/            # static assets copied verbatim (icon, CNAME, robots.txt, OG image)
src/
  layouts/         # Layout.astro — <head>, SEO meta, JSON-LD
  pages/           # index.astro — the landing page
  scripts/app.js   # client-side interactions
  styles/          # global.css — the Monokai-Pro-inspired palette system
.github/workflows/ # GitHub Pages deploy
```

## License

The Sarala application is licensed under GPL-3.0. See the
[main repository](https://github.com/solancer/sarala).
