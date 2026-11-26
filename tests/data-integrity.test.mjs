/**
 * data-integrity.test.mjs —
 * تأیید می‌کند دادهٔ اصلی امبدینگ (بردارها، مختصات، همسایه‌ها، دسته‌ها)
 * دقیقاً مانند نسخهٔ پایهٔ اصلی باقی مانده است و لایهٔ فارسی آن را تغییر نداده است.
 *
 * هش‌های پایه پیش از شروع بومی‌سازی استخراج شده‌اند (baseline).
 */
import { loadEmbeddings, sha16, check, section } from './helpers.mjs';

// baseline (pre-localization) SHA-256 prefixes of JSON dumps
const BASELINE = {
    words: '8aaa9f91d62b20f9',
    positions: '432d0083c2742c68',
    vectors: 'aaa4fbfc16324b5b',
    categories: 'f5ef916adeb08594',
    neighbors: '053b074b6bb3cdef',
    analogies: '498b4b6f58fb146c',
};

section('Data integrity (original embeddings untouched)');
const d = loadEmbeddings();

check('word count = 5000', d.words.length === 5000, 'got ' + d.words.length);
check('all words unique', new Set(d.words).size === 5000);
check('all words lowercase identifiers', d.words.every(w => w === w.toLowerCase()));
check('positions length = 5000×3', d.positions.length === 15000, 'got ' + d.positions.length);
check('vectors length = 5000×50', d.vectors.length === 250000 && d.vectorDim === 50);
check('categories length = 5000', d.categories.length === 5000);
check('12 category names', d.categoryNames.length === 12, JSON.stringify(d.categoryNames));
check('neighbors = 5000×10', d.neighbors.length === 5000 && d.neighbors.every(n => n.length === 10));
check('analogies = 3', d.analogies.length === 3);

check('words hash matches baseline', sha16(d.words) === BASELINE.words, sha16(d.words));
check('positions hash matches baseline', sha16(d.positions) === BASELINE.positions, sha16(d.positions));
check('vectors hash matches baseline', sha16(d.vectors) === BASELINE.vectors, sha16(d.vectors));
check('categories hash matches baseline', sha16(d.categories) === BASELINE.categories, sha16(d.categories));
check('neighbors hash matches baseline', sha16(d.neighbors) === BASELINE.neighbors, sha16(d.neighbors));
check('analogies hash matches baseline', sha16(d.analogies) === BASELINE.analogies, sha16(d.analogies));

// preset analogy indices still point at the original words
check('analogy[0]: king − man + woman',
    d.words[d.analogies[0].a] === 'king' &&
    d.words[d.analogies[0].b] === 'man' &&
    d.words[d.analogies[0].c] === 'woman' &&
    d.words[d.analogies[0].result] === d.analogies[0].expected,
    JSON.stringify(d.analogies[0]));
check('expected result word exists in vocab', d.analogies.every(a => d.words.includes(a.expected)));
check('all neighbor indices valid', d.neighbors.every(n => n.every(i => i >= 0 && i < 5000)));
check('all category indices valid', d.categories.every(c => c >= 0 && c < d.categoryNames.length));
