/**
 * helpers.mjs — shared utilities for the Node test suite
 */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadEmbeddings() {
    const ctx = {};
    vm.createContext(ctx);
    const src = fs.readFileSync(path.join(ROOT, 'data/embeddings.js'), 'utf8');
    vm.runInContext(src + '\n;this.D = EMBEDDING_DATA;', ctx);
    return ctx.D;
}

export function loadFa() {
    const ctx = {};
    vm.createContext(ctx);
    const src = fs.readFileSync(path.join(ROOT, 'data/fa.js'), 'utf8');
    vm.runInContext(src + '\n;this.FA = FA_TRANSLATIONS; this.C = CATEGORY_FA;', ctx);
    return { FA: ctx.FA, CATEGORY_FA: ctx.C };
}

export function sha16(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

let passed = 0;
let failed = 0;
const failures = [];

export function check(name, cond, detail) {
    if (cond) {
        passed++;
        console.log('  ✓ ' + name);
    } else {
        failed++;
        failures.push(name + (detail ? ' — ' + detail : ''));
        console.log('  ✗ ' + name + (detail ? ' — ' + detail : ''));
    }
}

export function section(title) {
    console.log('\n== ' + title + ' ==');
}

export function summary() {
    console.log('\n----------------------------------------');
    console.log(`TOTAL: ${passed + failed} | passed: ${passed} | failed: ${failed}`);
    if (failures.length) {
        console.log('Failures:');
        for (const f of failures) console.log('  - ' + f);
    }
    return failed === 0;
}
