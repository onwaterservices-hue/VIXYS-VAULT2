const crypto = require('crypto');
const hash = "vixy$41aa44836c1871550e078663007456f0:168bb2106f03e6ee124832f68261d8785a780bd0fdaf49221111c37958ff927e5d83d093ee3c5296e992666c4e2976e33dfa8307703f19ef19f69bacf8c085c8";
function verifyPassword(password, storedHash) {
  try {
    const [, salt, key] = storedHash.split('$');
    const [saltHex, _] = salt.split(':');
    const saltBuf = Buffer.from(saltHex || salt, 'hex');
    const storedKey = Buffer.from(key || salt.split(':')[1], 'hex');
    const derivedKey = crypto.scryptSync(password, saltBuf, 64);
    return crypto.timingSafeEqual(storedKey, derivedKey);
  } catch (err) {
    return false;
  }
}
const tries = [
  "vixy_backend_super_secret_password_2026",
  "vixyvault0@gmail.com",
  "vixyvault",
  "vixyvault2026",
  "password123",
  "vixy123"
];
for(let p of tries) {
  if (verifyPassword(p, hash)) {
     console.log("FOUND IT:", p);
  }
}
