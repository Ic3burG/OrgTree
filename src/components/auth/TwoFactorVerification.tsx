import React, { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

interface TwoFactorVerificationProps {
  userId: string;
  onVerified: (accessToken: string, user: Record<string, unknown>) => void;
  onBack: () => void;
}

export default function TwoFactorVerification({
  userId,
  onVerified,
  onBack,
}: TwoFactorVerificationProps): React.JSX.Element {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token: code,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      const data = await response.json();
      onVerified(data.accessToken, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
      >
        <ArrowLeft size={20} />
        Back to login
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 lg:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Shield className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Two-Factor Authentication
          </h1>
          <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-2">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 lg:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono bg-white dark:bg-slate-700 dark:text-slate-100"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 text-white py-3 lg:py-2 px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base lg:text-sm font-medium"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Verify'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Can't access your authenticator? Contact your administrator
        </p>
      </div>
    </div>
  );
}
