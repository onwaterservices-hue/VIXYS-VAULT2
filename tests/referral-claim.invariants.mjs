/**
 * VIXY VAULT - referral claim durability invariants.
 *
 * Pins the production bug found 2026-09-09: claimCode wrote only the
 * REFERRAL_CODES/{code} doc, so me() -- which shows the "you have a code"
 * layout from getStats(email).code -- never saw a freshly claimed code until
 * the owner's first referral created a REFERRAL_STATS doc. Across serverless
 * instances the page therefore stayed on "claim your code" after a successful
 * claim. These tests drive the real store against an in-memory Firestore fake.
 *
 * Run: node tests/referral-claim.invariants.mjs
 */
import { createReferralStore } from "../src/services/referral/referralService.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name); }
}

// Minimal in-memory Firestore shim matching the surface createReferralStore uses.
function makeFakeFs() {
  const store = new Map();
  const key = (ref) => ref.collection + "/" + ref.id;
  const snap = (ref) => ({
    exists: () => store.has(key(ref)),
    data: () => store.get(key(ref)),
  });
  return {
    ready: () => true,
    doc: (_db, collection, id) => ({ collection, id }),
    getDoc: async (ref) => snap(ref),
    setDoc: async (ref, data) => { store.set(key(ref), JSON.parse(JSON.stringify(data))); },
    runTransaction: async (_db, fn) => fn({
      get: async (ref) => snap(ref),
      set: (ref, data) => { store.set(key(ref), JSON.parse(JSON.stringify(data))); },
    }),
    __store: store,
  };
}

async function run() {
  const fs = makeFakeFs();
  const store = createReferralStore(() => ({}), fs, { warn() {}, error() {}, log() {} });

  console.log("\n== Claim writes the durable email->code index ==");
  await store.claimCode("VIXY20", "owner@example.com", "u1", { ownerType: "USER" });
  const stats = await store.getStats("owner@example.com");
  check("getStats(email).code returns the claimed code immediately", stats.code === "VIXY20");
  const owner = await store.getCodeOwner("VIXY20");
  check("code->owner record persisted", owner && owner.ownerEmail === "owner@example.com");

  console.log("\n== Same owner re-claiming their own code is idempotent, not an error ==");
  let idempotentOk = true, keptCreatedAt = true;
  const firstCreatedAt = owner.createdAt;
  try {
    const again = await store.claimCode("VIXY20", "OWNER@example.com", "u1", {});
    keptCreatedAt = again.createdAt === firstCreatedAt; // original doc preserved
  } catch (e) { idempotentOk = false; }
  check("re-claim by same owner does not throw", idempotentOk);
  check("re-claim preserves the original createdAt", keptCreatedAt);
  const stats2 = await store.getStats("owner@example.com");
  check("stats-index still resolves after re-claim (self-heal path)", stats2.code === "VIXY20");

  console.log("\n== A different account cannot take a claimed code ==");
  let blocked = false, reason = null;
  try { await store.claimCode("VIXY20", "someoneelse@example.com", "u2", {}); }
  catch (e) { blocked = true; reason = e.code; }
  check("different owner is rejected", blocked && reason === "CODE_TAKEN");
  const ownerAfter = await store.getCodeOwner("VIXY20");
  check("ownership unchanged after a rejected claim", ownerAfter.ownerEmail === "owner@example.com");

  console.log("\n== attribution status drives one-discount-per-account (store level) ==");
  // The my-discount endpoint and the checkout guard both read attribution
  // status + paid state; here we pin the store half they depend on.
  const fs2 = makeFakeFs();
  const store2 = createReferralStore(() => ({}), fs2, { warn() {}, error() {}, log() {} });
  await store2.claimCode("ALICE99", "alice@example.com", "u-alice", { ownerName: "Alice" });
  await store2.attachReferral("ALICE99", "friend@example.com");
  const friendAttr = await store2.getAttribution("friend@example.com");
  check("a referred friend has an attribution", Boolean(friendAttr && friendAttr.code === "ALICE99"));
  check("fresh attribution is JOINED, not CONVERTED (so the discount is still available)", friendAttr.status === "JOINED");
  const strangerAttr = await store2.getAttribution("stranger@example.com");
  check("a non-referred account has no attribution (no discount)", !strangerAttr);
  const aliceOwner = await store2.getCodeOwner("ALICE99");
  check("code owner display name is available for the congrats/label", aliceOwner && aliceOwner.ownerName === "Alice");

  console.log("\n" + pass + " passed, " + fail + " failed\n");
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
