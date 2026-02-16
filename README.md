# Embedding Space Explorer

A 3D particle universe where 5,000 words float as glowing dots, clustered by semantic similarity. Type a word and the camera flies to its neighborhood. Watch vector arithmetic come alive as animated arrows trace `king − man + woman = queen` through space.

This project was created as a study exercise to understand how word embeddings work — how neural networks represent language as geometry, how meaning maps to direction, and how simple vector math can capture complex analogies.

Built with vanilla JavaScript and Three.js. No frameworks, no build tools, no server required. Part of the neural network trilogy alongside [neural-network-numbers](https://github.com/williankeller/neural-network-numbers) and [neural-network-driving](https://github.com/williankeller/neural-network-driving).

![Words: 5,000](https://img.shields.io/badge/words-5%2C000-00f5ff?style=flat-square)
![Model: GloVe 6B](https://img.shields.io/badge/model-GloVe%206B-ff00aa?style=flat-square)
![Projection: UMAP](https://img.shields.io/badge/projection-UMAP-f5ff00?style=flat-square)
![No Build Tools](https://img.shields.io/badge/build%20tools-none-00ff88?style=flat-square)

## What This Is

An interactive 3D visualization of word embeddings — the numerical representations that neural networks use to understand language. Each word is a point in 50-dimensional space, projected down to 3D using UMAP so you can see the structure emerge naturally.

- **Semantic Clusters:** Nature words clump together. Emotions form their own neighborhood. Technology terms cluster near science. The structure is learned, not designed.
- **Nearest Neighbors:** Search for any word to see its 10 closest neighbors in the original 50D space, connected by glowing lines — revealing what the model considers "similar."
- **Vector Arithmetic:** The famous `king − man + woman = queen` analogy, animated as arrows through 3D space. Watch the direction of "royalty" be preserved when you swap gender.
- **12 Color-Coded Categories:** Words are colored by semantic category (nature, technology, people, emotion, science, etc.) so you can see clusters at a glance.

## Demo

Hosted version: [williankeller.github.io/embedding-space-explorer](https://williankeller.github.io/embedding-space-explorer/)

Or run it locally — see below.

## Running Locally

Since the app uses ES modules, you need a local server:

```bash
npx serve .
# or
python3 -m http.server
# Open http://localhost:3000 (or :8000)
```

The embedding data is pre-generated and included in the repo, so there's nothing to install or build.

## Regenerating Embeddings

If you want to regenerate the embedding data from scratch (not required to run the app):

```bash
pip install numpy umap-learn
python preprocess/generate_embeddings.py
```

This will:

1. Download GloVe 6B vectors (~862MB, cached in `preprocess/glove_data/`)
2. Filter to ~5,000 clean English words
3. Assign semantic categories via hardcoded word lists
4. Run UMAP to project 50D → 3D (cosine metric, 15 neighbors)
5. Pre-compute 10 nearest neighbors per word
6. Compute vector arithmetic examples (`king − man + woman`, `paris − france + italy`, etc.)
7. Export `data/embeddings.js` (~2.3MB)

## Project Structure

```
embedding-space-explorer/
├── index.html                  # Entry point — ES module import map + layout
├── style.css                   # Dark theme, glassmorphism, category colors
├── js/
│   ├── main.js                 # Three.js scene, camera, controls, animation loop
│   ├── particles.js            # Point cloud with custom GLSL glow shader
│   ├── labels.js               # CSS2DRenderer — pooled word labels (max 50)
│   ├── search.js               # Search autocomplete + camera fly-to animation
│   ├── arithmetic.js           # Vector arithmetic demo with animated 3D arrows
│   └── data.js                 # Data access layer over EMBEDDING_DATA global
├── data/
│   └── embeddings.js           # Pre-computed: words, positions, categories, neighbors
├── preprocess/
│   └── generate_embeddings.py  # GloVe → UMAP → JS export pipeline
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## How It Works

### Word Embeddings (GloVe)

GloVe (Global Vectors for Word Representation) learns word vectors by analyzing co-occurrence statistics across a massive text corpus. The key insight: words that appear in similar contexts get similar vectors. The 50-dimensional vectors capture relationships like synonymy, analogy, and category membership — all encoded as directions in high-dimensional space.

### Dimensionality Reduction (UMAP)

50 dimensions are impossible to visualize. UMAP (Uniform Manifold Approximation and Projection) compresses them to 3D while preserving local neighborhood structure. Words that were close in 50D stay close in 3D. The resulting point cloud reveals natural clusters — not because we told it about categories, but because the embeddings already contain that structure.

### Vector Arithmetic

The most remarkable property of word embeddings: relationships are encoded as vector directions. Subtracting `man` from `king` gives a "royalty without masculinity" vector. Adding `woman` lands near `queen`. This works for geography (`Paris − France + Italy ≈ Rome`) and many other semantic relationships.

### Rendering

The point cloud uses a custom GLSL shader with additive blending — overlapping particles glow brighter, creating a natural density visualization. CSS2D labels are pooled (max 50 visible) and assigned by priority: selected word > neighbors > nearest to camera. Neighbor connections are drawn as additive-blended lines that fade by rank. Camera fly animations use cubic ease-in-out interpolation.

## Tech Stack

- **Three.js r160** — WebGL rendering, OrbitControls, CSS2DRenderer (via ES module import maps)
- **GloVe 6B 50d** — Pre-trained word vectors (Stanford NLP)
- **UMAP** — Dimensionality reduction (Python preprocessing, via `umap-learn`)
- **Fonts** — Space Grotesk, JetBrains Mono (Google Fonts)
- **Design** — Dark theme with cyan/magenta/yellow/green accents
- **Zero build tools** — Pure HTML/CSS/JS, CDN dependencies, GitHub Pages ready

## Deploying to GitHub Pages

Push to a GitHub repository and enable Pages from Settings → Pages → Source: main branch. Everything is static — no build step required. The only CDN dependency is Three.js, loaded via import map at runtime.

## License

MIT
