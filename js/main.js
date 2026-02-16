/**
 * main.js — Three.js scene, camera, controls, animation loop, raycasting
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import EmbeddingStore from './data.js';
import ParticleSystem from './particles.js';
import LabelManager from './labels.js';
import SearchController from './search.js';
import ArithmeticDemo from './arithmetic.js';

// ── Scene Setup ────────────────────────────────
const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.008);

const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    500
);
camera.position.set(40, 30, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0f, 1);
container.appendChild(renderer.domElement);

// ── Controls ───────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.8;
controls.minDistance = 5;
controls.maxDistance = 200;
controls.target.set(0, 0, 0);

// ── Initialize Modules ─────────────────────────
const pointCloud = ParticleSystem.create();
scene.add(pointCloud);

LabelManager.init(container, camera);
const labelsGroup = LabelManager.getLabelsGroup();
scene.add(labelsGroup);

ParticleSystem.createLines(scene);
SearchController.init(camera, controls);
ArithmeticDemo.init(scene);

// ── Selection Manager ──────────────────────────
const selectedWordEl = document.getElementById('selected-word');
const selectedCatEl = document.getElementById('selected-category');
const neighborsEl = document.getElementById('neighbors-container');

function selectWord(index) {
    if (ArithmeticDemo.isPlaying()) {
        ArithmeticDemo.cleanup();
    }

    const word = EmbeddingStore.getWord(index);
    const catName = EmbeddingStore.getCategoryName(index);
    const neighbors = EmbeddingStore.getNeighbors(index);

    selectedWordEl.textContent = word;
    selectedWordEl.className = 'selected-word';

    selectedCatEl.innerHTML = '<span class="category-badge cat-' + catName + '">' + catName + '</span>';

    let html = '<div class="neighbors-list">';
    for (let i = 0; i < neighbors.length; i++) {
        const nIdx = neighbors[i];
        const nWord = EmbeddingStore.getWord(nIdx);
        const nCat = EmbeddingStore.getCategoryName(nIdx);
        html += '<div class="neighbor-item" data-index="' + nIdx + '">' +
                '<span class="neighbor-rank">' + (i + 1) + '</span>' +
                '<span class="cat-dot cat-dot-' + nCat + '"></span>' +
                '<span class="neighbor-word">' + nWord + '</span>' +
                '</div>';
    }
    html += '</div>';
    neighborsEl.innerHTML = html;

    const items = neighborsEl.querySelectorAll('.neighbor-item');
    items.forEach(item => {
        item.addEventListener('click', function () {
            const idx = parseInt(this.dataset.index);
            SearchController.selectWord(idx);
        });
    });

    ParticleSystem.highlight(index, neighbors);
    ParticleSystem.showConnections(index, neighbors);
    LabelManager.setSelection(index, neighbors);
}

// Listen for search selection
window.addEventListener('word-selected', (e) => {
    selectWord(e.detail.index);
});

// ── Reset Camera Button ────────────────────────
document.getElementById('btn-reset-camera').addEventListener('click', () => {
    if (ArithmeticDemo.isPlaying()) {
        ArithmeticDemo.cleanup();
    }
    ParticleSystem.resetHighlight();
    ParticleSystem.clearConnections();
    LabelManager.clearSelection();
    selectedWordEl.textContent = 'Click a word or search';
    selectedWordEl.className = 'selected-word empty';
    selectedCatEl.innerHTML = '';
    neighborsEl.innerHTML = '<div class="empty-state">Select a word to see its nearest neighbors in embedding space<div class="hint">Click a dot or type in the search box</div></div>';

    camera.position.set(40, 30, 60);
    controls.target.set(0, 0, 0);
    controls.update();
});

// ── Arithmetic Toggle ──────────────────────────
const arithmeticSection = document.getElementById('section-arithmetic');
const arithmeticBtn = document.getElementById('btn-toggle-arithmetic');
let arithmeticVisible = false;

arithmeticBtn.addEventListener('click', () => {
    arithmeticVisible = !arithmeticVisible;
    arithmeticSection.style.display = arithmeticVisible ? 'block' : 'none';
    arithmeticBtn.classList.toggle('active', arithmeticVisible);
    if (!arithmeticVisible) {
        ArithmeticDemo.cleanup();
        ParticleSystem.resetHighlight();
    }
});

// ── Category Legend ────────────────────────────
const legendGrid = document.getElementById('legend-grid');
const catNames = EmbeddingStore.getCategoryNames();
for (let i = 0; i < catNames.length; i++) {
    const name = catNames[i];
    legendGrid.innerHTML += '<div class="legend-item">' +
        '<span class="legend-dot cat-dot-' + name + '"></span>' +
        '<span>' + name + '</span></div>';
}

// ── Word Count Stat ────────────────────────────
document.getElementById('stat-words').textContent = EmbeddingStore.count.toLocaleString();

// ── Resize Handler ─────────────────────────────
window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    LabelManager.resize(w, h);
});

// ── Animation Loop ─────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    controls.update();
    SearchController.update();
    ArithmeticDemo.update();
    LabelManager.update();

    renderer.render(scene, camera);
    LabelManager.render(scene, camera);
}

animate();
