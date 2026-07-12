// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Custom domain served from GitHub Pages (see public/CNAME).
  site: "https://sarala.solancer.com",
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      // The promo reel is a noindex recording surface, not indexable content.
      filter: (page) => !page.includes("/promo"),
    }),
  ],
  build: {
    inlineStylesheets: "auto",
  },
  compressHTML: true,
});
