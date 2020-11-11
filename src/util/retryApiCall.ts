import { IntegrationLogger } from "@jupiterone/jupiter-managed-integration-sdk";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const promiseRetry = require("promise-retry");

const RETRY_OPTIONS = {
  retries: 10,
  factor: 2,
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
  return promiseRetry(async (retry: any) => {
    try {
      const response = await func();
      return response;
    } catch (err) {
      logger.trace({ err }, "Encountered API error");

      if (err.status === 429) {
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
        retry(err);
      } else if (NON_RETRYABLE_CODES.includes(err.code)) {
        logger.info({ err }, `Encountered ${err.code} in API call; exiting.`);
        throw err;
      } else {
        logger.info({ err }, `Encountered ${err.code} in API call; retrying.`);
        retry(err);
      }
    }
  }, RETRY_OPTIONS);
}
