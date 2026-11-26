/**
 * arithmetic-core.js — pure vector-arithmetic helpers (testable without Three.js)
 *
 * تمام محاسبات روی بردارهای اصلی انگلیسی انجام می‌شود؛
 * برچسب فارسی فقط برای نمایش/ورودی به کار می‌رود.
 */

/** v = sign0*t0 + sign1*t1 + ...  (Float32/Array-like vectors of equal length) */
export function combineVectors(terms, vectors, vectorDim) {
    const out = new Float64Array(vectorDim);
    for (const { sign, index } of terms) {
        const base = index * vectorDim;
        for (let d = 0; d < vectorDim; d++) {
            out[d] += sign * vectors[base + d];
        }
    }
    return out;
}

/** Cosine similarity between a query vector and the vector of `index`. */
export function cosineSimilarity(query, vectors, vectorDim, index) {
    const base = index * vectorDim;
    let dot = 0, nq = 0, nv = 0;
    for (let d = 0; d < vectorDim; d++) {
        const q = query[d];
        const v = vectors[base + d];
        dot += q * v;
        nq += q * q;
        nv += v * v;
    }
    if (nq === 0 || nv === 0) return -1;
    return dot / (Math.sqrt(nq) * Math.sqrt(nv));
}

/**
 * Top-1 nearest word (by cosine) to `query`, skipping `exclude` indices.
 * Returns { index, score } or null.
 */
export function nearestWord(query, vectors, vectorDim, wordCount, exclude) {
    let best = -1, bestScore = -Infinity;
    const skip = exclude || new Set();
    for (let i = 0; i < wordCount; i++) {
        if (skip.has(i)) continue;
        const s = cosineSimilarity(query, vectors, vectorDim, i);
        if (s > bestScore) {
            bestScore = s;
            best = i;
        }
    }
    return best >= 0 ? { index: best, score: bestScore } : null;
}

export default { combineVectors, cosineSimilarity, nearestWord };
