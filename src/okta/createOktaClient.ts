/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import {
  IntegrationInfoEventName,
  IntegrationLogger,
} from '@jupiterone/integration-sdk-core';
import { AttemptContext, retry } from '@lifeomic/attempt';
import { Headers, Response } from 'node-fetch';
import { OktaIntegrationConfig } from '../types';

import { DefaultRequestExecutor } from '@okta/okta-sdk-nodejs';
import { RequestOptions } from '@okta/okta-sdk-nodejs/src/types/request-options';
import { OktaClient } from './types';

const alreadyLoggedApiUrls: string[] = [];
const getApiURL = (url: string): string => {
  const trimmedUrl = url.substring(url.indexOf('/api/v1/'));
  const idPattern = /\/([a-zA-Z0-9]{16,})(?=\/|$)/g;
  return trimmedUrl.replace(idPattern, '/{id}').replace(/\?.*$/, '');
};

let RATE_LIMIT_THRESHOLD = 0.5;
// Set threshold to 100% if account is Indeed
// https://jupiterone.atlassian.net/browse/INT-10529
if (
  process.env.JUPITERONE_ACCOUNT_ID === '2a04aebf-04ad-4649-bf8f-73abe00c81b0'
) {
  RATE_LIMIT_THRESHOLD = 1.0;
}

/**
 * A custom Okta request executor that throttles requests when `x-rate-limit-remaining` response
 * headers fall below a provided threshold.
 */
export class RequestExecutorWithEarlyRateLimiting extends DefaultRequestExecutor {
  logger: IntegrationLogger;
  minimumRateLimitRemaining: number;
  requestAfter: number | undefined;

  constructor(logger: IntegrationLogger) {
    super();
    this.logger = logger;
  }

  async withRateLimiting(fn: () => Promise<Response>) {
    const response = await fn();
    const { rateLimitLimit, rateLimitRemaining } = parseRateLimitHeaders(
      response.headers,
    );
    if (shouldThrottleNextRequest({ rateLimitLimit, rateLimitRemaining })) {
      const timeToSleepInMs = this.getRetryDelayMs(response);
      const apiURL = getApiURL(response.url);

      const rateLimitPercent = RATE_LIMIT_THRESHOLD * 100;
      if (timeToSleepInMs > 0) {
        this.logger.info(
          {
            rateLimitLimit,
            rateLimitRemaining,
            timeToSleepInMs,
            RATE_LIMIT_THRESHOLD,
            url: response.url,
          },
          `Exceeded ${rateLimitPercent}% of rate limit. Sleeping until x-rate-limit-reset`,
        );

        if (!alreadyLoggedApiUrls.includes(apiURL)) {
          const msg =
            rateLimitPercent === 100
              ? `Exceeded ${rateLimitPercent}% of rate limit for this API.`
              : `Reached requests limit`;
          this.logger.publishInfoEvent({
            description: `[${apiURL}] ${msg} - currently set as ${rateLimitLimit} requests per min.`,
            name: IntegrationInfoEventName.Info,
          });

          alreadyLoggedApiUrls.push(apiURL);
        }

        await sleep(timeToSleepInMs);
      }
    }
    return response;
  }

  async fetch(request: RequestOptions) {
    const { logger } = this;
    return await retry(
      () =>
        this.withRateLimiting(() => {
          if (
            process.env.JUPITERONE_ACCOUNT_ID ===
            '2a04aebf-04ad-4649-bf8f-73abe00c81b0'
          ) {
            this.logger.info('Fetching data', { url: request.url });
          }
          return super.fetch(request);
        }),
      {
        maxAttempts: 3,
        delay: 30_000, // 30 seconds to start
        timeout: 180_000, // 3 min timeout. We need this in case Node hangs with ETIMEDOUT
        factor: 2, //exponential backoff factor. with 30 sec start and 3 attempts, longest wait is 2 min
        handleError(err: any, attemptContext: AttemptContext) {
          /* retry will keep trying to the limits of retryOptions
           * but it lets you intervene in this function
           */
          // don't keep trying if it's not going to get better
          if (
            err.retryable === false ||
            err.status === 401 ||
            err.status === 403 ||
            err.status === 404
          ) {
            logger.warn(
              { attemptContext, err },
              `Hit an unrecoverable error when attempting fetch. Aborting.`,
            );
            attemptContext.abort();
          } else {
            logger.warn(
              { attemptContext, err },
              `Hit a possibly recoverable error when attempting fetch. Retrying in a moment.`,
            );
          }
        },
      },
    );
  }
}

export default function createOktaClient(
  logger: IntegrationLogger,
  config: OktaIntegrationConfig,
) {
  const defaultRequestExecutor = new RequestExecutorWithEarlyRateLimiting(
    logger,
  );

  defaultRequestExecutor.on(
    'backoff',
    (request: any, response: any, requestId: any, delayMs: any) => {
      logger.info(
        {
          delayMs,
          requestId,
          url: request.url,
        },
        'Okta client backoff',
      );
    },
  );

  defaultRequestExecutor.on('resume', (request: any, requestId: any) => {
    logger.info(
      {
        requestId,
        url: request.url,
      },
      'Okta client resuming',
    );
  });

  defaultRequestExecutor.on('request', (request: any) => {
    logger.trace(
      {
        url: request.url,
      },
      'Okta client initiated request',
    );
  });

  defaultRequestExecutor.on('response', (response: any) => {
    logger.trace('Okta client received response');
  });

  return new OktaClient({
    orgUrl: config.oktaOrgUrl,
    token: config.oktaApiKey,
    requestExecutor: defaultRequestExecutor,
    // Disable caching as it may be causing high memory usage
    //
    // See: https://github.com/okta/okta-sdk-nodejs#middleware
    cacheMiddleware: null,
  });
}

function parseRateLimitHeaders(headers: Headers): {
  rateLimitLimit: number | undefined;
  rateLimitRemaining: number | undefined;
} {
  const strRateLimitLimit = headers.get('x-rate-limit-limit');
  const strRateLimitRemaining = headers.get('x-rate-limit-remaining');
  return {
    rateLimitLimit: strRateLimitLimit
      ? parseInt(strRateLimitLimit, 10)
      : undefined,
    rateLimitRemaining: strRateLimitRemaining
      ? parseInt(strRateLimitRemaining, 10)
      : undefined,
  };
}

/**
 * Returns `true` if more than RATE_LIMIT_THRESHOLD * 100 of the limit has been consumed.
 *
 * We choose 50% by default here because Okta's UI allows users to easily set
 * "warning notifications" at thresholds of 60%, 70%, 80%,90%, and 100%.
 *
 * Okta actually allows for custom thresholds between 30% and 90%, so we may
 * need to make this value configurable in the future.
 */
export function shouldThrottleNextRequest(params: {
  rateLimitLimit: number | undefined;
  rateLimitRemaining: number | undefined;
}): boolean {
  const { rateLimitLimit, rateLimitRemaining } = params;
  if (rateLimitLimit === undefined || rateLimitRemaining === undefined)
    return false;

  const rateLimitConsumed = rateLimitLimit - rateLimitRemaining;
  return rateLimitConsumed / rateLimitLimit > RATE_LIMIT_THRESHOLD;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
