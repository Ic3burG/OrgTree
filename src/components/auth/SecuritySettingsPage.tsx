import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Trash2,
  Plus,
  Shield,
  AlertCircle,
  CheckCircle,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { usePasskey } from '../../hooks/usePasskey';

interface Passkey {
  id: string;
  credentialId: string;
  createdAt: string;
  lastUsedAt: string;
}

interface TotpSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export default function SecuritySettingsPage(): React.JSX.Element {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const { registerPasskey, listPasskeys, deletePasskey, loading: passkeyLoading } = usePasskey();

  const fetchPasskeys = async () => {
    try {
      const keys = await listPasskeys();
      setPasskeys(keys);
    } catch (err) {
      console.error('Failed to fetch passkeys:', err);
      setMessage({ type: 'error', text: 'Failed to load passkeys' });
    }
  };

  const fetchTotpStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setTotpEnabled(data.enabled);
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchPasskeys(), fetchTotpStatus()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAddPasskey = async () => {
    setMessage(null);

    try {
      const result = await registerPasskey();

      if (result?.verified) {
        setMessage({ type: 'success', text: 'Passkey added successfully!' });
        await fetchPasskeys();
      } else {
        setMessage({ type: 'error', text: 'Failed to add passkey' });
      }
    } catch (err) {
      console.error('Add passkey error:', err);
      setMessage({ type: 'error', text: 'Failed to add passkey' });
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm('Are you sure you want to delete this passkey?')) {
      return;
    }

    setMessage(null);

    try {
      await deletePasskey(passkeyId);
      setMessage({ type: 'success', text: 'Passkey deleted successfully' });
      await fetchPasskeys();
    } catch (err) {
      console.error('Delete passkey error:', err);
      setMessage({ type: 'error', text: 'Failed to delete passkey' });
    }
  };

  const handleSetup2FA = async () => {
    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await response.json();
      setTotpSetup(data);
      setShowBackupCodes(true);
    } catch (err) {
      console.error('2FA setup error:', err);
      setMessage({ type: 'error', text: 'Failed to setup 2FA' });
    }
  };

  const handleVerify2FA = async () => {
    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ token: totpToken }),
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      setMessage({ type: 'success', text: '2FA enabled successfully!' });
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpToken('');
      setShowBackupCodes(false);
    } catch (err) {
      console.error('2FA verification error:', err);
      setMessage({ type: 'error', text: 'Invalid verification code. Please try again.' });
    }
  };

  const handleDisable2FA = async () => {
    if (
      !confirm('Are you sure you want to disable 2FA? This will make your account less secure.')
    ) {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      setMessage({ type: 'success', text: '2FA disabled successfully' });
      setTotpEnabled(false);
    } catch (err) {
      console.error('2FA disable error:', err);
      setMessage({ type: 'error', text: 'Failed to disable 2FA' });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Security Settings
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage passkeys and two-factor authentication
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Passkeys Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Fingerprint size={20} />
            Passkeys
          </h2>

          <button
            onClick={handleAddPasskey}
            disabled={passkeyLoading || loading}
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Add Passkey
          </button>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <Fingerprint className="mx-auto mb-3 text-slate-400" size={48} />
              <p className="text-slate-600 dark:text-slate-400">No passkeys added yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Add a passkey to enable passwordless sign-in
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map(passkey => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint className="text-blue-600" size={24} />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">Passkey</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Created: {formatDate(passkey.createdAt)} • Last used:{' '}
                        {formatDate(passkey.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePasskey(passkey.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete passkey"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2FA Section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Smartphone size={20} />
            Two-Factor Authentication (2FA)
          </h2>

          {!totpEnabled && !totpSetup && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Add an extra layer of security to your account with time-based one-time passwords
                (TOTP).
              </p>
              <button
                onClick={handleSetup2FA}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Plus size={20} />
                Enable 2FA
              </button>
            </div>
          )}

          {totpSetup && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  <QrCode className="inline mr-2" size={20} />
                  Scan QR Code
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy,
                  1Password, etc.)
                </p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={totpSetup.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {showBackupCodes && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                    Backup Codes
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-3">
                    Save these backup codes in a safe place. You can use them to access your account
                    if you lose your device.
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {totpSetup.backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-700 p-2 rounded border border-yellow-300 dark:border-yellow-700"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={totpToken}
                  onChange={e => setTotpToken(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerify2FA}
                  disabled={totpToken.length !== 6}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify and Enable
                </button>
                <button
                  onClick={() => {
                    setTotpSetup(null);
                    setTotpToken('');
                    setShowBackupCodes(false);
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {totpEnabled && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-300">2FA is enabled</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Your account is protected with two-factor authentication
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisable2FA}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Security Best Practices
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• Use passkeys for the most secure and convenient sign-in experience</li>
            <li>• Enable 2FA as a backup if you primarily use password-based login</li>
            <li>• Store your backup codes in a safe place, separate from your password manager</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
