import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an ok status with a timestamp', () => {
    const controller = new HealthController();
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
