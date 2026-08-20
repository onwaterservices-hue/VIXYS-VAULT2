const fs = require("fs");
const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return "vixy$" + salt + ":" + derivedKey;
}

const storePath = "data/vixy_store.json";
let store = { users: [], dayPasses: {} };
if (fs.existsSync(storePath)) {
  store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
}

const targetEmail = "kolpnimo99@gmail.com";
const targetPass = "Kol061931193";
const passHash = hashPassword(targetPass);

// Update user in users array
if (!store.users) store.users = [];
let user = store.users.find((u) => u.email?.toLowerCase() === targetEmail);
if (!user) {
  user = {
    id: "usr_kolpnimo99_gmail_com",
    uid: "usr_kolpnimo99_gmail_com",
    email: targetEmail,
    name: "kolpnimo99",
    role: "USER",
    subscription: "NONE",
    status: "ACTIVE",
    joined: new Date().toISOString(),
    verificationStatus: "VERIFIED",
  };
  store.users.unshift(user);
}

user.passwordHash = passHash;
user.status = "ACTIVE";
user.verificationStatus = "VERIFIED";

// Add 24-hour day pass
if (!store.dayPasses) store.dayPasses = {};
const expiresAt = new Date(Date.now() + 86400000 * 2).toISOString(); // 48 hours for buffer
const dpRecord = {
  entitlementId: `dp_venmo_kolpnimo99`,
  userId: user.id || `usr_kolpnimo99_gmail_com`,
  email: targetEmail,
  guildId: "1451337712937336985",
  entitlementType: "DAY_PASS",
  accessTier: "ELITE",
  status: "ACTIVE",
  duration: "24-Hour Trial Day Pass Access (Venmo Verified)",
  activatedAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  expiresAt: expiresAt,
  stripePaymentStatus: "PAID_VENMO",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  troubleshootingGraceApplied: true,
};

store.dayPasses[targetEmail] = dpRecord;
store.dayPasses[user.id] = dpRecord;

fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
console.log("Successfully added/updated kolpnimo99@gmail.com in vixy_store.json with password hash and active 24H Day Pass!");
