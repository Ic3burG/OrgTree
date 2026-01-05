import { useState } from 'react';
import { X, AlertTriangle, Copy, Check, Key } from 'lucide-react';
import api from '../../api/client';

export default function ResetPasswordModal({ user, onClose }) {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'success'
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError(null);
      const result = await api.resetUserPassword(user.id);
      setTempPassword(result.temporaryPassword);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = tempPassword;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Key size={20} className="text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'confirm' && (
            <>
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg mb-4">
                <AlertTriangle size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    This will generate a new temporary password for <strong>{user?.name}</strong>.
                    They will need to use this password to log in.
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg mb-4 text-sm">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={24} className="text-green-600" />
                </div>
                <p className="text-gray-700 mb-2">
                  Password reset successfully for <strong>{user?.name}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Share this temporary password with the user. It will only be shown once.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg font-mono text-lg tracking-wider">
                    {tempPassword}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`p-2 rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                {copied && <p className="text-sm text-green-600 mt-1">Copied to clipboard!</p>}
              </div>

              <div className="p-3 bg-amber-50 rounded-lg mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Make sure to share this password securely. The user
                  should change their password after logging in.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
