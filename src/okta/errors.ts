import {
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
  IntegrationProviderAuthorizationError,
} from '@jupiterone/integration-sdk-core';

type RateLimitErrorParams = ConstructorParameters<
  typeof IntegrationProviderAPIError
>[0] & {
  retryAfter?: number;
};

interface RequestErrorParams {
  endpoint: string;
  response: any;
}

export class RetryableIntegrationProviderApiError extends IntegrationProviderAPIError {
  retryable = true;
}

export class RateLimitError extends RetryableIntegrationProviderApiError {
  constructor(options: RateLimitErrorParams) {
    super(options);
    this.retryAfter = options.retryAfter;
  }
  retryAfter?: number;
}

export function retryableRequestError({
  endpoint,
  response,
}: RequestErrorParams): RetryableIntegrationProviderApiError {
  if (response.status === 429) {
    let retryAfter: number | undefined;
    if (
      response.headers.has('date') &&
      response.headers.has('x-rate-limit-reset')
    ) {
      // Determine wait time by getting the delta X-Rate-Limit-Reset and the Date header
      // Add 1 second to account for sub second differences between the clocks that create these headers
      const nowDate = new Date(response.headers.get('date') as string);
      const retryDate = new Date(
        parseInt(response.headers.get('x-rate-limit-reset') as string, 10) *
          1000,
      );
      retryAfter = retryDate.getTime() - nowDate.getTime() + 1000;
    }
    return new RateLimitError({
      status: response.status,
      statusText: response.statusText,
      endpoint,
      retryAfter,
    });
  }

  return new RetryableIntegrationProviderApiError({
    endpoint,
    status: response.status,
    statusText: response.statusText,
  });
}

export function fatalRequestError({
  endpoint,
  response,
}: RequestErrorParams): IntegrationProviderAPIError {
  const apiErrorOptions = {
    endpoint,
    status: response.status,
    statusText: response.statusText,
    fatal: false,
  };
  if (response.status === 401) {
    return new IntegrationProviderAuthenticationError(apiErrorOptions);
  } else if (response.status === 403) {
    return new IntegrationProviderAuthorizationError(apiErrorOptions);
  } else {
    return new IntegrationProviderAPIError(apiErrorOptions);
  }
}

/**
 * Function for determining if a request is retryable
 * based on the returned status.
 */
export function isRetryableRequest(status: number): boolean {
  return (
    // 5xx error from provider (their fault, might be retryable)
    // 429 === too many requests, we got rate limited so safe to try again
    status >= 500 || status === 429
  );
}
