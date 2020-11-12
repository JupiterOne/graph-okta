import { IntegrationLogger } from "@jupiterone/jupiter-managed-integration-sdk";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const promiseRetry = require("promise-retry");

const RETRY_OPTIONS = {
  retries: 10,
  factor: 2,
  // TODO reduce min/max timeouts. Since API rate limits are handled by Okta client, these should be small.
  minTimeout: 15000,
  maxTimeout: 60000,
  randomize: true,
};

type InputFunction = () => Promise<any>;

const NON_RETRYABLE_CODES: string[] = [];

/**
 * A utility function for retrying functions that hit a rate limit error
 */
export default async function retryApiCall(
  logger: IntegrationLogger,
  func: InputFunction,
): Promise<any> {
  return promiseRetry(async (retry: (args: any) => any, number: number) => {
    logger.trace(`Attempt number ${number}`);
    try {
      const response = await func();
      return response;
    } catch (err) {
      logger.info({ err }, "Encountered API error");

      if (err.status === 429) {
        // this is never encountered because of the Okta client's internal retry logic:
        // https://github.com/okta/okta-sdk-nodejs/blob/master/src/default-request-executor.js#L87
        logger.info({ err }, "Hit API rate limit, waiting to retry ...");
        // TODO: respect rate limit headers returned by Okta

        // const rateLimitReset = err.headers._headers['x-rate-limit-reset'];
        // if (rateLimitReset && rateLimitReset.length) {
        //   const timeout =
        //     new Date((rateLimitReset[0] as number) * 1000).getTime() -
        //     Date.now();
        //   logger.info(
        //     { rateLimitReset },
        //     `Setting retry time out to match x-rate-limit-reset: ${timeout}`
        //   );
        //   RETRY_OPTIONS.minTimeout = timeout;
        //   RETRY_OPTIONS.maxTimeout = timeout + 1000;
        // }
        await retry(err);
      } else if (NON_RETRYABLE_CODES.includes(err.code)) {
        logger.warn({ err }, `Encountered ${err.code} in API call; exiting.`);
        throw err;
      } else {
        logger.warn({ err }, `Encountered ${err.code} in API call; retrying.`);
        await retry(err);
      }
    }
  }, RETRY_OPTIONS);
}
