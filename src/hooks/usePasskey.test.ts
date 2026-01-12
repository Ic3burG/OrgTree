import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasskey } from './usePasskey';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// Mock dependencies
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

describe('usePasskey', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fake-token');
        vi.spyOn(Storage.prototype, 'setItem');
        vi.spyOn(Storage.prototype, 'removeItem');
        vi.spyOn(Storage.prototype, 'clear');
    });

    describe('registerPasskey', () => {
        it('successfully registers a passkey', async () => {
            // Mock fetch responses
            vi.mocked(fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ challenge: 'fake-challenge' }) // start options
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ verified: true }) // verify result
                } as Response);

            // Mock WebAuthn
            vi.mocked(startRegistration).mockResolvedValue({} as any);

            const { result } = renderHook(() => usePasskey());

            let response;
            await act(async () => {
                response = await result.current.registerPasskey();
            });

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(startRegistration).toHaveBeenCalled();
            expect(response).toEqual({ verified: true });
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe(null);
        });

        it('handles start registration failure', async () => {
             vi.mocked(fetch).mockResolvedValueOnce({
                 ok: false,
             } as Response);

             const { result } = renderHook(() => usePasskey());

             await act(async () => {
                 await result.current.registerPasskey();
             });

             expect(result.current.error).toBe('Failed to start passkey registration');
             expect(startRegistration).not.toHaveBeenCalled();
        });
    });

    describe('loginWithPasskey', () => {
        it('successfully logs in with passkey', async () => {
             vi.mocked(fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ challenge: 'fake-challenge', sessionId: 'sess-1' }) 
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ accessToken: 'new-token' }) 
                } as Response);
            
            vi.mocked(startAuthentication).mockResolvedValue({} as any);

            const { result } = renderHook(() => usePasskey());

            let response;
            await act(async () => {
                response = await result.current.loginWithPasskey('test@example.com');
            });

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(startAuthentication).toHaveBeenCalled();
            expect(response).toEqual({ accessToken: 'new-token' });
        });
    });
    
    describe('listPasskeys', () => {
        it('fetches passkeys', async () => {
            const mockPasskeys = [{ id: '1', name: 'Key 1' }];
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockPasskeys
            } as Response);
            
            const { result } = renderHook(() => usePasskey());
            
            const passkeys = await result.current.listPasskeys();
            
            expect(passkeys).toEqual(mockPasskeys);
            expect(fetch).toHaveBeenCalledWith('/api/auth/passkey/list', expect.any(Object));
        });
    });
});
