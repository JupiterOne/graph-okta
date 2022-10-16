/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { OktaClient } from './types';
import { OktaIntegrationConfig } from '../types';
import { AttemptContext, retry } from '@lifeomic/attempt';

const okta = require('@okta/okta-sdk-nodejs');

const DEFAULT_MINIMUM_RATE_LIMIT_REMAINING = 5;

interface RequestExecutorWithEarlyRateLimitingOptions {
  minimumRateLimitRemaining?: number;
}

/**
 * A custom Okta request executor that throttles requests when `x-rate-limit-remaining` response
 * headers fall below a provided threshold.
 */
export class RequestExecutorWithEarlyRateLimiting extends okta.DefaultRequestExecutor {
  logger: IntegrationLogger;
  minimumRateLimitRemaining: number;
  requestAfter: number | undefined;

  constructor(
    logger: IntegrationLogger,
    options?: RequestExecutorWithEarlyRateLimitingOptions,
  ) {
    super();
    this.logger = logger;
    this.minimumRateLimitRemaining =
      options?.minimumRateLimitRemaining ||
      DEFAULT_MINIMUM_RATE_LIMIT_REMAINING;
  }

  async fetch(request: any) {
    const { logger } = this;
    if (this.getThrottleActivated() && this.requestAfter) {
      const now = Date.now();
      const delayMs = this.requestAfter - now;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const attemptFunction = () =>
      super.fetch(request).then((response: any) => {
        this.requestAfter = this.getRequestAfter(response);
        return response;
      });
    return await retry(attemptFunction, {
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
    });
  }

  getRateLimitReset(response: any) {
    return response.headers.get('x-rate-limit-reset');
  }

  getRateLimitRemaining(response: any) {
    return response.headers.get('x-rate-limit-remaining');
  }

  getRequestAfter(response: any) {
    const rateLimitRemaining = this.getRateLimitRemaining(response);
    if (rateLimitRemaining <= this.minimumRateLimitRemaining) {
      const requestAfter =
        new Date(
          parseInt(this.getRateLimitReset(response), 10) * 1000,
        ).getTime() + 1000;
      this.logger.info(
        {
          minimumRateLimitRemaining: this.minimumRateLimitRemaining,
          requestAfter,
          url: response.url,
        },
        'Minimum `x-rate-limit-remaining` header reached. Temporarily throttling requests',
      );
      return requestAfter;
    }
    return undefined;
  }

  delayRequests(delayMs: number) {
    //used to force delays even without header feedback, mainly in testing
    const now = Date.now();
    this.requestAfter = now + delayMs;
  }

  getThrottleActivated() {
    const now = Date.now();
    return this.requestAfter && this.requestAfter > now;
  }
}

export default function createOktaClient(
  logger: IntegrationLogger,
  config: OktaIntegrationConfig,
  options?: RequestExecutorWithEarlyRateLimitingOptions,
): OktaClient {
  const defaultRequestExecutor = new RequestExecutorWithEarlyRateLimiting(
    logger,
    options,
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

  return new okta.Client({
    orgUrl: config.oktaOrgUrl,
    token: config.oktaApiKey,
    requestExecutor: defaultRequestExecutor,
    // Disable caching as it may be causing high memory usage
    //
    // See: https://github.com/okta/okta-sdk-nodejs#middleware
    cacheMiddleware: null,
  });
}
