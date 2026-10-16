# Marketplace site

React + Vite + TypeScript. Hash routing and a relative `base`, so the build works under the GitHub Pages sub-path (`/<repo>/`) and from any static server.

```sh
cd site
npm install
npm run dev        # dev server with hot reload at http://localhost:5173
npm test           # vitest: search, routing, catalog
npm run e2e        # Playwright against the production build (first time: npx playwright install chromium)
npm run index      # rebuild public/index.json from ../plugins
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173, as Pages will
```

- **Only real content.** The site has no sample data. `npm run dev`, `build` and `preview` first run `scripts/build-index.mjs`, which reads `.claude-plugin/marketplace.json` and `plugins/*` and writes `public/index.json`, `feed.json` and `feed.xml` (all git-ignored). The app fetches `index.json` at runtime. Add or change a plugin, run `npm run index` (or restart dev), and it shows up.
- Dates are never invented: a release without a date in its `CHANGELOG.md` heading falls back to the commit that bumped the version, otherwise shows no date. Compatibility fields that `COMPATIBILITY.md` does not state show "Not stated".
- `src/lib/` holds search, routing, markdown and the catalog builder; `src/views/` the pages; `src/components/` shared UI.
- Indexer tests: `node --test scripts/*.test.mjs` from the repo root.
- Fonts are self-hosted through `@fontsource`, so the page makes no third-party requests.
- CI: `.github/workflows/site.yml` tests and builds on every PR, and deploys to Pages from `main`. The Claude Design prototype (`../design-prototype`) is copied into the artifact at `/design-prototype/`.
- One-time setup: repo Settings → Pages → Source: **GitHub Actions**.
