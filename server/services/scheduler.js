import { scanOverstays, expireStaleTracking } from './alertService.js';

export function startScheduler() {
  const run = async () => {
    try {
      await scanOverstays();
      await expireStaleTracking();
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  };
  run();
  return setInterval(run, 60 * 1000);
}
