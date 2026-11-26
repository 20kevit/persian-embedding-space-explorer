/**
 * run.mjs — runs the full Node test suite
 */
import './data-integrity.test.mjs';
import './translation.test.mjs';
import './search.test.mjs';
import './arithmetic.test.mjs';
import './localization.test.mjs';
import { summary } from './helpers.mjs';

const ok = summary();
process.exit(ok ? 0 : 1);
