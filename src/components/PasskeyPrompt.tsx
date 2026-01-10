import React, { useState } from 'react';
import { X, Fingerprint, Shield } from 'lucide-react';
import { usePasskey } from '../hooks/usePasskey';

interface PasskeyPromptProps {
  onClose: () => void;
  onSkip: () => void;
}

export default function PasskeyPrompt({ onClose, onSkip }: PasskeyPromptProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const { registerPasskey } = usePasskey();

  const handleSetupPasskey = async () => {
    setLoading(true);

    try {
      const result = await registerPasskey();

      if (result?.verified) {
        // Success - close the prompt
        onClose();
      }
    } catch (err) {
      console.error('Passkey setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Fingerprint className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Secure Your Account
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Add a passkey for faster, more secure sign-ins
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="text-green-600 mt-1" size={20} />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Passwordless Sign-In</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Use Face ID, Touch ID, or Windows Hello instead of typing your password
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="text-green-600 mt-1" size={20} />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Phishing-Resistant</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Passkeys can't be stolen or phished like passwords
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="text-green-600 mt-1" size={20} />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Sync Across Devices</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Works seamlessly across all your devices via iCloud or Google
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSetupPasskey}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Fingerprint size={20} />
                Set Up Passkey
              </>
            )}
          </button>
          <button
            onClick={onSkip}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Skip
          </button>
        </div>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
          You can always set up a passkey later in Security Settings
        </p>
      </div>
    </div>
  );
}
