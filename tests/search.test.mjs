/**
 * search.test.mjs — جست‌وجوی فارسی/انگلیسی و تبدیل برچسب به توکن اصلی
 *
 * ماژول data.js در Node بارگذاری می‌شود (window = globalThis).
 */
import { loadEmbeddings, loadFa, check, section } from './helpers.mjs';

section('Search & Persian→token resolution');

// globals expected by js/data.js
const d = loadEmbeddings();
const { FA, CATEGORY_FA } = loadFa();
globalThis.window = globalThis;
globalThis.EMBEDDING_DATA = d;
globalThis.FA_TRANSLATIONS = FA;
globalThis.CATEGORY_FA = CATEGORY_FA;

const { default: EmbeddingStore } = await import('../js/data.js');
const faUtils = await import('../js/fa-utils.js');

// ── normalization ──
check('normalizeFa: Arabic ي → Persian ی', faUtils.normalizeFa('علي') === 'علی');
check('normalizeFa: Arabic ك → Persian ک', faUtils.normalizeFa('كتاب') === 'کتاب');
check('normalizeFa: strips ZWNJ', faUtils.normalizeFa('می\u200Cشود') === 'میشود');
check('normalizeFa: strips diacritics', faUtils.normalizeFa('سِگ') === 'سگ');
check('normalizeFa: Persian digits → Latin', faUtils.normalizeFa('۱۲۳') === '123');
check('normalizeEn: case-insensitive trim', faUtils.normalizeEn('  King ') === 'king');

// ── exact Persian search ──
check('search «پادشاه» resolves to king',
    EmbeddingStore.search('پادشاه').includes(EmbeddingStore.lookup('king')));
check('lookup(پادشاه) === lookup(king)',
    EmbeddingStore.lookup('پادشاه') === EmbeddingStore.lookup('king'));
check('lookup(سیب) === lookup(apple)',
    EmbeddingStore.lookup('سیب') === EmbeddingStore.lookup('apple'));
check('lookup(گربه) === lookup(cat)',
    EmbeddingStore.lookup('گربه') === EmbeddingStore.lookup('cat'));
check('lookup(ملکه) === lookup(queen)',
    EmbeddingStore.lookup('ملکه') === EmbeddingStore.lookup('queen'));

// ── English search compatibility ──
check('English exact: king', EmbeddingStore.lookup('king') >= 0);
check('English case-insensitive: KING', EmbeddingStore.lookup('KING') === EmbeddingStore.lookup('king'));
check('English prefix search: “kai” style prefix works',
    EmbeddingStore.search('kin').length > 0);
check('English prefix results all start with query',
    EmbeddingStore.search('ki').every(i => d.words[i].startsWith('ki')));

// ── Persian normalized search (Arabic ك variant of a Persian label) ──
const childIdx = EmbeddingStore.lookup('child');
if (childIdx >= 0) {
    const childFa = EmbeddingStore.getFa(childIdx); // «کودک»
    const arabized = childFa.replace(/\u06A9/g, '\u0643'); // Persian ک → Arabic ك
    check('Arabic-ك variant still matches Persian label «' + childFa + '»',
        EmbeddingStore.lookup(arabized) === childIdx, childFa + ' → ' + arabized);
}

// ── ZWNJ-insensitive search (half-space variants) ──
const withZwnj = Object.entries(FA).find(([w, t]) => t.includes('\u200C'));
if (withZwnj) {
    const [w0, labelFa] = withZwnj;
    const stripped = labelFa.replace(/\u200C/g, '');
    check('ZWNJ-less query still matches «' + labelFa + '»',
        EmbeddingStore.lookup(stripped) === EmbeddingStore.lookup(w0), stripped);
}

// ── whitespace ──
check('leading/trailing whitespace handled',
    EmbeddingStore.lookup('  پادشاه  ') === EmbeddingStore.lookup('king'));

// ── empty / missing ──
check('empty query → []', EmbeddingStore.search('').length === 0);
check('missing word → -1', EmbeddingStore.lookup('این‌واژه‌وجودندارد') === -1);
check('missing word search → []', EmbeddingStore.search('zzzqqq').length === 0);

// ── duplicate Persian labels (disambiguation) ──
// «خانه» maps only to home; find a real collision from the dataset:
const byFa = new Map();
for (let i = 0; i < d.words.length; i++) {
    const t = FA[d.words[i]];
    if (!byFa.has(t)) byFa.set(t, []);
    byFa.get(t).push(i);
}
const dup = [...byFa.entries()].find(([, v]) => v.length > 1);
check('at least one duplicate Persian label exists in dataset', !!dup,
    dup ? dup[0] : 'none');
if (dup) {
    const [label, idxs] = dup;
    const res = EmbeddingStore.search(label);
    check('duplicate label returns ALL matching tokens for disambiguation',
        idxs.every(i => res.includes(i)), label + ' → ' + res.join(','));
    check('duplicate tokens keep distinct English identifiers',
        new Set(idxs.map(i => d.words[i])).size === idxs.length);
}

// ── Persian prefix search ──
const someFa = FA[d.words[100]];
const prefix = someFa.slice(0, Math.max(1, Math.min(3, someFa.length)));
check('Persian prefix search returns results', EmbeddingStore.search(prefix).length > 0, prefix);

// ── getFa integrity ──
check('getFa(king) = پادشاه', EmbeddingStore.getFa(EmbeddingStore.lookup('king')) === 'پادشاه');
check('getFa never returns empty for full vocab',
    Array.from({ length: 5000 }, (_, i) => EmbeddingStore.getFa(i)).every(Boolean));
check('category display names are Persian',
    EmbeddingStore.getCategoryFa(0) && EmbeddingStore.getCategoryFa(0) !== '' );
