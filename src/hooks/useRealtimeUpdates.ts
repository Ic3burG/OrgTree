import { useEffect, useCallback, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for subscribing to real-time updates for an organization
 * @param {string} orgId - Organization ID to listen for updates
 * @param {Object} options - Configuration options
 * @param {Function} options.onDepartmentChange - Called when department changes
 * @param {Function} options.onPersonChange - Called when person changes
 * @param {Function} options.onMemberChange - Called when member changes
 * @param {Function} options.onOrgChange - Called when org changes
 * @param {boolean} options.showNotifications - Whether to show toast notifications
 */
export function useRealtimeUpdates(orgId, options = {}) {
  const { subscribe, joinOrg, leaveOrg } = useSocket();
  const { user } = useAuth();
  const [recentlyChanged, setRecentlyChanged] = useState(new Set());

  const {
    onDepartmentChange,
    onPersonChange,
    onMemberChange,
    onOrgChange,
    showNotifications = true,
  } = options;

  // Track recently changed items for highlighting
  const markAsChanged = useCallback(id => {
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
    payload => {
      return payload?.meta?.actorId === user?.id;
    },
    [user?.id]
  );

  // Create notification message
  const getNotificationMessage = useCallback(payload => {
    const actor = payload?.meta?.actorName || 'Someone';
    const type = payload?.type;
    const action = payload?.action;
    const name = payload?.data?.name || '';

    const actionVerbs = {
      created: 'added',
      updated: 'updated',
      deleted: 'removed',
      added: 'added',
      removed: 'removed',
    };

    const verb = actionVerbs[action] || action;

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
      subscribe('department:created', payload => {
        if (shouldIgnore(payload)) return;
        markAsChanged(payload.data?.id);
        onDepartmentChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('department:updated', payload => {
        if (shouldIgnore(payload)) return;
        markAsChanged(payload.data?.id);
        onDepartmentChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('department:deleted', payload => {
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

    return () => handlers.forEach(unsubscribe => unsubscribe());
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
      subscribe('person:created', payload => {
        if (shouldIgnore(payload)) return;
        markAsChanged(payload.data?.id);
        onPersonChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('person:updated', payload => {
        if (shouldIgnore(payload)) return;
        markAsChanged(payload.data?.id);
        onPersonChange(payload);
        if (showNotifications) {
          window.dispatchEvent(
            new CustomEvent('realtime-notification', {
              detail: { message: getNotificationMessage(payload), type: 'info' },
            })
          );
        }
      }),
      subscribe('person:deleted', payload => {
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

    return () => handlers.forEach(unsubscribe => unsubscribe());
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
      subscribe('member:added', payload => {
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
      subscribe('member:updated', payload => {
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
      subscribe('member:removed', payload => {
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

    return () => handlers.forEach(unsubscribe => unsubscribe());
  }, [orgId, subscribe, onMemberChange, shouldIgnore, showNotifications, getNotificationMessage]);

  // Subscribe to org events
  useEffect(() => {
    if (!orgId || !onOrgChange) return;

    const handlers = [
      subscribe('org:updated', payload => {
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
      subscribe('org:settings', payload => {
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

    return () => handlers.forEach(unsubscribe => unsubscribe());
  }, [orgId, subscribe, onOrgChange, shouldIgnore, showNotifications, getNotificationMessage]);

  return {
    recentlyChanged,
    isRecentlyChanged: id => recentlyChanged.has(id),
  };
}

export default useRealtimeUpdates;
