import { IntegrationLogger } from '@jupiterone/integration-sdk-core';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const promiseRetry = require('promise-retry');

const RETRY_OPTIONS = {
  retries: 10,
  factor: 2,
  // TODO reduce min/max timeouts. Since API rate limits are handled by Okta client, these should be small.
  minTimeout: 15000,
  maxTimeout: 60000,
  randomize: true,
};

type InputFunction = () => Promise<any>;

/**
 * A utility function for retrying functions unless they return 4xx errors
 */
export default function retryApiCall(
  logger: IntegrationLogger,
  func: InputFunction,
): Promise<any> {
  return promiseRetry(async (retry: (args: any) => any, number: number) => {
    logger.trace(`Attempt number ${number}`);
    try {
      const response = await func();
      return response;
    } catch (err) {
      logger.info({ err }, 'Encountered API error');

      if (err.status >= 400 && err.status < 500) {
        // While a 429 rate limit error code should be retried, rate limit retries are natively handled by the
        // Okta client these requests use. Hence, there is no need for us to retry 429s.
        //
        // All other >= 400 error codes should not be retried.
        logger.warn({ err }, `Encountered ${err.status} in API call; exiting`);
        throw err;
      } else {
        logger.warn({ err }, `Encountered ${err.code} in API call; retrying.`);
        await retry(err);
      }
    }
  }, RETRY_OPTIONS);
}
