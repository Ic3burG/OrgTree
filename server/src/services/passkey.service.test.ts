import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db: DatabaseType = new Database(':memory:');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS passkeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT NOT NULL,
      public_key BLOB NOT NULL,
      counter INTEGER DEFAULT 0,
      transports TEXT,
      backup_eligible INTEGER DEFAULT 1,
      backup_status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT DEFAULT (datetime('now'))
    );
     CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      current_challenge TEXT
    );
  `);

  return { default: db };
});

import db from '../db.js';
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyLoginOptions,
  verifyPasskeyLogin,
  getUserPasskeys,
  deletePasskey,
} from './passkey.service.js';

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

describe('Passkey Service', () => {
  const userId = 'user-123';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    (db as DatabaseType).prepare('DELETE FROM passkeys').run();
    (db as DatabaseType).prepare('DELETE FROM users').run();
    (db as DatabaseType).prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(userId, userEmail);
    
    // Reset SimpleWebAuthn mocks defaults
    vi.mocked(generateRegistrationOptions).mockResolvedValue({ challenge: 'mock-challenge' } as any);
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({ 
      verified: true, 
      registrationInfo: { 
        credential: {
          id: 'cred-id', 
          publicKey: Buffer.from('pk'), 
          counter: 0 
        }
      } 
    } as any);
    vi.mocked(generateAuthenticationOptions).mockResolvedValue({ challenge: 'mock-challenge' } as any);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 1 } } as any);
  });

  describe('generatePasskeyRegistrationOptions', () => {
    it('should generate registration options', async () => {
      const options = await generatePasskeyRegistrationOptions(userId, userEmail);

      expect(options).toEqual({ challenge: 'mock-challenge' });
      expect(generateRegistrationOptions).toHaveBeenCalledWith(expect.objectContaining({
        rpName: 'OrgTree',
        userID: Buffer.from(userId), // Expect actual Buffer instance
        userName: userEmail,
      }));

      // Challenge is returned to be stored by controller, not stored by service
      // const user = (db as DatabaseType).prepare('SELECT current_challenge FROM users WHERE id = ?').get(userId) as any;
      // expect(user.current_challenge).toBe('mock-challenge');
    });

    it('should exclude existing credentials', async () => {
      // Insert existing passkey
      (db as DatabaseType).prepare(`
        INSERT INTO passkeys (id, user_id, credential_id, public_key)
        VALUES (?, ?, ?, ?)
      `).run('pk-1', userId, 'existing-cred-id', Buffer.from('pk'));

      await generatePasskeyRegistrationOptions(userId, userEmail);

      expect(generateRegistrationOptions).toHaveBeenCalledWith(expect.objectContaining({
        excludeCredentials: expect.arrayContaining([expect.objectContaining({ id: 'existing-cred-id' })]),
      }));
    });
  });

  describe('verifyPasskeyRegistration', () => {
    it('should verify registration and save passkey', async () => {
      const mockResponse = { id: 'cred-id', response: {} } as any;
      const expectedChallenge = 'mock-challenge';

      const result = await verifyPasskeyRegistration(userId, mockResponse, expectedChallenge);

      expect(result.verified).toBe(true);
      expect(verifyRegistrationResponse).toHaveBeenCalledWith(expect.objectContaining({
        response: mockResponse,
        expectedChallenge,
      }));

      // Check DB
      const passkeys = (db as DatabaseType).prepare('SELECT * FROM passkeys WHERE user_id = ?').all(userId);
      expect(passkeys).toHaveLength(1);
      expect(passkeys[0].credential_id).toBe('cred-id');
    });

    it('should return false if verification fails', async () => {
      vi.mocked(verifyRegistrationResponse).mockResolvedValue({ verified: false });

      const result = await verifyPasskeyRegistration(userId, {} as any, 'challenge');

      expect(result.verified).toBe(false);
      const passkeys = (db as DatabaseType).prepare('SELECT * FROM passkeys').all();
      expect(passkeys).toHaveLength(0);
    });
  });

  describe('generatePasskeyLoginOptions', () => {
    it('should generate login options allowing existing credentials', async () => {
       // Insert existing passkey
       (db as DatabaseType).prepare(`
        INSERT INTO passkeys (id, user_id, credential_id, public_key)
        VALUES (?, ?, ?, ?)
      `).run('pk-1', userId, 'existing-cred-id', Buffer.from('pk'));

      const options = await generatePasskeyLoginOptions(userId);

      expect(options).toEqual({ challenge: 'mock-challenge' });
      expect(generateAuthenticationOptions).toHaveBeenCalledWith(expect.objectContaining({
        allowCredentials: expect.arrayContaining([expect.objectContaining({ id: 'existing-cred-id' })]),
      }));
    });

    it('should work without userId (empty allowCredentials)', async () => {
        const options = await generatePasskeyLoginOptions(); // No userId
        
        // When no userId, allowCredentials might be undefined
        expect(generateAuthenticationOptions).toHaveBeenCalled();
        const callArgs = vi.mocked(generateAuthenticationOptions).mock.calls[0][0];
        expect(callArgs?.allowCredentials).toBeUndefined();
    });
  });

  describe('verifyPasskeyLogin', () => {
    it('should verify login and update counter', async () => {
        // Setup existing passkey
        (db as DatabaseType).prepare(`
            INSERT INTO passkeys (id, user_id, credential_id, public_key, counter)
            VALUES (?, ?, ?, ?, ?)
        `).run('pk-1', userId, 'cred-id', Buffer.from('pk'), 0);

        const mockResponse = { id: 'cred-id', response: {} } as any;
        
        const result = await verifyPasskeyLogin(userId, mockResponse, 'challenge');

        expect(result.verified).toBe(true);
        expect(verifyAuthenticationResponse).toHaveBeenCalled();

        // Check counter updated
        const passkey = (db as DatabaseType).prepare('SELECT counter FROM passkeys WHERE id = ?').get('pk-1') as any;
        expect(passkey.counter).toBe(1);
    });

    it('should throw if passkey not found', async () => {
        const mockResponse = { id: 'unknown-cred-id', response: {} } as any;
        
        await expect(verifyPasskeyLogin(userId, mockResponse, 'challenge'))
            .rejects.toThrow('Passkey not found');
    });
  });

  describe('CRUD', () => {
      it('should list user passkeys', async () => {
           (db as DatabaseType).prepare(`
            INSERT INTO passkeys (id, user_id, credential_id, public_key)
            VALUES (?, ?, ?, ?)
           `).run('pk-1', userId, 'cred-1', Buffer.from('pk'));
           
           (db as DatabaseType).prepare(`
            INSERT INTO passkeys (id, user_id, credential_id, public_key)
            VALUES (?, ?, ?, ?)
           `).run('pk-2', 'other-user', 'cred-2', Buffer.from('pk'));

           const result = await getUserPasskeys(userId);
           expect(result).toHaveLength(1);
           expect(result[0].id).toBe('pk-1');
      });

      it('should delete passkey', async () => {
          (db as DatabaseType).prepare(`
            INSERT INTO passkeys (id, user_id, credential_id, public_key)
            VALUES (?, ?, ?, ?)
           `).run('pk-1', userId, 'cred-1', Buffer.from('pk'));

           await deletePasskey('pk-1', userId);

           const result = await getUserPasskeys(userId);
           expect(result).toHaveLength(0);
      });
  });
});
