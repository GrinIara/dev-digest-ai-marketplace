# Design prototype

Static prototype of the marketplace site, exported from Claude Design. It is kept apart from the real marketplace (`plugins/`, `.claude-plugin/`) and does not read any of it.

- Entry: `index.html` redirects to `Marketplace.dc.html`.
- `support.js` is the generated Claude Design runtime. Do not edit it.
- React and Babel load from unpkg, fonts from Google Fonts. All paths are relative, so it works under the GitHub Pages sub-path `/<repo>/design-prototype/`.
- Local preview: `python3 -m http.server -d design-prototype`, then open http://localhost:8000/. It will not run from `file://`.
- `.nojekyll` makes Pages serve the files as they are.
