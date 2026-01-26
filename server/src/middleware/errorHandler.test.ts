import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from './errorHandler.js';

describe('Error Handler Middleware', () => {
  const mockReq = {
    path: '/test',
    method: 'GET',
    user: { id: 'user-1' },
  } as any;

  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle ValidationError', () => {
    const err = new Error('Invalid input');
    err.name = 'ValidationError';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid input' });
  });

  it('should handle UnauthorizedError', () => {
    const err = new Error('Token expired');
    err.name = 'UnauthorizedError';

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
  });

  it('should handle custom status errors', () => {
    const err = new Error('Not Found') as any;
    err.status = 404;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Not Found' });
  });

  it('should default to 500 status', () => {
    const err = new Error('Boom');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Boom' });
  });
});
