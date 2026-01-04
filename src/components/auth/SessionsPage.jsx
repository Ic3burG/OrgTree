import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Smartphone, Trash2, Shield, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

export default function SessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId) => {
    try {
      setRevoking(sessionId);
      await api.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err.message || 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setRevokingAll(true);
      const result = await api.revokeOtherSessions();
      // Refresh the list
      await fetchSessions();
      // Show success message briefly
      if (result.revokedCount > 0) {
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke other sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo) return <Monitor size={20} />;
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone size={20} />;
    }
    return <Monitor size={20} />;
  };

  const getDeviceName = (deviceInfo) => {
    if (!deviceInfo) return 'Unknown Device';
    // Parse user agent to get a readable name
    if (deviceInfo.includes('Chrome')) return 'Chrome Browser';
    if (deviceInfo.includes('Firefox')) return 'Firefox Browser';
    if (deviceInfo.includes('Safari') && !deviceInfo.includes('Chrome')) return 'Safari Browser';
    if (deviceInfo.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Shield size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
              <p className="text-gray-600">
                Manage your active sessions across devices
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOthers}
              disabled={revokingAll}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              <span>{revokingAll ? 'Revoking...' : 'Revoke All Other Sessions'}</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg mb-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No active sessions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                      {getDeviceIcon(session.deviceInfo)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {getDeviceName(session.deviceInfo)}
                        {session.isCurrent && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.ipAddress || 'Unknown IP'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Last active: {formatDate(session.lastUsedAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revoking === session.id || session.isCurrent}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={session.isCurrent ? "Can't revoke current session" : 'Revoke session'}
                  >
                    {revoking === session.id ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">About Sessions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Each session represents a device or browser where you're logged in.</li>
            <li>Revoking a session will log that device out immediately.</li>
            <li>Sessions automatically expire after 7 days of inactivity.</li>
            <li>Changing your password will revoke all sessions.</li>
          </ul>
        </div>

        {/* User Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Logged in as <strong>{user?.name}</strong> ({user?.email})
        </div>
      </div>
    </div>
  );
}
