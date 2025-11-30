import { useState, useEffect } from 'react';
import { X, Link2, RefreshCw, Copy, Check, Globe, Lock } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';

export default function ShareModal({ orgId, orgName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  // Load share settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const settings = await api.getShareSettings(orgId);
        setIsPublic(settings.isPublic);
        setShareUrl(settings.shareUrl || '');
      } catch (err) {
        console.error('Failed to load share settings:', err);
        toast.error('Failed to load share settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId, toast]);

  // Toggle public/private
  const handleTogglePublic = async () => {
    try {
      setSaving(true);
      const newIsPublic = !isPublic;
      const result = await api.updateShareSettings(orgId, newIsPublic);
      setIsPublic(result.isPublic);
      setShareUrl(result.shareUrl || '');
      toast.success(newIsPublic ? 'Organization is now public' : 'Organization is now private');
    } catch (err) {
      console.error('Failed to update share settings:', err);
      toast.error('Failed to update share settings');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate share token
  const handleRegenerateToken = async () => {
    if (!confirm('This will invalidate the current link. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      const result = await api.regenerateShareToken(orgId);
      setShareUrl(result.shareUrl);
      toast.success('Share link regenerated successfully');
    } catch (err) {
      console.error('Failed to regenerate share token:', err);
      toast.error('Failed to regenerate share link');
    } finally {
      setSaving(false);
    }
  };

  // Copy share URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link2 className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Share Organization</h2>
              <p className="text-sm text-slate-600 mt-1">{orgName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Public/Private Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="text-green-600" size={20} />
                  ) : (
                    <Lock className="text-slate-500" size={20} />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">
                      {isPublic ? 'Public' : 'Private'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {isPublic
                        ? 'Anyone with the link can view'
                        : 'Only you can view this organization'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTogglePublic}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isPublic ? 'bg-blue-600' : 'bg-slate-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Share Link */}
              {isPublic && shareUrl && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-sm font-mono"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check size={18} />
                          <span className="hidden sm:inline">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Regenerate Token */}
                  <button
                    onClick={handleRegenerateToken}
                    disabled={saving}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} />
                    Regenerate link
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {isPublic ? (
                    <>
                      <strong>Public sharing is enabled.</strong> Anyone with the link can view
                      this organization chart in read-only mode.
                    </>
                  ) : (
                    <>
                      <strong>Private mode.</strong> Enable public sharing to generate a shareable
                      link that anyone can use to view this organization chart.
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
