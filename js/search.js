/**
 * search.js — Search input, autocomplete, camera fly-to animation
 */
import * as THREE from 'three';
import EmbeddingStore from './data.js';

let input = null;
let dropdown = null;
let controls = null;
let camera = null;

// Fly animation state
let flying = false;
let flyStart = null;
const flyDuration = 1500;
const flyFrom = new THREE.Vector3();
const flyTo_ = new THREE.Vector3();
const flyTargetFrom = new THREE.Vector3();
const flyTargetTo = new THREE.Vector3();
let onFlyComplete = null;

let selectedDropdownIndex = -1;
let currentResults = [];

function init(cam, orbitControls) {
    camera = cam;
    controls = orbitControls;
    input = document.getElementById('search-input');
    dropdown = document.getElementById('search-dropdown');

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('focus', () => {
        if (currentResults.length > 0) showDropdown();
    });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}

function onInput() {
    const val = input.value.trim();
    if (val.length === 0) {
        hideDropdown();
        currentResults = [];
        return;
    }
    currentResults = EmbeddingStore.search(val);
    selectedDropdownIndex = -1;
    if (currentResults.length > 0) {
        renderDropdown();
        showDropdown();
    } else {
        hideDropdown();
    }
}

function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length > 0) {
            selectedDropdownIndex = Math.min(selectedDropdownIndex + 1, currentResults.length - 1);
            renderDropdown();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length > 0) {
            selectedDropdownIndex = Math.max(selectedDropdownIndex - 1, 0);
            renderDropdown();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        let idx = -1;
        if (selectedDropdownIndex >= 0 && selectedDropdownIndex < currentResults.length) {
            idx = currentResults[selectedDropdownIndex];
        } else if (currentResults.length > 0) {
            idx = currentResults[0];
        } else {
            idx = EmbeddingStore.lookup(input.value.trim());
        }
        if (idx >= 0) {
            selectWord(idx);
            hideDropdown();
            input.blur();
        }
    } else if (e.key === 'Escape') {
        hideDropdown();
        input.blur();
    }
}

function renderDropdown() {
    dropdown.innerHTML = '';
    for (let i = 0; i < currentResults.length; i++) {
        const idx = currentResults[i];
        const div = document.createElement('div');
        div.className = 'search-item' + (i === selectedDropdownIndex ? ' selected' : '');
        const catName = EmbeddingStore.getCategoryName(idx);
        div.innerHTML = '<span class="cat-dot cat-dot-' + catName + '"></span>' +
                        '<span>' + EmbeddingStore.getWord(idx) + '</span>';
        div.dataset.index = idx;
        div.addEventListener('click', function() {
            selectWord(parseInt(this.dataset.index));
            hideDropdown();
        });
        dropdown.appendChild(div);
    }
}

function showDropdown() { dropdown.classList.add('visible'); }
function hideDropdown() { dropdown.classList.remove('visible'); }

function selectWord(wordIndex) {
    input.value = EmbeddingStore.getWord(wordIndex);
    window.dispatchEvent(new CustomEvent('word-selected', { detail: { index: wordIndex } }));
    flyToWord(wordIndex);
}

function flyToWord(wordIndex, callback) {
    const pos = EmbeddingStore.getPosition(wordIndex);
    const target = new THREE.Vector3(pos.x, pos.y, pos.z);

    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    const distance = 8;
    const dest = new THREE.Vector3().copy(target).add(dir.multiplyScalar(distance));

    startFly(dest, target, callback);
}

function flyToOverview(positions, callback) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < positions.length; i++) {
        cx += positions[i].x;
        cy += positions[i].y;
        cz += positions[i].z;
    }
    cx /= positions.length;
    cy /= positions.length;
    cz /= positions.length;

    let maxDist = 0;
    for (let i = 0; i < positions.length; i++) {
        const dx = positions[i].x - cx;
        const dy = positions[i].y - cy;
        const dz = positions[i].z - cz;
        maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }

    const target = new THREE.Vector3(cx, cy, cz);
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    const dest = new THREE.Vector3().copy(target).add(dir.multiplyScalar(maxDist * 2.5 + 10));

    startFly(dest, target, callback);
}

function startFly(destPos, destTarget, callback) {
    flyFrom.copy(camera.position);
    flyTo_.copy(destPos);
    flyTargetFrom.copy(controls.target);
    flyTargetTo.copy(destTarget);
    flyStart = performance.now();
    flying = true;
    onFlyComplete = callback || null;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function update() {
    if (!flying) return;
    const now = performance.now();
    const elapsed = now - flyStart;
    const t = Math.min(elapsed / flyDuration, 1.0);
    const e = easeInOutCubic(t);

    camera.position.lerpVectors(flyFrom, flyTo_, e);
    controls.target.lerpVectors(flyTargetFrom, flyTargetTo, e);
    controls.update();

    if (t >= 1.0) {
        flying = false;
        if (onFlyComplete) {
            const cb = onFlyComplete;
            onFlyComplete = null;
            cb();
        }
    }
}

function isFlying() { return flying; }

const SearchController = {
    init,
    update,
    selectWord,
    flyToWord,
    flyToOverview,
    isFlying
};

export default SearchController;
