
import { generateTotpToken } from './server/src/services/totp.service.js';
const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const token = generateTotpToken(secret);
console.log('TOKEN:' + token);
