// RUNTIME INVARIANT TESTS — MOBILE USABILITY
//
// Owner report (2026-09-11): on a phone the site is "hard to use". A 390x844
// audit of the live site (production, signed in) measured:
//   - 20-63 text elements per page rendered at 8-11px
//   - header menu / bell / account controls at 33x33 and smaller
//   - VIXY Live: 19 of 22 tap targets under 36px (+ ADD BOX 28px tall,
//     card expand / minimize / menu icons 20x20)
//   - Command Center: the CONTRACT / STRIKE row overflowed and clipped the strike
//   - landing footer links 16px tall
// These invariants keep the fixes from regressing.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(join(here, '..', p), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== MOBILE USABILITY INVARIANTS ===\n');

console.log('[1] Tiny text is raised on phones only');
const css = R('src/index.css');
const mobileBlock = css.slice(css.indexOf('@media (max-width: 639px)'));
check('a phone-only readability block exists', /@media \(max-width: 639px\)/.test(css));
check('8-10.5px text renders at 11px on phones', /\.text-\\\[8px\\\], \.text-\\\[9px\\\], \.text-\\\[9\\\.5px\\\], \.text-\\\[10px\\\], \.text-\\\[10\\\.5px\\\] \{ font-size: 11px !important; \}/.test(mobileBlock));
check('11-11.5px text renders at 12px on phones', /\.text-\\\[11px\\\], \.text-\\\[11\\\.5px\\\] \{ font-size: 12px !important; \}/.test(mobileBlock));
check('the rule is scoped to phones (desktop untouched)', !/^\s*\.text-\\\[9px\\\][^{]*\{[^}]*font-size: 11px/m.test(css.slice(0, css.indexOf('@media (max-width: 639px)'))));

console.log('\n[2] Header controls are at least 40px');
const header = R('src/components/Header.tsx');
check('mobile menu button uses p-2.5 around a 20px icon', /lg:hidden p-2\.5 rounded-xl/.test(header));
check('notification bell has a 40px minimum', /p-2\.5 min-w-\[40px\] min-h-\[40px\] rounded-xl border/.test(header));
check('account button has a 40px minimum height', /px-3 py-1\.5 min-h-\[40px\] rounded-xl bg-\[#0d0722\]/.test(header));

console.log('\n[3] VIXY Live controls are finger-sized on phones');
const live = R('src/components/VixyLiveWorkspace.tsx');
check('+ ADD BOX is taller on phones', /px-3\.5 py-2\.5 sm:py-1\.5 rounded-xl bg-purple-600/.test(live));
check('CUSTOMIZE is taller on phones', /px-3 py-2\.5 sm:py-1\.5 rounded-xl font-mono text-xs font-bold border/.test(live));
check('card expand / minimize / menu icons get larger padding on phones', (live.match(/p-2\.5 sm:p-1\.5 rounded-lg bg-\[#191333\]\/90/g) || []).length === 3);
check('no card control is left at the old 20px size', !/"p-1\.5 rounded-lg bg-\[#191333\]\/90/.test(live));
check('the card menu opens below the larger trigger', /absolute right-0 top-11 sm:top-8 w-48/.test(live));

console.log('\n[4] Command Center contract row wraps instead of clipping');
const hub = R('src/components/VixyHubView.tsx');
check('the row wraps', /flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 max-w-full text-\[11px\] sm:text-xs text-slate-400 font-mono/.test(hub));
check('the contract id truncates within the row width', /<span className="truncate max-w-full">CONTRACT:/.test(hub));
check('the separator dot is hidden on phones', /<span className="hidden sm:inline text-purple-900">•<\/span>/.test(hub));

console.log('\n[5] Landing footer links are tappable');
const landing = R('src/components/LandingPage.tsx');
check('landing Terms of Service link has a 40px minimum height', (landing.match(/inline-flex items-center min-h-\[40px\] /g) || []).length >= 1);
const app = R('src/App.tsx');
check('site footer links (About Us and siblings) have a 40px minimum height', /className="inline-flex items-center min-h-\[40px\] hover:text-white transition-colors">About Us<\/button>/.test(app));
check('no site footer link is left without the tap height', !/className="hover:text-white transition-colors">About Us/.test(app));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
