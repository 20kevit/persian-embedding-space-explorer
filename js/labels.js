/**
 * labels.js — CSS2DRenderer word labels (pooled, max ~50 visible)
 */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import EmbeddingStore from './data.js';

let labelRenderer = null;
const pool = [];
const POOL_SIZE = 50;
let camera = null;
let selectedIndex = -1;
let neighborSet = {};
let arithmeticSet = {};

function init(container, cam) {
    camera = cam;

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    for (let i = 0; i < POOL_SIZE; i++) {
        const div = document.createElement('div');
        div.className = 'word-label';
        div.textContent = '';
        const obj = new CSS2DObject(div);
        obj.visible = false;
        obj.userData = { wordIndex: -1 };
        pool.push(obj);
    }

    return labelRenderer;
}

function getLabelsGroup() {
    const group = new THREE.Group();
    for (let i = 0; i < pool.length; i++) {
        group.add(pool[i]);
    }
    return group;
}

function setSelection(index, neighbors) {
    selectedIndex = index;
    neighborSet = {};
    if (neighbors) {
        for (let i = 0; i < neighbors.length; i++) {
            neighborSet[neighbors[i]] = true;
        }
    }
}

function setArithmeticHighlight(indices) {
    arithmeticSet = {};
    if (indices) {
        for (let i = 0; i < indices.length; i++) {
            arithmeticSet[indices[i]] = true;
        }
    }
}

function clearSelection() {
    selectedIndex = -1;
    neighborSet = {};
}

function update() {
    if (!camera) return;

    const toShow = [];

    // Priority 1: arithmetic words
    const arithmeticIndices = Object.keys(arithmeticSet);
    for (let i = 0; i < arithmeticIndices.length; i++) {
        toShow.push({ index: parseInt(arithmeticIndices[i]), priority: 0 });
    }

    // Priority 2: selected word
    if (selectedIndex >= 0) {
        toShow.push({ index: selectedIndex, priority: 1 });
    }

    // Priority 3: neighbors
    const nKeys = Object.keys(neighborSet);
    for (let i = 0; i < nKeys.length; i++) {
        toShow.push({ index: parseInt(nKeys[i]), priority: 2 });
    }

    // Priority 4: nearest to camera
    let remaining = POOL_SIZE - toShow.length;
    if (remaining > 0) {
        const camPos = camera.position;
        const distances = [];
        for (let i = 0; i < EmbeddingStore.count; i += 3) {
            const p = EmbeddingStore.getPosition(i);
            const dx = p.x - camPos.x, dy = p.y - camPos.y, dz = p.z - camPos.z;
            distances.push({ index: i, dist: dx * dx + dy * dy + dz * dz });
        }
        distances.sort((a, b) => a.dist - b.dist);

        const shown = {};
        for (let i = 0; i < toShow.length; i++) shown[toShow[i].index] = true;

        for (let i = 0; i < distances.length && remaining > 0; i++) {
            const idx = distances[i].index;
            if (!shown[idx]) {
                toShow.push({ index: idx, priority: 3 });
                shown[idx] = true;
                remaining--;
            }
        }
    }

    // Assign labels from pool
    for (let i = 0; i < pool.length; i++) {
        const label = pool[i];
        if (i < toShow.length) {
            const entry = toShow[i];
            const idx = entry.index;
            const pos = EmbeddingStore.getPosition(idx);

            label.position.set(pos.x, pos.y + 0.8, pos.z);
            label.visible = true;
            label.userData.wordIndex = idx;

            const div = label.element;
            // برچسب فارسی در فضای سه‌بعدی؛ شناسه داخلی همچنان توکن انگلیسی است
            div.textContent = EmbeddingStore.getFa(idx);

            div.className = 'word-label';
            if (arithmeticSet[idx]) {
                div.className += ' arithmetic-highlight';
            } else if (idx === selectedIndex) {
                div.className += ' highlight';
            } else if (neighborSet[idx]) {
                div.className += ' neighbor-highlight';
            }
        } else {
            label.visible = false;
        }
    }
}

function render(scene, cam) {
    if (labelRenderer) {
        labelRenderer.render(scene, cam);
    }
}

function resize(width, height) {
    if (labelRenderer) {
        labelRenderer.setSize(width, height);
    }
}

const LabelManager = {
    init,
    getLabelsGroup,
    setSelection,
    setArithmeticHighlight,
    clearSelection,
    update,
    render,
    resize
};

export default LabelManager;
