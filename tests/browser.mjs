/**
 * browser.mjs — Playwright E2E (Chromium, local build)
 *
 * چک‌ها: رندر WebGL، RTL و فونت، جست‌وجوی فارسی، انتخاب واژه،
 * واکنش‌گرایی در عرض‌های 360/390/768/1024/1440، بدون خطای کنسول.
 *
 * اجرا: node tests/browser.mjs  (با سرور محلی روی :8000 و CHROMIUM_PATH=/tmp/chromium)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8000/';
const EXE = process.env.CHROMIUM_PATH || '/tmp/chromium';
const SHOTS = '/tmp/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
    { w: 360, h: 740, name: '360' },
    { w: 390, h: 844, name: '390' },
    { w: 768, h: 1024, name: '768' },
    { w: 1024, h: 768, name: '1024' },
    { w: 1440, h: 900, name: '1440' },
];

let passed = 0, failed = 0;
const failures = [];
const check = (name, cond, detail) => {
    if (cond) { passed++; console.log('  ✓ ' + name); }
    else { failed++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
};

const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
           '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const vp of VIEWPORTS) {
    console.log(`\n== viewport ${vp.name}x${vp.h} ==`);
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error') errors.push('console: ' + m.text());
    });

    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500); // let WebGL warm up

    // 1) RTL + language
    check('html lang=fa dir=rtl', await page.evaluate(() => {
        const h = document.documentElement;
        return h.lang === 'fa' && h.dir === 'rtl';
    }));

    // 2) WebGL canvas rendered
    const canvasOk = await page.evaluate(() => {
        const c = document.querySelector('#three-container canvas');
        if (!c) return false;
        try {
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            return !!gl;
        } catch { return false; }
    });
    check('WebGL canvas present', canvasOk);

    // 3) Vazirmatn loaded
    check('Vazirmatn font active', await page.evaluate(() =>
        document.fonts.check('16px Vazirmatn')));

    // 4) no horizontal overflow
    const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('no horizontal overflow', overflow <= 1, 'overflow=' + overflow);

    // 5) legend has 12 Persian categories
    check('legend: 12 Persian categories', await page.evaluate(() => {
        const items = document.querySelectorAll('#legend-grid .legend-item');
        return items.length === 12 &&
            [...items].every(i => i.textContent.trim().length > 0) &&
            /[؀-ۿ]/.test(items[0].textContent);
    }));

    // 6) methodology disclosure visible in page
    check('methodology text present', await page.evaluate(() =>
        document.body.innerText.includes('مدل Embedding فارسی')));

    // 7) Persian search → select → neighbors
    await page.fill('#search-input', 'پادشاه');
    await page.waitForTimeout(400);
    const ddVisible = await page.evaluate(() =>
        document.querySelector('#search-dropdown').classList.contains('visible'));
    check('dropdown visible for «پادشاه»', ddVisible);
    const ddText = await page.evaluate(() =>
        document.querySelector('#search-dropdown').innerText);
    check('dropdown shows پادشاه', ddText.includes('پادشاه'));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(2200); // fly animation
    const selected = await page.evaluate(() => ({
        word: document.getElementById('selected-word').innerText,
        neighbors: document.querySelectorAll('#neighbors-container .neighbor-item').length,
        cat: document.getElementById('selected-category').innerText,
    }));
    check('selected word shows پادشاه', selected.word.includes('پادشاه'), selected.word);
    check('neighbors list populated (10)', selected.neighbors === 10,
        'count=' + selected.neighbors);
    check('category badge Persian', /[؀-ۿ]/.test(selected.cat), selected.cat);

    // 8) clicking a neighbor re-selects
    if (vp.name === '1440') {
        await page.click('#neighbors-container .neighbor-item:nth-child(2)');
        await page.waitForTimeout(2200);
        const sel2 = await page.evaluate(() =>
            document.getElementById('selected-word').innerText);
        check('neighbor click re-selects', sel2.trim().length > 0, sel2);
    }

    // 9) no-result state
    await page.fill('#search-input', 'این‌واژه‌وجودندارد');
    await page.waitForTimeout(400);
    const noRes = await page.evaluate(() =>
        document.querySelector('#search-dropdown').innerText);
    check('no-result message Persian', noRes.includes('یافت نشد'), noRes);

    // 10) free-form arithmetic (Persian input) — پنل ابتدا باز می‌شود
    await page.click('#btn-toggle-arithmetic');
    await page.fill('#arithmetic-input', 'پادشاه − مرد + زن');
    await page.click('#arithmetic-run');
    await page.waitForTimeout(500);
    const arith = await page.evaluate(() =>
        document.getElementById('arithmetic-status').innerText);
    check('free-form arithmetic result in Persian', arith.includes('ملکه'), arith);

    // 11) reset button
    await page.click('#btn-reset-camera');
    await page.waitForTimeout(300);
    const afterReset = await page.evaluate(() => ({
        word: document.getElementById('selected-word').innerText,
        neighbors: document.getElementById('neighbors-container').innerText,
    }));
    check('reset shows Persian empty states',
        afterReset.word.includes('کلیک') && afterReset.neighbors.includes('انتخاب کنید'),
        JSON.stringify(afterReset));

    // 12) preset analogy button (full animation only once, at 1440)
    // (پنل از مرحلهٔ ۱۰ باز است)
    if (vp.name === '1440') {
        await page.click('.analogy-btn');
        await page.waitForTimeout(7500); // fly + 3 steps
        const status = await page.evaluate(() =>
            document.getElementById('arithmetic-status').innerText);
        check('preset analogy animation completes', status.includes('ملکه') || status.includes('='), status);
    }

    // 13) screenshot
    await page.screenshot({ path: `${SHOTS}/viewport-${vp.name}.png`, fullPage: false });

    // 14) console/page errors
    check('no page/console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

    await page.close();
}

await browser.close();

console.log('\n----------------------------------------');
console.log(`BROWSER TOTAL: ${passed + failed} | passed: ${passed} | failed: ${failed}`);
if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
}
