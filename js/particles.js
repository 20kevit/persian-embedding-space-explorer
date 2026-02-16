/**
 * particles.js — Point cloud with custom glow shader
 */
import * as THREE from 'three';
import EmbeddingStore from './data.js';

let points = null;
let geometry = null;
let sizesAttr = null;
let alphasAttr = null;
const defaultSize = 1.2;
const count = EmbeddingStore.count;

const vertexShader = `
    attribute float size;
    attribute float alpha;
    attribute vec3 customColor;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vColor = customColor;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow = pow(glow, 1.5);
        gl_FragColor = vec4(vColor, glow * vAlpha);
    }
`;

function create() {
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(EmbeddingStore.getPositionArray(), 3));

    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const c = EmbeddingStore.getCategoryColor(i);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));

    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) sizes[i] = defaultSize;
    sizesAttr = new THREE.BufferAttribute(sizes, 1);
    geometry.setAttribute('size', sizesAttr);

    const alphas = new Float32Array(count);
    for (let i = 0; i < count; i++) alphas[i] = 1.0;
    alphasAttr = new THREE.BufferAttribute(alphas, 1);
    geometry.setAttribute('alpha', alphasAttr);

    const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
    });

    points = new THREE.Points(geometry, material);
    return points;
}

function highlight(selectedIndex, neighborIndices) {
    const sizes = sizesAttr.array;
    const alphas = alphasAttr.array;
    const neighborSet = {};
    if (neighborIndices) {
        for (let j = 0; j < neighborIndices.length; j++) {
            neighborSet[neighborIndices[j]] = true;
        }
    }

    for (let i = 0; i < count; i++) {
        if (i === selectedIndex) {
            sizes[i] = defaultSize * 3.5;
            alphas[i] = 1.0;
        } else if (neighborSet[i]) {
            sizes[i] = defaultSize * 2.0;
            alphas[i] = 1.0;
        } else {
            sizes[i] = defaultSize * 0.6;
            alphas[i] = 0.25;
        }
    }
    sizesAttr.needsUpdate = true;
    alphasAttr.needsUpdate = true;
}

function highlightMultiple(indices) {
    const sizes = sizesAttr.array;
    const alphas = alphasAttr.array;
    const set = {};
    for (let j = 0; j < indices.length; j++) set[indices[j]] = true;

    for (let i = 0; i < count; i++) {
        if (set[i]) {
            sizes[i] = defaultSize * 3.0;
            alphas[i] = 1.0;
        } else {
            sizes[i] = defaultSize * 0.5;
            alphas[i] = 0.2;
        }
    }
    sizesAttr.needsUpdate = true;
    alphasAttr.needsUpdate = true;
}

function resetHighlight() {
    const sizes = sizesAttr.array;
    const alphas = alphasAttr.array;
    for (let i = 0; i < count; i++) {
        sizes[i] = defaultSize;
        alphas[i] = 1.0;
    }
    sizesAttr.needsUpdate = true;
    alphasAttr.needsUpdate = true;
}

// ── Neighbor connection lines ──────────────────
let linesGroup = null;

function createLines(parentScene) {
    linesGroup = new THREE.Group();
    parentScene.add(linesGroup);
}

function showConnections(selectedIdx, neighborIndices) {
    clearConnections();
    if (!linesGroup || selectedIdx < 0 || !neighborIndices) return;

    const sp = EmbeddingStore.getPosition(selectedIdx);

    for (let i = 0; i < neighborIndices.length; i++) {
        const np = EmbeddingStore.getPosition(neighborIndices[i]);

        const positions = new Float32Array([
            sp.x, sp.y, sp.z,
            np.x, np.y, np.z
        ]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Fade opacity by rank (closer neighbors = brighter)
        const opacity = 0.35 - (i * 0.025);
        const mat = new THREE.LineBasicMaterial({
            color: 0x00f5ff,
            transparent: true,
            opacity: Math.max(opacity, 0.08),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const line = new THREE.Line(geo, mat);
        linesGroup.add(line);
    }
}

function clearConnections() {
    if (!linesGroup) return;
    while (linesGroup.children.length > 0) {
        const child = linesGroup.children[0];
        linesGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    }
}

const ParticleSystem = {
    create,
    highlight,
    highlightMultiple,
    resetHighlight,
    createLines,
    showConnections,
    clearConnections,
    getPoints() { return points; }
};

export default ParticleSystem;
