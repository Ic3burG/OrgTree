import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { LogIn, Mail, Lock, AlertCircle, Fingerprint } from 'lucide-react';
import DarkModeToggle from '../ui/DarkModeToggle';
import { usePasskey } from '../../hooks/usePasskey';
import TwoFactorVerification from './TwoFactorVerification';

export default function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  const { loginWithPasskey, loading: passkeyLoading, error: passkeyError } = usePasskey();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();

      if (data.requiresTwoFactor) {
        // Show 2FA verification screen
        setRequiresTwoFactor(true);
        setTempUserId(data.tempUserId || data.user.id);
      } else {
        // Normal login - store tokens and redirect
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login');
      } else {
        setError('Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async (): Promise<void> => {
    setError('');

    try {
      const result = await loginWithPasskey(email || undefined);

      if (result) {
        // Store token and user
        localStorage.setItem('token', result.accessToken);
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);

        // Redirect
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login with passkey');
      } else {
        setError('Failed to login with passkey');
      }
    }
  };

  const handle2FAVerified = (accessToken: string, user: Record<string, unknown>): void => {
    // Store tokens and redirect
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    // Cast user to User type as we know it comes from the API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setUser(user as any);
    navigate(from, { replace: true });
  };

  const handleBackToLogin = () => {
    setRequiresTwoFactor(false);
    setTempUserId(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4 relative">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      {requiresTwoFactor && tempUserId ? (
        <TwoFactorVerification
          userId={tempUserId}
          onVerified={handle2FAVerified}
          onBack={handleBackToLogin}
        />
      ) : (
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 lg:p-8">
            <div className="text-center mb-6 lg:mb-8">
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100">
                Welcome Back
              </h1>
              <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-2">
                Sign in to your OrgTree account
              </p>
            </div>

            {(error || passkeyError) && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle size={20} />
                <span>{error || passkeyError}</span>
              </div>
            )}

            {/* Passkey Login Button */}
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading || loading}
              className="w-full mb-4 bg-blue-600 text-white py-3 lg:py-2 px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base lg:text-sm"
            >
              {passkeyLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Fingerprint size={20} />
                  Sign in with Passkey
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={20}
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 lg:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-base lg:text-sm touch-manipulation bg-white dark:bg-slate-700 dark:text-slate-100"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={20}
                  />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 lg:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-base lg:text-sm touch-manipulation bg-white dark:bg-slate-700 dark:text-slate-100"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || passkeyLoading}
                className="w-full bg-slate-700 text-white py-3 lg:py-2 px-4 rounded-lg hover:bg-slate-800 active:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base lg:text-sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm lg:text-base text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-slate-800 dark:text-slate-200 font-medium hover:underline touch-manipulation"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
