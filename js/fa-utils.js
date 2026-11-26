/**
 * fa-utils.js — Persian text normalization helpers (pure, testable)
 *
 * ابزارهای خالص برای نرمال‌سازی متن فارسی هنگام جست‌وجو.
 * هیچ وابستگی به DOM یا دادهٔ امبدینگ ندارد.
 */

// Map Arabic/Persian presentation variants onto canonical Persian forms.
const ARABIC_YEH = /[\u064A\u0649]/g;      // ي ى  → ی
const ARABIC_KAF = /\u0643/g;               // ك    → ک
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671\u0627]/g; // آ أ إ ٱ ا → ا
const TEH_MARBUTA = /\u0629/g;              // ة    → ه
const TATWEEL = /\u0640/g;                  // ـ    → (removed)
const DIACRITICS = /[\u064B-\u0652\u0653-\u065F\u0670\u06D6-\u06ED]/g;
const ZWNJ = /\u200C/g;                     // zero-width non-joiner → removed for matching
const PERSIAN_DIGITS = /[\u06F0-\u06F9]/g;
const ARABIC_DIGITS = /[\u0660-\u0669]/g;

/**
 * Normalize a Persian query/label for tolerant matching:
 * - trim + lowercase
 * - unify ي/ى → ی, ك → ک, alef variants → ا, ة → ه
 * - strip diacritics, tatweel and ZWNJ (so «می‌شود» matches «میشود»)
 * - convert Persian/Arabic digits to Latin digits
 */
export function normalizeFa(input) {
    if (input === null || input === undefined) return '';
    let s = String(input).trim().toLowerCase();
    s = s.replace(ARABIC_YEH, '\u06CC');
    s = s.replace(ARABIC_KAF, '\u06A9');
    s = s.replace(ALEF_VARIANTS, '\u0627');
    s = s.replace(TEH_MARBUTA, '\u0647');
    s = s.replace(TATWEEL, '');
    s = s.replace(DIACRITICS, '');
    s = s.replace(ZWNJ, '');
    s = s.replace(PERSIAN_DIGITS, d => String(d.charCodeAt(0) - 0x06F0));
    s = s.replace(ARABIC_DIGITS, d => String(d.charCodeAt(0) - 0x0660));
    return s;
}

/** Normalize an English token/query: trim + lowercase (identifiers never change). */
export function normalizeEn(input) {
    if (input === null || input === undefined) return '';
    return String(input).trim().toLowerCase();
}

/** True when the string contains at least one Persian/Arabic letter. */
export function containsFa(input) {
    return /[\u0600-\u06FF]/.test(String(input || ''));
}

/**
 * Parse a vector-arithmetic expression such as:
 *   «پادشاه − مرد + زن», "king - man + woman", "king+queen"
 * Returns [{ sign: +1|-1, term: "پادشاه" }, ...] or null when malformed.
 * Accepted operators: + and the dash family - − – - ﺎ etc.
 */
export function parseArithmetic(input) {
    if (!input) return null;
    const raw = String(input).trim();
    if (!raw) return null;
    // Split while keeping operators; allow a leading sign on the first term.
    const parts = raw.split(/\s*([+\-\u2212\u2013\u2014])\s*/);
    if (parts.length < 3 || parts.length % 2 === 0) return null;
    const terms = [];
    for (let i = 0; i < parts.length; i += 2) {
        let term = parts[i].trim();
        if (!term) return null;
        let sign = 1;
        if (i === 0 && /^[+\-\u2212\u2013\u2014]/.test(term)) {
            const op = term[0];
            term = term.slice(1).trim();
            if (!term) return null;
            sign = (op === '+') ? 1 : -1;
        }
        if (i > 0) {
            sign = (parts[i - 1] === '+') ? 1 : -1;
        }
        terms.push({ sign, term });
    }
    if (terms.length < 2) return null;
    return terms;
}

export default { normalizeFa, normalizeEn, containsFa, parseArithmetic };
