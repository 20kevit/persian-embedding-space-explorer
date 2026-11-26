/**
 * main.js — Three.js scene, camera, controls, animation loop, raycasting
 * رابط کاربری فارسی؛ دادهٔ ریاضی اصلی انگلیسی دست‌نخورده می‌ماند.
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

const EMPTY_SELECTED = 'روی یک واژه کلیک کنید یا جست‌وجو کنید';
const EMPTY_NEIGHBORS =
    'یک واژه را انتخاب کنید تا نزدیک‌ترین همسایه‌های آن در فضای امبدینگ را ببینید' +
    '<div class="hint">روی یک نقطه کلیک کنید یا در جعبهٔ جست‌وجو تایپ کنید</div>';

function selectWord(index) {
    if (ArithmeticDemo.isPlaying()) {
        ArithmeticDemo.cleanup();
    }

    const word = EmbeddingStore.getWord(index);
    const faLabel = EmbeddingStore.getFa(index);
    const catName = EmbeddingStore.getCategoryName(index);
    const catFa = EmbeddingStore.getCategoryFa(index);
    const neighbors = EmbeddingStore.getNeighbors(index);

    // برچسب فارسی اصلی است؛ توکن انگلیسی به‌عنوان ابهام‌زدای درج می‌شود.
    selectedWordEl.className = 'selected-word';
    selectedWordEl.innerHTML = '<span dir="rtl"></span><span class="selected-en" dir="ltr"></span>';
    selectedWordEl.querySelector('span[dir="rtl"]').textContent = faLabel;
    const enEl = selectedWordEl.querySelector('.selected-en');
    if (faLabel !== word) {
        enEl.textContent = word;
    } else {
        enEl.remove();
    }

    selectedCatEl.innerHTML = '<span class="category-badge cat-' + catName + '"></span>';
    selectedCatEl.querySelector('.category-badge').textContent = catFa;

    let html = '<div class="neighbors-list">';
    for (let i = 0; i < neighbors.length; i++) {
        const nIdx = neighbors[i];
        const nWord = EmbeddingStore.getWord(nIdx);
        const nFa = EmbeddingStore.getFa(nIdx);
        const nCat = EmbeddingStore.getCategoryName(nIdx);
        html += '<div class="neighbor-item" data-index="' + nIdx + '">' +
                '<span class="neighbor-rank">' + (i + 1) + '</span>' +
                '<span class="cat-dot cat-dot-' + nCat + '"></span>' +
                '<span class="neighbor-word"></span>' +
                (nFa !== nWord ? '<span class="neighbor-en" dir="ltr"></span>' : '') +
                '</div>';
    }
    html += '</div>';
    neighborsEl.innerHTML = html;

    // متن‌ها را با textContent پر می‌کنیم (ایمن در برابر HTML)
    const items = neighborsEl.querySelectorAll('.neighbor-item');
    items.forEach((item, i) => {
        const nIdx = neighbors[i];
        item.querySelector('.neighbor-word').textContent = EmbeddingStore.getFa(nIdx);
        const enSpan = item.querySelector('.neighbor-en');
        if (enSpan) enSpan.textContent = EmbeddingStore.getWord(nIdx);
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
    selectedWordEl.textContent = EMPTY_SELECTED;
    selectedWordEl.className = 'selected-word empty';
    selectedCatEl.innerHTML = '';
    neighborsEl.innerHTML = '<div class="empty-state">' + EMPTY_NEIGHBORS + '</div>';

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
const catFaMap = EmbeddingStore.getCategoryFaMap();
for (let i = 0; i < catNames.length; i++) {
    const name = catNames[i];
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = '<span class="legend-dot cat-dot-' + name + '"></span><span></span>';
    item.querySelector('span:last-child').textContent = catFaMap[name] || name;
    legendGrid.appendChild(item);
}

// ── Word Count Stat ────────────────────────────
document.getElementById('stat-words').textContent = EmbeddingStore.count.toLocaleString('fa-IR');

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
