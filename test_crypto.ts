process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY = '12345678901234567890123456789012'; 
import { encryptString, decryptString } from './src/services/trading/kalshiExecutionEngine';

const pt = 'mock_key_id';
const encObj = encryptString(pt);
console.log("encObj:", encObj);
const encStr = `${encObj.iv}:${encObj.encryptedData}:${encObj.tag}`;
console.log("encStr:", encStr);
const decStr = decryptString(encStr);
console.log("decStr:", decStr);

