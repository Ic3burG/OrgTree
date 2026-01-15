import { useEffect, useCallback, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

interface RealtimePayload {
  type?: string;
  action?: string;
  data?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  };
  meta?: {
    actorId?: string;
    actorName?: string;
  };
}

interface RealtimeUpdateOptions {
  onDepartmentChange?: (payload: RealtimePayload) => void;
  onPersonChange?: (payload: RealtimePayload) => void;
  onMemberChange?: (payload: RealtimePayload) => void;
  onOrgChange?: (payload: RealtimePayload) => void;
  onCustomFieldDefinitionChange?: () => void;
  showNotifications?: boolean;
}

interface RealtimeUpdateReturn {
  recentlyChanged: Set<string>;
  isRecentlyChanged: (id: string) => boolean;
}

/**
 * Hook for subscribing to real-time updates for an organization
 * @param orgId - Organization ID to listen for updates
 * @param options - Configuration options
 */
export function useRealtimeUpdates(
  orgId: string | undefined,
  options: RealtimeUpdateOptions = {}
): RealtimeUpdateReturn {
  const { subscribe, joinOrg, leaveOrg } = useSocket();
  const { user } = useAuth();
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());

  const {
    onDepartmentChange,
    onPersonChange,
    onMemberChange,
    onOrgChange,
    showNotifications = true,
  } = options;

  // Track recently changed items for highlighting
  const markAsChanged = useCallback((id: string): void => {
    setRecentlyChanged(prev => new Set([...prev, id]));
    // Clear after 3 seconds
    setTimeout(() => {
      setRecentlyChanged(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);
  }, []);

  // Check if we should ignore this event (it's from ourselves)
  const shouldIgnore = useCallback(
    (payload: RealtimePayload): boolean => {
      return payload?.meta?.actorId === user?.id;
    },
    [user?.id]
  );

  // Create notification message
  const getNotificationMessage = useCallback((payload: RealtimePayload): string => {
    const actor = payload?.meta?.actorName || 'Someone';
    const type = payload?.type;
    const action = payload?.action;
    const name = payload?.data?.name || '';

    const actionVerbs: Record<string, string> = {
      created: 'added',
      updated: 'updated',
      deleted: 'removed',
      added: 'added',
      removed: 'removed',
    };

    const verb = action ? actionVerbs[action] || action : 'changed';

    switch (type) {
      case 'department':
        return `${actor} ${verb} department "${name}"`;
      case 'person':
        return `${actor} ${verb} "${name}"`;
      case 'member':
        return action === 'removed'
          ? `${actor} removed a team member`
          : `${actor} ${verb} a team member`;
      case 'org':
        return action === 'settings'
          ? `${actor} updated sharing settings`
          : `${actor} updated organization settings`;
      default:
        return `${actor} made changes`;
    }
  }, []);

  // Join/leave org room
  useEffect(() => {
    if (!orgId) return;

    joinOrg(orgId);

    return () => {
      leaveOrg(orgId);
    };
  }, [orgId, joinOrg, leaveOrg]);

  // Subscribe to department events
  useEffect(() => {
    if (!orgId || !onDepartmentChange) return;

    const handlers = [
      subscribe('department:created', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        if (payload.data?.id) markAsChanged(payload.data.id);
        onDepartmentChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('department:updated', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        if (payload.data?.id) markAsChanged(payload.data.id);
        onDepartmentChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('department:deleted', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onDepartmentChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
    ];

    return () => handlers.forEach(unsubscribe => unsubscribe?.());
  }, [
    orgId,
    subscribe,
    onDepartmentChange,
    shouldIgnore,
    showNotifications,
    markAsChanged,
    getNotificationMessage,
  ]);

  // Subscribe to person events
  useEffect(() => {
    if (!orgId || !onPersonChange) return;

    const handlers = [
      subscribe('person:created', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        if (payload.data?.id) markAsChanged(payload.data.id);
        onPersonChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('person:updated', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        if (payload.data?.id) markAsChanged(payload.data.id);
        onPersonChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('person:deleted', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onPersonChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
    ];

    return () => handlers.forEach(unsubscribe => unsubscribe?.());
  }, [
    orgId,
    subscribe,
    onPersonChange,
    shouldIgnore,
    showNotifications,
    markAsChanged,
    getNotificationMessage,
  ]);

  // Subscribe to member events
  useEffect(() => {
    if (!orgId || !onMemberChange) return;

    const handlers = [
      subscribe('member:added', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onMemberChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('member:updated', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onMemberChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('member:removed', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onMemberChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
    ];

    return () => handlers.forEach(unsubscribe => unsubscribe?.());
  }, [orgId, subscribe, onMemberChange, shouldIgnore, showNotifications, getNotificationMessage]);

  // Subscribe to org events
  useEffect(() => {
    if (!orgId || !onOrgChange) return;

    const handlers = [
      subscribe('org:updated', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onOrgChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('org:settings', (...args: unknown[]) => {
        const payload = args[0] as RealtimePayload;
        if (shouldIgnore(payload)) return;
        onOrgChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
    ];

    return () => handlers.forEach(unsubscribe => unsubscribe?.());
  }, [orgId, subscribe, onOrgChange, shouldIgnore, showNotifications, getNotificationMessage]);

  return {
    recentlyChanged,
    isRecentlyChanged: (id: string): boolean => recentlyChanged.has(id),
  };
}

export default useRealtimeUpdates;
