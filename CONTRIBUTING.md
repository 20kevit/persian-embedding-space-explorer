# Contributing

Thanks for your interest in contributing to **Embedding Space Explorer**! This project is intentionally simple — vanilla JS with Three.js via CDN, no build tools, no npm — and we'd like to keep it that way.

## Ground Rules

- **No frameworks or build tools.** The project must remain a set of static files you can serve from any web server or GitHub Pages. No React, no Webpack, no npm.
- **No external JS dependencies beyond Three.js.** Everything runs with vanilla JavaScript and Three.js loaded via CDN import map.
- **Keep it simple.** This is an educational tool. Code should be readable by someone learning about word embeddings and 3D visualization.

## Ways to Contribute

### Bug Fixes

If something doesn't work — search doesn't find words, camera flies to the wrong place, labels don't show, arithmetic arrows glitch — please open an issue or submit a fix.

### Improvements We'd Love

- **Mobile/touch support:** Orbit controls work on touch but the search UX could be better on small screens
- **Accessibility:** Keyboard navigation for word selection, screen reader descriptions, high-contrast mode
- **Visualization enhancements:** Better label visibility, distance-based label sizing, smoother particle LOD
- **More analogies:** Add interesting vector arithmetic examples to the preprocessing script
- **Category improvements:** Better word-to-category assignment (the current approach uses hardcoded word lists — many words fall into "general")
- **Performance:** Optimize the label manager's distance sorting, reduce garbage collection pressure
- **Embedding models:** Support for other embedding formats beyond GloVe 6B 50d

### Things to Avoid

- Adding npm, webpack, or any build step
- Adding external JS libraries (beyond Three.js)
- Over-engineering simple code
- Committing the GloVe source data (`preprocess/glove_data/` is gitignored for a reason — it's 862MB)
- Changing the `EMBEDDING_DATA` format without updating both the Python exporter and the JS data layer

## How to Submit Changes

1. Fork the repository
2. Create a branch for your change (`git checkout -b my-change`)
3. Make your changes
4. Test by running a local server (`npx serve .` or `python3 -m http.server`) — ES modules require HTTP, not `file://`
5. If you changed the preprocessing script, re-run it and include the updated `data/embeddings.js`
6. Submit a pull request with a clear description of what you changed and why

## Development Setup

Clone the repo and start a local server:

```bash
git clone https://github.com/williankeller/embedding-space-explorer.git
cd embedding-space-explorer
npx serve .
```

If you're working on the preprocessing script:

```bash
pip install numpy umap-learn
python preprocess/generate_embeddings.py
```

## Code Style

- Use `const` and `let`, not `var`
- ES modules with explicit `import`/`export`
- Keep functions short and focused
- Comment non-obvious math (shader code, vector arithmetic, UMAP parameters) but don't over-comment
- Match the existing formatting — 4-space indentation

## Reporting Issues

When reporting a bug, include:

- What browser and OS you're using
- How you're serving the files (which local server, or GitHub Pages URL)
- What you expected to happen vs. what actually happened
- A screenshot if it's a visual issue
- Browser console errors if any

## Questions?

Open an issue with the "question" label. We're happy to help.
