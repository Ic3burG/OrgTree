import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

interface PasskeyRegistrationResult {
  verified: boolean;
  passkeyId?: string;
}

interface PasskeyLoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  accessToken: string;
  expiresIn: number;
}

export function usePasskey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerPasskey = async (): Promise<PasskeyRegistrationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get registration options from server
      const response = await fetch('/api/auth/passkey/register/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start passkey registration');
      }

      const options = await response.json();

      // 2. Create credential using WebAuthn API
      const registrationResponse = await startRegistration(options);

      // 3. Send credential to server for verification
      const verifyResponse = await fetch('/api/auth/passkey/register/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(registrationResponse),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify passkey registration');
      }

      const result: PasskeyRegistrationResult = await verifyResponse.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register passkey';
      setError(errorMessage);
      console.error('Passkey registration error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPasskey = async (email?: string): Promise<PasskeyLoginResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get authentication options from server
      const response = await fetch('/api/auth/passkey/login/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to start passkey authentication');
      }

      const { sessionId, ...options } = await response.json();

      // 2. Get credential from authenticator
      const authenticationResponse = await startAuthentication(options);

      // 3. Send assertion to server for verification
      const verifyResponse = await fetch('/api/auth/passkey/login/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          ...authenticationResponse,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify passkey authentication');
      }

      const result: PasskeyLoginResult = await verifyResponse.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to login with passkey';
      setError(errorMessage);
      console.error('Passkey authentication error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const listPasskeys = async () => {
    try {
      const response = await fetch('/api/auth/passkey/list', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch passkeys');
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to list passkeys:', err);
      throw err;
    }
  };

  const deletePasskey = async (passkeyId: string) => {
    try {
      const response = await fetch(`/api/auth/passkey/${passkeyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete passkey');
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to delete passkey:', err);
      throw err;
    }
  };

  return {
    registerPasskey,
    loginWithPasskey,
    listPasskeys,
    deletePasskey,
    loading,
    error,
  };
}
