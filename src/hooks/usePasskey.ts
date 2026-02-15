/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { User } from '../types';

interface PasskeyRegistrationResult {
  verified: boolean;
  passkeyId?: string;
}

interface PasskeyLoginResult {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export function usePasskey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerPasskey = async (name?: string): Promise<PasskeyRegistrationResult | null> => {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to start passkey registration');
      }

      const options = await response.json();

      // 2. Create credential using WebAuthn API
      const registrationResponse = await startRegistration(options);

      // 3. Send credential to server for verification (include name)
      const verifyResponse = await fetch('/api/auth/passkey/register/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...registrationResponse, name }),
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

  const renamePasskey = async (passkeyId: string, name: string) => {
    try {
      const response = await fetch(`/api/auth/passkey/${passkeyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename passkey');
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to rename passkey:', err);
      throw err;
    }
  };

  return {
    registerPasskey,
    loginWithPasskey,
    listPasskeys,
    deletePasskey,
    renamePasskey,
    loading,
    error,
  };
}
