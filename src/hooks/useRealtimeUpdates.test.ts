import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useRealtimeUpdates from './useRealtimeUpdates';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

// Mock contexts
vi.mock('../contexts/SocketContext');
vi.mock('../contexts/AuthContext');

describe('useRealtimeUpdates', () => {
    const mockOrgId = 'org-123';
    const mockJoinOrg = vi.fn();
    const mockLeaveOrg = vi.fn();
    const mockSubscribe = vi.fn();
    const mockUnsubscribe = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup mock implementations
        vi.mocked(useSocket).mockReturnValue({
            joinOrg: mockJoinOrg,
            leaveOrg: mockLeaveOrg,
            subscribe: mockSubscribe.mockReturnValue(mockUnsubscribe),
            socket: {} as any,
            isConnected: true
        });

        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'user-1', name: 'Test User' } as any,
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
            register: vi.fn(),
            loading: false,
            error: null
        });
        
        // Mock window dispatch event
        vi.spyOn(window, 'dispatchEvent');
    });

    it('joins and leaves org room on mount/unmount', () => {
        const { unmount } = renderHook(() => useRealtimeUpdates(mockOrgId));

        expect(mockJoinOrg).toHaveBeenCalledWith(mockOrgId);

        unmount();

        expect(mockLeaveOrg).toHaveBeenCalledWith(mockOrgId);
    });

    it('subscribes to department events', () => {
        const onDepartmentChange = vi.fn();
        renderHook(() => useRealtimeUpdates(mockOrgId, { onDepartmentChange }));

        expect(mockSubscribe).toHaveBeenCalledWith('department:created', expect.any(Function));
        expect(mockSubscribe).toHaveBeenCalledWith('department:updated', expect.any(Function));
        expect(mockSubscribe).toHaveBeenCalledWith('department:deleted', expect.any(Function));
    });

    it('handles incoming events', () => {
        const onDepartmentChange = vi.fn();
        // Capture the callback passed to subscribe
        let callback: Function;
        mockSubscribe.mockImplementation((event, cb) => {
            if (event === 'department:created') {
                callback = cb;
            }
            return mockUnsubscribe;
        });

        renderHook(() => useRealtimeUpdates(mockOrgId, { onDepartmentChange }));

        // Simulate incoming event
        act(() => {
            callback({
                type: 'department',
                action: 'created',
                data: { id: 'dept-1', name: 'New Dept' },
                meta: { actorId: 'other-user', actorName: 'Other User' }
            });
        });

        expect(onDepartmentChange).toHaveBeenCalled();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });

    it('ignores events from self', () => {
        const onDepartmentChange = vi.fn();
        let callback: Function;
        mockSubscribe.mockImplementation((event, cb) => {
             if (event === 'department:created') {
                 callback = cb;
             }
             return mockUnsubscribe;
        });

        renderHook(() => useRealtimeUpdates(mockOrgId, { onDepartmentChange }));

        act(() => {
             callback({
                 type: 'department',
                 action: 'created',
                 data: { id: 'dept-1' },
                 meta: { actorId: 'user-1' } // Same as current user
             });
        });

        expect(onDepartmentChange).not.toHaveBeenCalled();
    });

    it('tracks recently changed items', () => {
        vi.useFakeTimers();
        
        let callback: Function;
        mockSubscribe.mockImplementation((event, cb) => {
            if (event === 'department:updated') {
                callback = cb;
            }
            return mockUnsubscribe;
        });
        
        const { result } = renderHook(() => useRealtimeUpdates(mockOrgId, { onDepartmentChange: vi.fn() }));
        
        act(() => {
             callback({
                 type: 'department',
                 action: 'updated',
                 data: { id: 'dept-changed' },
                 meta: { actorId: 'other' }
             });
        });

        expect(result.current.isRecentlyChanged('dept-changed')).toBe(true);

        // Advance time to expire
        act(() => {
            vi.advanceTimersByTime(3001);
        });

        expect(result.current.isRecentlyChanged('dept-changed')).toBe(false);
        vi.useRealTimers();
    });
});
