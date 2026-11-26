/**
 * data.js — Data access layer over EMBEDDING_DATA global
 *
 * لایهٔ دسترسی به داده. دادهٔ اصلی (بردارها، مختصات، همسایه‌ها)
 * دست‌نخورده می‌ماند؛ ترجمه‌های فارسی از FA_TRANSLATIONS خوانده می‌شوند
 * و صرفاً نقش نمایشی دارند (هرگز به‌عنوان شناسه استفاده نمی‌شوند).
 */
import { normalizeFa, normalizeEn } from './fa-utils.js';

const data = window.EMBEDDING_DATA;
const faMap = window.FA_TRANSLATIONS || {};
const wordIndex = {};
const wordCount = data.words.length;

// Build word → index lookup (original English identifiers, case-insensitive)
for (let i = 0; i < wordCount; i++) {
    wordIndex[data.words[i].toLowerCase()] = i;
}

// Build normalized Persian label → [indices] reverse lookup.
// برچسب‌های فارسی تکراری ممکن است چند توکن داشته باشند؛
// هر توکن شناسهٔ مستقل خود را حفظ می‌کند.
const faIndex = {};
for (let i = 0; i < wordCount; i++) {
    const fa = faMap[data.words[i]];
    if (!fa) continue;
    const key = normalizeFa(fa);
    if (!key) continue;
    (faIndex[key] || (faIndex[key] = [])).push(i);
}

// Category colors (matching CSS)
const categoryColors = {
    nature:     { r: 0.0, g: 1.0, b: 0.53 },
    technology: { r: 0.0, g: 0.96, b: 1.0 },
    people:     { r: 1.0, g: 0.0, b: 0.67 },
    emotion:    { r: 0.96, g: 1.0, b: 0.0 },
    action:     { r: 1.0, g: 0.55, b: 0.0 },
    science:    { r: 0.63, g: 0.39, b: 1.0 },
    place:      { r: 1.0, g: 0.39, b: 0.39 },
    time:       { r: 0.39, g: 0.78, b: 1.0 },
    food:       { r: 1.0, g: 0.71, b: 0.2 },
    body:       { r: 1.0, g: 0.55, b: 0.71 },
    abstract:   { r: 0.78, g: 0.78, b: 1.0 },
    general:    { r: 0.59, g: 0.59, b: 0.67 },
};

const colorArray = data.categoryNames.map(name => categoryColors[name] || categoryColors.general);

const EmbeddingStore = {
    count: wordCount,

    getWord(i) {
        return data.words[i];
    },

    /** برچسب فارسی واژه (در صورت نبود ترجمه، توکن اصلی انگلیسی). */
    getFa(i) {
        return faMap[data.words[i]] || data.words[i];
    },

    /** ترجمهٔ فارسی یک توکن انگلیسی (با نرمال‌سازی کلید). */
    getFaByWord(word) {
        if (!word) return '';
        return faMap[word] || faMap[word.toLowerCase()] || word;
    },

    /** نام دستهٔ فارسی برای نمایش (کلاس CSS همچنان انگلیسی می‌ماند). */
    getCategoryFa(i) {
        const name = data.categoryNames[data.categories[i]];
        return (window.CATEGORY_FA && window.CATEGORY_FA[name]) || name;
    },

    getPosition(i) {
        const idx = i * 3;
        return {
            x: data.positions[idx],
            y: data.positions[idx + 1],
            z: data.positions[idx + 2]
        };
    },

    getPositionArray() {
        return data.positions;
    },

    getCategory(i) {
        return data.categories[i];
    },

    getCategoryName(i) {
        return data.categoryNames[data.categories[i]];
    },

    getCategoryNames() {
        return data.categoryNames;
    },

    getCategoryFaMap() {
        return window.CATEGORY_FA || {};
    },

    getCategoryColor(i) {
        return colorArray[data.categories[i]];
    },

    getNeighbors(i) {
        return data.neighbors[i];
    },

    getVector(i) {
        const start = i * data.vectorDim;
        return Array.prototype.slice.call(data.vectors, start, start + data.vectorDim);
    },

    getVectors() {
        return data.vectors;
    },

    getVectorDim() {
        return data.vectorDim;
    },

    getAnalogies() {
        return data.analogies;
    },

    /** Exact lookup: English token (case-insensitive) یا برچسب فارسی نرمال‌شده. */
    lookup(word) {
        if (!word) return -1;
        const en = normalizeEn(word);
        if (en) {
            const idx = wordIndex[en];
            if (idx !== undefined) return idx;
        }
        const fa = normalizeFa(word);
        if (fa && faIndex[fa] && faIndex[fa].length > 0) {
            return faIndex[fa][0];
        }
        return -1;
    },

    /** همهٔ شاخص‌هایی که با پرسش فارسی/انگلیسی منطبق دقیق‌اند. */
    lookupAll(word) {
        if (!word) return [];
        const en = normalizeEn(word);
        if (en && wordIndex[en] !== undefined) return [wordIndex[en]];
        const fa = normalizeFa(word);
        if (fa && faIndex[fa]) return faIndex[fa].slice();
        return [];
    },

    /**
     * جست‌وجوی پیشوندی ترکیبی (انگلیسی + فارسی).
     * ترتیب: تطابق دقیق انگلیسی ← تطابق دقیق فارسی ← پیشوند انگلیسی ← پیشوند فارسی.
     * حداکثر ۸ نتیجه؛ برای واژه‌های فارسی تکراری همهٔ گزینه‌ها با نمایش توکن انگلیسی برگردانده می‌شوند.
     */
    search(prefix) {
        if (!prefix || String(prefix).length === 0) return [];
        const qEn = normalizeEn(prefix);
        const qFa = normalizeFa(prefix);
        if (!qEn && !qFa) return [];

        const results = [];
        const seen = new Set();
        const push = (i) => {
            if (!seen.has(i) && results.length < 8) {
                seen.add(i);
                results.push(i);
            }
        };

        // 1) تطابق دقیق انگلیسی (O(1))
        if (qEn && wordIndex[qEn] !== undefined) push(wordIndex[qEn]);

        // 2) تطابق دقیق فارسی (ممکن است چند توکن باشد → نمایش همه برای ابهام‌زدایی)
        if (qFa && faIndex[qFa]) {
            for (const i of faIndex[qFa]) push(i);
        }

        // 3) پیشوند انگلیسی و فارسی
        for (let i = 0; i < wordCount && results.length < 8; i++) {
            const w = data.words[i].toLowerCase();
            if (qEn && w.indexOf(qEn) === 0) push(i);
            if (results.length >= 8) break;
            if (qFa) {
                const fa = faMap[data.words[i]];
                if (fa && normalizeFa(fa).indexOf(qFa) === 0) push(i);
            }
        }

        return results;
    },

    colorArray,
    categoryColors
};

export default EmbeddingStore;
