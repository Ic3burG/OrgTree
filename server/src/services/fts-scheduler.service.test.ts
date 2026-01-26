import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFtsMaintenance, scheduleFtsMaintenance } from './fts-scheduler.service.js';
import * as ftsService from './fts-maintenance.service.js';
import cron from 'node-cron';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
  schedule: vi.fn(),
}));

vi.mock('./fts-maintenance.service.js', () => ({
  checkFtsIntegrity: vi.fn(),
  optimizeFtsIndexes: vi.fn(),
  rebuildAllFtsIndexes: vi.fn(),
}));

describe('FTS Scheduler Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runFtsMaintenance should optimize if healthy', () => {
    (ftsService.checkFtsIntegrity as any).mockReturnValue({ healthy: true, statistics: {} });

    const result = runFtsMaintenance();

    expect(result.action).toBe('optimize');
    expect(result.success).toBe(true);
    expect(ftsService.optimizeFtsIndexes).toHaveBeenCalled();
  });

  it('runFtsMaintenance should rebuild if unhealthy', () => {
    (ftsService.checkFtsIntegrity as any).mockReturnValue({
      healthy: false,
      issues: ['out of sync'],
    });
    (ftsService.rebuildAllFtsIndexes as any).mockReturnValue({ healthy: true });

    const result = runFtsMaintenance();

    expect(result.action).toBe('rebuild');
    expect(result.success).toBe(true);
    expect(ftsService.rebuildAllFtsIndexes).toHaveBeenCalled();
  });

  it('scheduleFtsMaintenance should register cron tasks', () => {
    scheduleFtsMaintenance();
    expect(cron.schedule).toHaveBeenCalled();
  });
});
