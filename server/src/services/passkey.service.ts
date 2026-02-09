import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
  AuthenticatorTransport,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import db from '../db.js';
import { randomUUID } from 'crypto';

// Challenges are now stored in HTTP-only cookies to support stateless verification and conditional UI flows
const rpName = process.env.RP_NAME || 'OrgTree';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:5173';

const MAX_PASSKEYS = 5;

interface Passkey {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: Buffer; // BLOB in DB
  counter: number;
  transports: string | null;
  backup_eligible: number;
  backup_status: number;
  name: string | null;
  created_at: string;
  last_used_at: string;
}

export async function generatePasskeyRegistrationOptions(userId: string, userEmail: string) {
  // Get user's existing passkeys to exclude them
  const userPasskeys = getUserPasskeys(userId);

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: Buffer.from(userId),
    userName: userEmail,
    attestationType: 'none',
    excludeCredentials: userPasskeys.map(passkey => ({
      id: passkey.credential_id,
      type: 'public-key',
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransport[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  };

  const options = await generateRegistrationOptions(opts);

  // Challenge is returned to be stored by controller (e.g. in cookie)

  return options;
}

export async function verifyPasskeyRegistration(
  userId: string,
  body: RegistrationResponseJSON,
  expectedChallenge: string,
  name?: string
) {
  if (!expectedChallenge) {
    throw new Error('Registration flow not started');
  }

  // Enforce passkey cap
  const existingCount = getUserPasskeys(userId).length;
  if (existingCount >= MAX_PASSKEYS) {
    throw new Error(`Maximum of ${MAX_PASSKEYS} passkeys allowed per user`);
  }

  const opts: VerifyRegistrationResponseOpts = {
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  };

  const verification = await verifyRegistrationResponse(opts);

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credential, credentialBackedUp } = registrationInfo;
    const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

    // Save passkey to DB
    const id = randomUUID();
    const transports = body.response.transports ? JSON.stringify(body.response.transports) : null;
    const passkeyName = name?.trim() || 'Passkey';

    db.prepare(
      `
      INSERT INTO passkeys (
        id, user_id, credential_id, public_key, counter, transports,
        backup_eligible, backup_status, name, created_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    ).run(
      id,
      userId,
      credentialID,
      Buffer.from(credentialPublicKey),
      counter,
      transports,
      credentialBackedUp ? 1 : 0,
      credentialBackedUp ? 1 : 0,
      passkeyName
    );

    return { verified: true, id };
  }

  return { verified: false };
}

export async function generatePasskeyLoginOptions(userId?: string) {
  // If userId is provided, we can fetch their passkeys to allow credentials
  // If not (conditional UI), we allow any
  let allowCredentials: GenerateAuthenticationOptionsOpts['allowCredentials'] | undefined;

  if (userId) {
    const userPasskeys = getUserPasskeys(userId);
    if (userPasskeys.length > 0) {
      allowCredentials = userPasskeys.map(passkey => ({
        id: passkey.credential_id,
        type: 'public-key',
        transports: passkey.transports
          ? (JSON.parse(passkey.transports) as AuthenticatorTransport[])
          : undefined,
      }));
    }
  }

  const opts: GenerateAuthenticationOptionsOpts = {
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  };

  const options = await generateAuthenticationOptions(opts);

  // We need to store the challenge. If we have userId, key by userId.
  // If not (username-less flow), we need a session ID or similar.
  // For simplicity, we'll assume the client sends back the userId found or we use a temporary session ID.
  // But here, if userId is null, we can't key by it.
  // We'll return the challenge and expect the client/session to handle it?
  // Actually, standard practice is to store it in a server-side session (cookie).
  // But our 'userChallenges' is simple map.
  // For now, let's assume we use userId if available, or we need a way to track the challenge.
  // We'll stick to requiring userId for now or returning the challenge to be sent back (insecure).
  // Better: store in a separate 'pending_auth_challenges' map keyed by challenge itself? No.
  // We'll assume userId is passed for generate for now (the UI asks for email first or we support conditional UI later).
  // If userId is provided:
  if (userId) {
    // Legacy support or monitoring could happen here
  } else {
    // Collaborative UI support
  }

  return options;
}

export async function verifyPasskeyLogin(
  userId: string,
  body: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  const passkey = getUserPasskeyByCredentialId(body.id);
  if (!passkey) {
    throw new Error('Passkey not found');
  }

  if (passkey.user_id !== userId) {
    throw new Error('Passkey does not belong to user');
  }

  const opts: VerifyAuthenticationResponseOpts = {
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.credential_id,
      publicKey: new Uint8Array(passkey.public_key),
      counter: passkey.counter,
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
    },
  };

  const verification = await verifyAuthenticationResponse(opts);

  const { verified, authenticationInfo } = verification;

  if (verified && authenticationInfo) {
    const { newCounter } = authenticationInfo;

    // Update counter and last used
    db.prepare(
      `
      UPDATE passkeys 
      SET counter = ?, last_used_at = datetime('now') 
      WHERE id = ?
    `
    ).run(newCounter, passkey.id);

    return { verified: true };
  }

  return { verified: false };
}

export function getUserPasskeys(userId: string): Passkey[] {
  return db.prepare('SELECT * FROM passkeys WHERE user_id = ?').all(userId) as Passkey[];
}

export function deletePasskey(passkeyId: string, userId: string) {
  const result = db
    .prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?')
    .run(passkeyId, userId);
  return result.changes > 0;
}

export function renamePasskey(passkeyId: string, userId: string, name: string): boolean {
  const result = db
    .prepare('UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ?')
    .run(name, passkeyId, userId);
  return result.changes > 0;
}

export { MAX_PASSKEYS };

function getUserPasskeyByCredentialId(credentialId: string): Passkey | undefined {
  return db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').get(credentialId) as
    | Passkey
    | undefined;
}
