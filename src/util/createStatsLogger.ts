import { IntegrationLogger } from '@jupiterone/integration-sdk-core';

/**
 * Create a function that logs group stats every 5 minutes.
 */
export function createStatsLogger(
  stats: any,
  logger: IntegrationLogger,
  logMetrics: boolean | undefined,
) {
  const FIVE_MINUTES = 5 * 60 * 1000;
  let lastLogTime = Date.now();
  return (message: string) => {
    const now = Date.now();
    if (Date.now() - lastLogTime >= FIVE_MINUTES && logMetrics) {
      logger.info({ stats }, message);
      lastLogTime = now;
    }
  };
}
