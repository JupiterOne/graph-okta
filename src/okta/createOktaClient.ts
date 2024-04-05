/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import {
  IntegrationLogger,
  IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';
import { AttemptContext, retry, sleep } from '@lifeomic/attempt';
import { OktaIntegrationConfig } from '../types';

import { RequestExecutor } from '@okta/okta-sdk-nodejs';
import { RequestOptions } from '@okta/okta-sdk-nodejs/src/types/request-options';
import { OktaClient } from './types';
import {
  fatalRequestError,
  isRetryableRequest,
  retryableRequestError,
} from './errors';
import { TokenBucket } from './tokenBucket';

const getApiURL = (url: string): string => {
  const trimmedUrl = url.substring(url.indexOf('/api/v1/'));
  const idPattern = /\/([a-zA-Z0-9]{16,})(?=\/|$)/g;
  return trimmedUrl.replace(idPattern, '/{id}').replace(/\?.*$/, '');
};

const TIMEOUT_RETRY_ATTEMPTS = 3;
const DEFAULT_RATE_LIMIT_THRESHOLD = 0.5;

/**
 * A custom Okta request executor that limits the rate at which requests are sent to the Okta API
 * based on the rate limit headers returned by the server, to avoid hitting rate limits.
 */
export class RequestExecutorWithTokenBucket extends RequestExecutor {
  rateLimitThreshold: number;
  logger: IntegrationLogger;
  minimumRateLimitRemaining: number;
  requestAfter: number | undefined;
  tokenBuckets: Record<string, TokenBucket> = {};

  constructor(rateLimitThreshold: number, logger: IntegrationLogger) {
    super();
    this.rateLimitThreshold = rateLimitThreshold;
    this.logger = logger;
  }

  override async fetch(request: RequestOptions) {
    const doFetch = async (timeoutRetryAttempt = 0) => {
      return await retry(
        async () => {
          const apiURL = getApiURL(request.url as string);
          const tokenBucket = this.tokenBuckets[apiURL];
          if (tokenBucket) {
            const timeToWaitInMs = tokenBucket.take();
            await sleep(timeToWaitInMs);
          }

          let response: any;
          try {
            response = await super.fetch(request);
          } catch (err) {
            this.logger.error(
              { code: err.code, err, endpoint: request.url },
              'Error sending request',
            );
            throw err;
          }

          if (response.ok) {
            if (response.headers.has('x-rate-limit-limit')) {
              const apiUrl = getApiURL(request.url as string);
              if (!this.tokenBuckets[apiUrl]) {
                // We multiply the limit by the threshold to make our bucket smaller than the server's bucket.
                // This way we can avoid getting 429 errors.
                // For example, if okta's limit is 300 / minute and the threshold is 0.9, then the max capacity will be 270.
                const serverCapacity = parseInt(
                  response.headers.get('x-rate-limit-limit') as string,
                  10,
                );
                const capacity = serverCapacity * this.rateLimitThreshold;
                this.tokenBuckets[apiUrl] = new TokenBucket(capacity);
                this.logger.info(
                  { capacity },
                  `Created token bucket for ${apiUrl}`,
                );
              }
            }
            return response;
          }

          let error: IntegrationProviderAPIError | undefined;
          const requestErrorParams = {
            endpoint: request.url as string,
            response,
          };
          if (isRetryableRequest(response.status)) {
            error = retryableRequestError(requestErrorParams);
          } else {
            error = fatalRequestError(requestErrorParams);
          }
          if (response.body) {
            for await (const _chunk of response.body) {
              // force consumption of body to avoid memory leaks
              // https://github.com/node-fetch/node-fetch/issues/83
            }
          }
          throw error;
        },
        {
          maxAttempts: 3,
          delay: 30_000, // 30 seconds to start
          timeout: 180_000, // 3 min timeout. We need this in case Node hangs with ETIMEDOUT
          factor: 2, //exponential backoff factor. with 30 sec start and 3 attempts, longest wait is 2 min
          handleError: async (err: any, context: AttemptContext) => {
            if (
              ['ECONNRESET', 'ETIMEDOUT'].some(
                (code) => err.code === code || err.message.includes(code),
              )
            ) {
              return;
            }

            if (!err.retryable) {
              // can't retry this? just abort
              context.abort();
              return;
            }

            if (err.status === 429) {
              const retryAfter = err.retryAfter || 60_000;
              this.logger.warn(
                {
                  retryAfter,
                  endpoint: err.endpoint,
                },
                'Received a rate limit error. Waiting before retrying.',
              );
              await sleep(retryAfter);

              // Restart the token bucket to equal the server's bucket state.
              // In subsequent requests we'll get less 429 errors because our token bucket is smaller.
              this.restartTokenBucket(err.endpoint as string);
            }
          },
          handleTimeout: async (attemptContext, options) => {
            if (timeoutRetryAttempt < TIMEOUT_RETRY_ATTEMPTS) {
              this.logger.warn(
                {
                  attemptContext,
                  timeoutRetryAttempt,
                  link: request.url,
                },
                'Hit a timeout, restarting request retry cycle.',
              );

              return await doFetch(++timeoutRetryAttempt);
            } else {
              this.logger.warn(
                {
                  attemptContext,
                  timeoutRetryAttempt,
                  link: request.url,
                },
                'Hit a timeout during the final attempt. Unable to collect data for this query.',
              );
              const err: any = new Error(
                `Retry timeout (attemptNum: ${attemptContext.attemptNum}, timeout: ${options.timeout})`,
              );
              err.code = 'ATTEMPT_TIMEOUT';
              throw err;
            }
          },
        },
      );
    };
    return await doFetch();
  }

  private restartTokenBucket(endpoint: string | undefined): void {
    if (!endpoint) {
      return;
    }
    const apiUrl = getApiURL(endpoint);
    const tokenBucket = this.tokenBuckets[apiUrl];
    tokenBucket?.restart();
  }
}

let client: OktaClient | undefined;

export default function createOktaClient(
  logger: IntegrationLogger,
  config: OktaIntegrationConfig,
) {
  if (!client) {
    const defaultRequestExecutor = new RequestExecutorWithTokenBucket(
      config.rateLimitThreshold ?? DEFAULT_RATE_LIMIT_THRESHOLD,
      logger,
    );

    defaultRequestExecutor.on('request', (request: any) => {
      logger.trace(
        {
          url: request.url,
        },
        'Okta client initiated request',
      );
    });

    defaultRequestExecutor.on('response', (_response: any) => {
      logger.trace('Okta client received response');
    });

    client = new OktaClient({
      orgUrl: config.oktaOrgUrl,
      token: config.oktaApiKey,
      requestExecutor: defaultRequestExecutor,
      // Disable caching as it may be causing high memory usage
      //
      // See: https://github.com/okta/okta-sdk-nodejs#middleware
      cacheMiddleware: null,
    });
  }
  return client;
}
