/**
 * translation.test.mjs — پوشش و کیفیت واژه‌نامهٔ فارسی
 */
import { loadEmbeddings, loadFa, check, section } from './helpers.mjs';

section('Persian vocabulary mapping (data/fa.js)');
const d = loadEmbeddings();
const { FA, CATEGORY_FA } = loadFa();

const keys = Object.keys(FA);
check('5000 translation keys', keys.length === 5000, 'got ' + keys.length);

const missing = d.words.filter(w => !(w in FA));
check('every original token has a translation (0 missing)', missing.length === 0,
    missing.slice(0, 20).join(', '));

const extra = keys.filter(k => !d.words.includes(k));
check('no phantom keys outside the vocabulary (0 extra)', extra.length === 0,
    extra.slice(0, 20).join(', '));

const empty = keys.filter(k => !FA[k] || !String(FA[k]).trim());
check('no empty translations', empty.length === 0, empty.join(', '));

// No Arabic yeh/kaf leftovers in display labels ( Persian typography check )
const badChar = [];
for (const [k, v] of Object.entries(FA)) {
    if (/[\u064A\u0649\u0643]/.test(v)) badChar.push(k + '=' + v);
}
check('no Arabic ي/ك in Persian labels', badChar.length === 0, badChar.slice(0, 10).join(', '));

// ZWNJ usage sanity: at least some labels use the half-space (typography alive)
const withZwnj = Object.values(FA).filter(v => v.includes('\u200C'));
check('ZWNJ used in some labels (half-space typography)', withZwnj.length > 10,
    'count=' + withZwnj.length);

// category display names
check('CATEGORY_FA covers all 12 categories',
    d.categoryNames.every(c => CATEGORY_FA[c] && CATEGORY_FA[c].trim()),
    JSON.stringify(CATEGORY_FA));

// collisions are allowed but must be counted for the report
const seen = new Map();
for (const w of d.words) {
    const t = FA[w];
    seen.set(t, (seen.get(t) || 0) + 1);
}
const collisions = [...seen.entries()].filter(([, n]) => n > 1);
console.log('  · unique display labels: ' + seen.size + ' / 5000');
console.log('  · colliding display labels (allowed): ' + collisions.length);
console.log('  · example collisions: ' +
    collisions.slice(0, 5).map(([t, n]) => `${t}×${n}`).join(', '));
check('collisions never merge tokens (labels are not identifiers)',
    d.words.length === 5000 && new Set(d.words).size === 5000);
