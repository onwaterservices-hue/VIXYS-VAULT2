// The in-pass upgrade prompt is a commercial surface inside a product whose
// standing rule is that nothing shown to a subscriber may be fabricated. These
// checks lock the honesty properties of that prompt so a later edit cannot
// quietly turn it into a fake-urgency banner.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('day-pass-upsell.characterization');
const raw = readRepoFile('src/components/DayPassUpgradePrompt.tsx');
const code = raw
  .split('\n')
  .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
  .join('\n');

// --- The countdown must be sourced, never assumed -------------------------
t.check(
  'countdown is derived from the server-issued expiresAt',
  code.includes('dayPassInfo?.expiresAt') && code.includes('new Date(dayPassInfo.expiresAt).getTime()')
);
t.check(
  'renders nothing when there is no sourced expiry',
  code.includes('if (!dayPassInfo?.active || expiryMs === null) return null;')
);
t.check(
  'never counts down from an assumed full-length pass',
  !code.includes('secondsRemaining: 86400') && !code.includes('|| 86400')
);

// --- No manufactured scarcity --------------------------------------------
const scarcity = [
  'offer expires',
  'limited time',
  'only .* left',
  'act now',
  'last chance',
  'spots remaining',
  'price goes up',
  'special price',
  '% off',
  'discount',
];
for (const phrase of scarcity) {
  t.check(
    `no manufactured scarcity: "${phrase}"`,
    !new RegExp(phrase, 'i').test(code)
  );
}

// --- Persuasion is arithmetic already published on the pricing page -------
t.check('anchors three passes at $29.97', code.includes('$29.97'));
t.check('anchors Starter at $29', code.includes('$29<') || code.includes('>$29') || code.includes('$29'));

// --- It must not spend the engine's visual vocabulary --------------------
// vx-aura-* means "the decision engine is in this lifecycle state". Using it
// on an upsell would make a glow stop meaning one thing.
t.check(
  'does not reuse the engine lifecycle aura classes',
  !code.includes('vx-aura')
);

// --- Targeting ------------------------------------------------------------
t.check(
  'existing subscribers are excluded',
  code.includes('SUBSCRIBER_ROLES') && code.includes("'PRO'") && code.includes("'ELITE'") && code.includes("'STARTER'")
);
t.check(
  'suppressed on pricing, landing and auth surfaces',
  code.includes("activeTab === 'pricing'") && code.includes("activeTab === 'landing'") && code.includes("activeTab === 'auth'")
);
t.check(
  'only fires inside a bounded window before expiry',
  code.includes('PROMPT_WINDOW_SEC') && code.includes('secondsLeft > PROMPT_WINDOW_SEC')
);

// --- Dismissal must stick, and must re-arm for a genuinely new pass -------
t.check(
  'dismissal is scoped to the specific pass instance',
  code.includes('dismissedFor === dayPassInfo.expiresAt') &&
    code.includes('localStorage.setItem(DISMISS_KEY, dayPassInfo.expiresAt)')
);
t.check(
  'storage access is guarded so a blocked store cannot crash the shell',
  (code.match(/try \{/g) || []).length >= 2 && code.includes('catch')
);

// --- It has to actually be mounted ---------------------------------------
const app = readRepoFile('src/App.tsx');
t.check('mounted in App', app.includes('<DayPassUpgradePrompt'));
t.check('receives the live day pass record', app.includes('dayPassInfo={dayPassInfo}'));

// --- Positioning regression guard ----------------------------------------
// .hud-corners declares position: relative. On the same element as .fixed it
// wins the cascade and drops the card into normal flow at the top of the page
// instead of pinning it bottom-right. Caught by a local visual harness before
// merge on 2026-09-10.
const shell = raw.match(/className="(fixed [^"]*)"/);
t.check('the fixed shell exists', !!shell);
t.check('the fixed shell does not carry hud-corners', !!shell && !shell[1].includes('hud-corners'));
t.check('hud-corners still decorates an inner wrapper', raw.includes('className="hud-corners amber'));

t.done();
