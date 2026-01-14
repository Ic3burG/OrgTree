import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Smartphone,
  Trash2,
  Shield,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import type { Session } from '../../types/index.js';

interface SessionsResponse {
  sessions: Session[];
}

interface RevokeOthersResponse {
  revokedCount: number;
}

export default function SessionsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState<boolean>(false);

  const fetchSessions = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSessions();
      // API returns { sessions: Session[] }
      setSessions((data as unknown as SessionsResponse).sessions || []);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load sessions');
      } else {
        setError('Failed to load sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string): Promise<void> => {
    try {
      setRevoking(sessionId);
      await api.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to revoke session');
      } else {
        setError('Failed to revoke session');
      }
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async (): Promise<void> => {
    try {
      setRevokingAll(true);
      const result = await api.revokeOtherSessions();
      // Refresh the list
      await fetchSessions();
      // Show success message briefly
      if ((result as unknown as RevokeOthersResponse).revokedCount > 0) {
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to revoke other sessions');
      } else {
        setError('Failed to revoke other sessions');
      }
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getDeviceIcon = (deviceInfo: string | null | undefined): React.JSX.Element => {
    if (!deviceInfo) return <Monitor size={20} />;
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone size={20} />;
    }
    return <Monitor size={20} />;
  };

  const getDeviceName = (deviceInfo: string | null | undefined): string => {
    if (!deviceInfo) return 'Unknown Device';
    // Parse user agent to get a readable name
    if (deviceInfo.includes('Chrome')) return 'Chrome Browser';
    if (deviceInfo.includes('Firefox')) return 'Firefox Browser';
    if (deviceInfo.includes('Safari') && !deviceInfo.includes('Chrome')) return 'Safari Browser';
    if (deviceInfo.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  };

  return (
    <div className="space-y-6">
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
            {sessions.map(session => (
              <div
                key={session.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                    {getDeviceIcon(session.device_info)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {getDeviceName(session.device_info)}
                      {session.is_current && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {session.ip_address || 'Unknown IP'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Last active: {formatDate(session.last_used_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revoking === session.id || session.is_current}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={session.is_current ? "Can't revoke current session" : 'Revoke session'}
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
  );
}
