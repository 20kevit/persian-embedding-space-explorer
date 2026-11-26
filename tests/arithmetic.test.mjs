/**
 * arithmetic.test.mjs — محاسبات برداری: پارسر فارسی + ریاضیات روی بردارهای اصلی
 */
import { loadEmbeddings, loadFa, check, section } from './helpers.mjs';

section('Vector arithmetic (Persian input → original English vectors)');

const d = loadEmbeddings();
const { FA, CATEGORY_FA } = loadFa();
globalThis.window = globalThis;
globalThis.EMBEDDING_DATA = d;
globalThis.FA_TRANSLATIONS = FA;
globalThis.CATEGORY_FA = CATEGORY_FA;

const faUtils = await import('../js/fa-utils.js');
const core = await import('../js/arithmetic-core.js');
const { default: EmbeddingStore } = await import('../js/data.js');

// ── parser ──
const p1 = faUtils.parseArithmetic('پادشاه − مرد + زن');
check('parses «پادشاه − مرد + زن»', p1 && p1.length === 3 &&
    p1[0].sign === 1 && p1[1].sign === -1 && p1[2].sign === 1,
    JSON.stringify(p1));

const p2 = faUtils.parseArithmetic('king - man + woman');
check('parses ASCII "king - man + woman"', p2 && p2.length === 3 &&
    p2[0].term === 'king' && p2[1].sign === -1 && p2[2].term === 'woman');

const p3 = faUtils.parseArithmetic('  king+queen ');
check('parses two-term "king+queen"', p3 && p3.length === 2 && p3[1].sign === 1);

check('rejects empty input', faUtils.parseArithmetic('') === null);
check('rejects single term', faUtils.parseArithmetic('king') === null);
check('rejects garbage', faUtils.parseArithmetic('+ - +') === null);

// ── resolution: Persian terms → original tokens ──
const terms = p1.map(t => ({ sign: t.sign, index: EmbeddingStore.lookup(t.term) }));
check('all Persian terms resolve to original tokens',
    terms.every(t => t.index >= 0), JSON.stringify(terms));
check('پادشاه→king, مرد→man, زن→woman',
    d.words[terms[0].index] === 'king' &&
    d.words[terms[1].index] === 'man' &&
    d.words[terms[2].index] === 'woman');

// ── vector math: v = king − man + woman ──
const dim = EmbeddingStore.getVectorDim();
const vecs = EmbeddingStore.getVectors();
const v = core.combineVectors(terms, vecs, dim);

// manual reference
const ref = new Float64Array(dim);
const base = i => i * dim;
for (let k = 0; k < dim; k++) {
    ref[k] = vecs[base(terms[0].index) + k] - vecs[base(terms[1].index) + k] + vecs[base(terms[2].index) + k];
}
let same = true;
for (let k = 0; k < dim; k++) if (Math.abs(v[k] - ref[k]) > 1e-9) same = false;
check('combineVectors matches manual king−man+woman', same);

// cosine sanity: identical vectors → 1
const cSelf = core.cosineSimilarity(vecs.slice(base(50), base(50) + dim), vecs, dim, 50);
check('cosine(v, v) = 1', Math.abs(cSelf - 1) < 1e-6, String(cSelf));

// nearest word excluding inputs should be a real index
const best = core.nearestWord(v, vecs, dim, 5000, new Set(terms.map(t => t.index)));
check('nearestWord returns an index ≠ inputs', best && best.index >= 0 && !terms.some(t => t.index === best.index));
check('nearestWord score is a valid cosine (−1..1]', best.score > -1 && best.score <= 1, String(best.score));

// the dataset's own preset must still point at queen
const a0 = d.analogies[0];
check('preset analogy result word = expected (queen)',
    d.words[a0.result] === 'queen' && a0.expected === 'queen');

// display helper: getFaByWord for expected words
check('getFaByWord(queen) = ملکه', EmbeddingStore.getFaByWord('queen') === 'ملکه');
check('analogy labels can be built in Persian',
    EmbeddingStore.getFa(a0.a) === 'پادشاه' &&
    EmbeddingStore.getFa(a0.b) === 'مرد' &&
    EmbeddingStore.getFa(a0.c) === 'زن');
