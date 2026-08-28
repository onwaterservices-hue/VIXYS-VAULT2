process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY = '12345678901234567890123456789012'; 
import { encryptString } from './src/services/trading/kalshiExecutionEngine';
import * as crypto from 'crypto';

function getEncryptionKey() {
  return crypto.createHash('sha256').update(process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY).digest();
}

function debugDecrypt(encryptedString) {
  try {
    const key = getEncryptionKey();
    const [ivHex, tagHex, encryptedHex] = encryptedString.split(':'); // WAIT! Look at this order!
    
    // Oh wait! Did I just notice the order?
    
  } catch (err) {}
}

const pt = 'mock_key_id';
const encObj = encryptString(pt);
// How does the app format it?
