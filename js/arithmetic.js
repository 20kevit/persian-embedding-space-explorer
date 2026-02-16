/**
 * arithmetic.js — Vector arithmetic demo with animated 3D arrows
 */
import * as THREE from 'three';
import EmbeddingStore from './data.js';
import ParticleSystem from './particles.js';
import LabelManager from './labels.js';
import SearchController from './search.js';

let scene = null;
let arrowGroup = null;
let analogies = [];
let playing = false;
let currentStep = 0;
let stepStart = 0;
let currentAnalogy = null;
let arrowMeshes = [];
let statusEl = null;

const STEP_DURATIONS = [1500, 1200, 1200, 1500];

function init(threeScene) {
    scene = threeScene;
    arrowGroup = new THREE.Group();
    scene.add(arrowGroup);

    analogies = EmbeddingStore.getAnalogies();
    statusEl = document.getElementById('arithmetic-status');

    const container = document.getElementById('analogy-buttons');
    container.innerHTML = '';
    for (let i = 0; i < analogies.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'analogy-btn';
        btn.textContent = analogies[i].label;
        btn.dataset.index = i;
        btn.addEventListener('click', function () {
            playAnalogy(parseInt(this.dataset.index));
        });
        container.appendChild(btn);
    }
}

function playAnalogy(index) {
    if (playing) {
        cleanup();
    }

    currentAnalogy = analogies[index];
    playing = true;
    currentStep = 0;
    stepStart = performance.now();

    const buttons = document.querySelectorAll('.analogy-btn');
    buttons.forEach(b => b.classList.remove('playing'));
    buttons[index].classList.add('playing');

    const posA = EmbeddingStore.getPosition(currentAnalogy.a);
    const posB = EmbeddingStore.getPosition(currentAnalogy.b);
    const posC = EmbeddingStore.getPosition(currentAnalogy.c);
    const posR = EmbeddingStore.getPosition(currentAnalogy.result);

    ParticleSystem.highlightMultiple([
        currentAnalogy.a, currentAnalogy.b,
        currentAnalogy.c, currentAnalogy.result
    ]);
    LabelManager.setArithmeticHighlight([
        currentAnalogy.a, currentAnalogy.b,
        currentAnalogy.c, currentAnalogy.result
    ]);

    statusEl.textContent = 'Flying to analogy region...';
    SearchController.flyToOverview([posA, posB, posC, posR]);
}

function createArrow(fromPos, toPos, color) {
    const from = new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z);
    const to = new THREE.Vector3(toPos.x, toPos.y, toPos.z);

    const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
    const dir = new THREE.Vector3().subVectors(to, from);
    const perp = new THREE.Vector3(-dir.y, dir.x, dir.z * 0.3).normalize();
    mid.add(perp.multiplyScalar(dir.length() * 0.08));

    const curve = new THREE.CatmullRomCurve3([from, mid, to]);

    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.15, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);

    const coneGeo = new THREE.ConeGeometry(0.4, 1.0, 8);
    const coneMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);

    const tangent = curve.getTangent(1);
    cone.position.copy(to);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

    const glowGeo = new THREE.TubeGeometry(curve, 32, 0.4, 8, false);
    const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);

    const group = new THREE.Group();
    group.add(tube);
    group.add(cone);
    group.add(glow);

    group.userData = { progress: 0, curve, tube, cone, glow };

    arrowGroup.add(group);
    arrowMeshes.push(group);

    return group;
}

function updateArrowProgress(arrow, progress) {
    const p = Math.min(progress, 1.0);
    arrow.userData.tube.material.opacity = p * 0.9;
    arrow.userData.glow.material.opacity = p * 0.15;
    arrow.userData.cone.material.opacity = p > 0.8 ? (p - 0.8) * 5 * 0.9 : 0;
    arrow.userData.cone.visible = p > 0.8;
}

function update() {
    if (!playing) return;

    const now = performance.now();
    const elapsed = now - stepStart;
    const duration = STEP_DURATIONS[currentStep];
    const t = Math.min(elapsed / duration, 1.0);

    if (currentStep === 0) {
        if (t >= 1.0) nextStep();
    } else if (currentStep === 1) {
        if (arrowMeshes.length === 0) {
            const posA = EmbeddingStore.getPosition(currentAnalogy.a);
            const posB = EmbeddingStore.getPosition(currentAnalogy.b);
            createArrow(posA, posB, 0xff00aa);
            statusEl.textContent = EmbeddingStore.getWord(currentAnalogy.a) + ' → ' +
                                   EmbeddingStore.getWord(currentAnalogy.b) + ' (subtract)';
        }
        if (arrowMeshes[0]) updateArrowProgress(arrowMeshes[0], t);
        if (t >= 1.0) nextStep();
    } else if (currentStep === 2) {
        if (arrowMeshes.length < 2) {
            const posC = EmbeddingStore.getPosition(currentAnalogy.c);
            const posR = EmbeddingStore.getPosition(currentAnalogy.result);
            createArrow(posC, posR, 0x00ff88);
            statusEl.textContent = EmbeddingStore.getWord(currentAnalogy.c) + ' → ' +
                                   EmbeddingStore.getWord(currentAnalogy.result) + ' (add)';
        }
        if (arrowMeshes[1]) updateArrowProgress(arrowMeshes[1], t);
        if (t >= 1.0) nextStep();
    } else if (currentStep === 3) {
        const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
        statusEl.textContent = '= ' + EmbeddingStore.getWord(currentAnalogy.result) + '!';
        statusEl.style.color = 'rgb(' + Math.round(245 * pulse + 10) + ',' +
                               Math.round(255 * pulse) + ',' +
                               Math.round(100 * (1 - pulse)) + ')';
        if (t >= 1.0) {
            statusEl.style.color = '';
            playing = false;
        }
    }
}

function nextStep() {
    currentStep++;
    stepStart = performance.now();
}

function cleanup() {
    for (let i = arrowMeshes.length - 1; i >= 0; i--) {
        arrowGroup.remove(arrowMeshes[i]);
        arrowMeshes[i].traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
    arrowMeshes = [];
    playing = false;
    currentStep = 0;
    currentAnalogy = null;
    LabelManager.setArithmeticHighlight(null);
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.color = '';
    }
    const buttons = document.querySelectorAll('.analogy-btn');
    buttons.forEach(b => b.classList.remove('playing'));
}

function isPlaying() { return playing; }

const ArithmeticDemo = {
    init,
    update,
    cleanup,
    isPlaying
};

export default ArithmeticDemo;
