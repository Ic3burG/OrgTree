
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { generateToken, generateRefreshToken, storeRefreshToken, validateRefreshToken } from '../services/auth.service.js';
import { setupTotp, verifyTotp, verifyAndEnableTotp, generateTotpToken } from '../services/totp.service.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from server/.env
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
// Fallback if running from server dir
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Mock specific stuff
const MOCK_EMAIL = `test-2fa-debug-${randomUUID()}@example.com`;
const MOCK_PASSWORD = 'password123';

async function runTest() {
  console.log('--- Starting 2FA Flow Debug ---');

  // 1. Create a user manually
  console.log('1. Creating test user...');
  const userId = randomUUID();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) 
     VALUES (?, ?, ?, ?, 'superuser', datetime('now'), datetime('now'))`
  ).run(userId, 'Debug User', MOCK_EMAIL, 'hash');

  try {
    // 2. Setup 2FA
    console.log('2. Setting up 2FA...');
    const setup = await setupTotp(userId, MOCK_EMAIL);
    // Enable it
    const success = verifyAndEnableTotp(userId, setup.token); // This uses the "token" which is actually the formatting? No.
    // Wait, setupTotp returns { secret, qrCodeUrl, backupCodes }. It doesn't return a token to verify?
    // User generates token from app.
    
    // Actually verifyAndEnableTotp expects a 6-digit code.
    // I need to generate a code using the secret.
    // 2FA code generation
    const code = generateTotpToken(setup.secret);
    
    const enableSuccess = verifyAndEnableTotp(userId, code);
    console.log(`   2FA Enabled: ${enableSuccess}`);
    
    if (!enableSuccess) throw new Error('Failed to enable 2FA');

    // 3. Verify Login (The problematic step)
    console.log('3. Verifying Login...');
    const loginCode = generateTotpToken(setup.secret);
    const isValid = verifyTotp(userId, loginCode);
    console.log(`   Detailed verifyTotp result: ${isValid}`);
    
    if (!isValid) throw new Error('verifyTotp failed');

    // 4. Generate Tokens (Simulating routes/totp.ts)
    console.log('4. Generating Tokens...');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken();
    storeRefreshToken(userId, refreshToken);
    
    console.log('   Access Token:', accessToken.substring(0, 20) + '...');
    console.log('   Refresh Token:', refreshToken.substring(0, 20) + '...');

    // 5. Test Access Token against Middleware Logic
    console.log('5. Testing Access Token validation (authenticateToken logic)...');
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET as string);
      console.log('   ✅ Access Token verified successfully');
      console.log('   Decoded:', decoded);
    } catch (e) {
      console.error('   ❌ Access Token verification FAILED:', e.message);
    }

    // 6. Test Refresh Token logic
    console.log('6. Testing Refresh Token validation...');
    const refreshResult = validateRefreshToken(refreshToken);
    if (refreshResult) {
       console.log('   ✅ Refresh Token verified successfully');
       console.log('   Result:', refreshResult);
    } else {
       console.error('   ❌ Refresh Token verification FAILED');
    }

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  } finally {
    // Cleanup
    console.log('Cleaning up...');
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
  }
}

runTest();
