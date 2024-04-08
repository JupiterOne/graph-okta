import {
  IntegrationLogger,
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from './config';
export type ResourceIteratee<T> = (each: T) => Promise<void> | void;
import {
  ApplicationGroupAssignment,
  Group,
  GroupRule,
  LogEvent,
  OrgOktaSupportSettingsObj,
  Role,
} from '@okta/okta-sdk-nodejs';
import {
  OktaApplication,
  OktaApplicationUser,
  OktaDevice,
  OktaFactor,
  OktaUser,
} from './okta/types';
import { AttemptContext, retry, sleep } from '@lifeomic/attempt';
import { join as joinPath } from 'node:path/posix';
import { TokenBucket } from './okta/tokenBucket';
import fetch from 'node-fetch';
import parse from 'parse-link-header';
import {
  fatalRequestError,
  isRetryableRequest,
  retryableRequestError,
} from './okta/errors';

const NINETY_DAYS_AGO = 90 * 24 * 60 * 60 * 1000;
const TIMEOUT_RETRY_ATTEMPTS = 3;
const DEFAULT_RATE_LIMIT_THRESHOLD = 0.5;

const getApiURL = (url: string): string => {
  const trimmedUrl = url.substring(url.indexOf('/api/v1/'));
  const idPattern = /\/([a-zA-Z0-9]{16,})(?=\/|$)/g;
  return trimmedUrl.replace(idPattern, '/{id}').replace(/\?.*$/, '');
};

/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient {
  private rateLimitThreshold: number;
  private tokenBuckets: Record<string, TokenBucket> = {};

  constructor(
    readonly config: IntegrationConfig,
    readonly logger: IntegrationLogger,
  ) {
    this.rateLimitThreshold =
      config.rateLimitThreshold || DEFAULT_RATE_LIMIT_THRESHOLD;
  }

  protected withBaseUrl(endpoint: string): string {
    const url = new URL(this.config.oktaOrgUrl);
    url.pathname = joinPath(url.pathname, endpoint);
    return decodeURIComponent(url.toString());
  }

  async retryableRequest(endpoint: string, timeoutRetryAttempt = 0) {
    return await retry(
      async () => {
        const apiURL = getApiURL(endpoint);
        const tokenBucket = this.tokenBuckets[apiURL];
        if (tokenBucket) {
          const timeToWaitInMs = tokenBucket.take();
          await sleep(timeToWaitInMs);
        }

        let url: string | undefined;
        try {
          url = new URL(endpoint).toString();
        } catch (e) {
          // If the path is not a valid URL, assume it's a path and prepend the base URL
          url = this.withBaseUrl(endpoint);
        }

        let response: any;
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `SSWS ${this.config.oktaApiKey}`,
              Accept: 'application/json',
            },
          });
        } catch (err) {
          this.logger.error(
            { code: err.code, err, endpoint },
            'Error sending request',
          );
          throw err;
        }

        if (response.ok) {
          if (response.headers.has('x-rate-limit-limit')) {
            if (!this.tokenBuckets[apiURL]) {
              // We multiply the limit by the threshold to make our bucket smaller than the server's bucket.
              // This way we can avoid getting 429 errors.
              // For example, if okta's limit is 300 / minute and the threshold is 0.9, then the max capacity will be 270.
              const serverCapacity = parseInt(
                response.headers.get('x-rate-limit-limit') as string,
                10,
              );
              const capacity = serverCapacity * this.rateLimitThreshold;
              this.tokenBuckets[apiURL] = new TokenBucket(capacity);
              this.logger.info(
                { capacity },
                `Created token bucket for ${apiURL}`,
              );
            }
          }
          return response;
        }

        let error: IntegrationProviderAPIError | undefined;
        const requestErrorParams = {
          endpoint,
          response,
        };
        if (isRetryableRequest(response.status)) {
          error = retryableRequestError(requestErrorParams);
        } else {
          error = fatalRequestError(requestErrorParams);
        }

        if (response.status >= 500) {
          try {
            const body = await response.text();
            this.logger.error({ endpoint, body }, 'Error response body');
          } catch (err) {
            // ignore
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
                link: endpoint,
              },
              'Hit a timeout, restarting request retry cycle.',
            );

            return await this.retryableRequest(endpoint, ++timeoutRetryAttempt);
          } else {
            this.logger.warn(
              {
                attemptContext,
                timeoutRetryAttempt,
                link: endpoint,
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
  }

  private restartTokenBucket(endpoint: string | undefined): void {
    if (!endpoint) {
      return;
    }
    const apiUrl = getApiURL(endpoint);
    const tokenBucket = this.tokenBuckets[apiUrl];
    tokenBucket?.restart();
  }

  public async verifyAuthentication(): Promise<void> {
    // the most light-weight request possible to validate credentials

    try {
      await this.retryableRequest('/api/v1/users?limit=1');
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: this.config.oktaOrgUrl + '/api/v1/users?limit=1',
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  private async *paginate<T>(endpoint: string) {
    let nextUrl: string | undefined;
    do {
      const response = await this.retryableRequest(nextUrl || endpoint);
      const data = await response.json();
      for (const item of data) {
        yield item as T;
      }

      const link = response.headers.get('link') as string | undefined;
      if (!link) {
        nextUrl = undefined;
        continue;
      }

      const parsedLink = parse(link);
      if (!parsedLink?.next?.url) {
        nextUrl = undefined;
        continue;
      }

      nextUrl = parsedLink.next.url;
    } while (nextUrl);
  }

  /**
   * Iterates each user resource in the provider.
   * Then iterates each deprovisioned user resource.
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<OktaUser>,
  ): Promise<void> {
    for await (const user of this.paginate<OktaUser>('/api/v1/users')) {
      await iteratee(user);
    }

    const search = 'status eq "DEPROVISIONED"';
    for await (const user of this.paginate<OktaUser>(
      `/api/v1/users?search=${encodeURIComponent(search)}`,
    )) {
      await iteratee(user);
    }
  }

  /**
   * Iterates over groups fetched from the Okta API, applying a provided function (iteratee) to each group.
   * This method handles pagination and can dynamically adjust request limits based on API response status.
   *
   * The iteration starts with an initial request to fetch groups, using a specified or default limit.
   * If the API returns a 500 error (indicating a potential overload or other server-side issue),
   * the method attempts to mitigate this by reducing the limit (halving it) for subsequent requests,
   * down to a minimum limit calculated as a quarter of the initial limit, but not less than 1.
   * If reducing the limit does not resolve the error (indicating the limit cannot be reduced further
   * or removing 'expand=stats' does not help), the method throws the error, halting execution.
   *
   * The function uses the 'Link' header from the API response to determine if there are more pages of data.
   * If so, it continues to fetch and process data until all pages have been processed or an unrecoverable error occurs.
   * It supports a mechanism to adjust for smaller pages after experiencing a 500 error, by tracking the number
   * of smaller pages left to process before attempting to return to the initial page size.
   *
   * @param {ResourceIteratee<Group>} iteratee - An async function applied to each group.
   * @param {number} [initialLimit=1000] - The initial number of groups to fetch per API request. This can be adjusted
   *        dynamically in response to API errors.
   * @returns {Promise<void>} A promise that resolves when all groups have been processed or rejects if an error occurs.
   */
  public async iterateGroups(
    iteratee: ResourceIteratee<Group>,
    initialLimit: number = 1000,
  ): Promise<void> {
    const initialEndpoint = `/api/v1/groups?limit=${initialLimit}&expand=stats`;
    let currentLimit = initialLimit;
    const minLimit = Math.max(initialLimit / 2 ** 3, 1);
    let smallPagesLeft = 0;
    let nextUrl: string | undefined;

    const executeRequest = async (url: string) => {
      do {
        const response = await this.retryableRequest(nextUrl || url);
        const data = await response.json();
        for (const item of data) {
          await iteratee(item as Group);
        }

        const link = response.headers.get('link') as string | undefined;
        if (!link) {
          nextUrl = undefined;
          return;
        }

        const parsedLink = parse(link);
        if (!parsedLink?.next?.url) {
          nextUrl = undefined;
          return;
        }

        nextUrl = parsedLink.next.url;
        smallPagesLeft = Math.max(smallPagesLeft - 1, 0);
      } while (smallPagesLeft);
    };

    do {
      try {
        await executeRequest(nextUrl || initialEndpoint);

        // If we've reached this point, we've successfully processed the smaller pages
        // and can now go back to the initial page size.
        if (nextUrl) {
          const parsedUrl = new URL(nextUrl as string);
          parsedUrl.searchParams.set('limit', initialLimit.toString());
          parsedUrl.searchParams.set('expand', 'stats');
          nextUrl = parsedUrl.toString();
        }
      } catch (err) {
        if (err.status === 500) {
          const parsedUrl = new URL(nextUrl || initialEndpoint);
          // We'll stop trying to reduce the page size when we reach 125. Starting from 1000 that gives us 3 retries.
          const newLimit = Math.max(Math.floor(currentLimit / 2), minLimit);
          if (newLimit === currentLimit) {
            if (!parsedUrl.searchParams.has('expand')) {
              // We removed the expand option and can't reduce the page size any further.
              throw err;
            }
            // We can't reduce the page size any further, remove the expand option
            // and continue with the max limit.
            currentLimit = initialLimit;
            smallPagesLeft = 0;
            parsedUrl.searchParams.set('limit', currentLimit.toString());
            parsedUrl.searchParams.delete('expand');
            nextUrl = parsedUrl.toString();
            this.logger.warn({ currentLimit }, 'Removing expand and retrying.');
            continue;
          }
          let newSmallPagesLeft = Math.floor(initialLimit / newLimit);
          if (smallPagesLeft > 0) {
            // If we're already processing smaller pages, we need to adjust the number of pages left.
            newSmallPagesLeft =
              smallPagesLeft +
              (smallPagesLeft * Math.floor(initialLimit / currentLimit)) /
                newLimit;
          }
          smallPagesLeft = newSmallPagesLeft;
          currentLimit = newLimit;
          parsedUrl.searchParams.set('limit', currentLimit.toString());
          nextUrl = parsedUrl.toString();
          this.logger.warn({ currentLimit }, 'Reducing limit and retrying.');
        } else {
          throw err;
        }
      }
    } while (nextUrl);
  }

  /**
   * Iterates each user resource assigned to a given group.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateUsersForGroup(
    groupId: string,
    iteratee: ResourceIteratee<OktaUser>,
  ): Promise<void> {
    try {
      for await (const user of this.paginate<OktaUser>(
        `/api/v1/groups/${groupId}/users?limit=1000`,
      )) {
        await iteratee(user);
      }
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably a group that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each Multi-Factor Authentication device assigned to a given user.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateFactorDevicesForUser(
    userId: string,
    iteratee: ResourceIteratee<OktaFactor>,
  ): Promise<void> {
    try {
      // Okta API does not currently allow a limit to be specified on the list
      // factors API.
      //
      // See: https://developer.okta.com/docs/reference/api/factors/#list-enrolled-factors
      const response = await this.retryableRequest(
        `/api/v1/users/${userId}/factors`,
      );
      const factors = await response.json();
      for (const factor of factors) {
        await iteratee(factor);
      }
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably a user that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each device resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateDevices(
    iteratee: ResourceIteratee<OktaDevice>,
  ): Promise<void> {
    for await (const device of this.paginate<OktaDevice>(
      '/api/v1/devices?limit=200&expand=user',
    )) {
      await iteratee(device);
    }
  }

  /**
   * Iterates each application resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateApplications(
    iteratee: ResourceIteratee<OktaApplication>,
  ): Promise<void> {
    for await (const application of this.paginate<OktaApplication>(
      '/api/v1/apps?limit=200',
    )) {
      await iteratee(application);
    }
  }

  /**
   * Iterates each group assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateGroupsForApp(
    appId: string,
    iteratee: ResourceIteratee<ApplicationGroupAssignment>,
  ): Promise<void> {
    try {
      for await (const group of this.paginate<ApplicationGroupAssignment>(
        `/api/v1/apps/${appId}/groups?limit=200`,
      )) {
        await iteratee(group);
      }
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably an app that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each individual user assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsersForApp(
    appId: string,
    iteratee: ResourceIteratee<OktaApplicationUser>,
  ): Promise<void> {
    try {
      for await (const user of this.paginate<OktaApplicationUser>(
        `/api/v1/apps/${appId}/users?limit=500`,
      )) {
        await iteratee(user);
      }
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably an app that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each rule resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateRules(
    iteratee: ResourceIteratee<GroupRule>,
  ): Promise<void> {
    try {
      for await (const rule of this.paginate<GroupRule>(
        '/api/v1/groups/rules?limit=200',
      )) {
        await iteratee(rule);
      }
    } catch (err) {
      //per https://developer.okta.com/docs/reference/error-codes/
      if (/\/api\/v1\/groups\/rules/.test(err.url) && err.status === 400) {
        this.logger.info(
          'Rules not enabled for this account. Skipping processing of Okta Rules.',
        );
      } else {
        throw err;
      }
    }
  }

  public async getSupportInfo(): Promise<OrgOktaSupportSettingsObj> {
    const response = await this.retryableRequest(
      '/api/v1/org/privacy/oktaSupport',
    );
    return await response.json();
  }

  public async iterateRolesByUser(
    userId: string,
    iteratee: ResourceIteratee<Role>,
  ): Promise<void> {
    const response = await this.retryableRequest(
      `/api/v1/users/${userId}/roles`,
    );
    const roles = await response.json();
    for (const role of roles) {
      await iteratee(role);
    }
  }

  public async iterateRolesByGroup(
    groupId: string,
    iteratee: ResourceIteratee<Role>,
  ): Promise<void> {
    const response = await this.retryableRequest(
      `/api/v1/groups/${groupId}/roles`,
    );
    const roles = await response.json();
    for (const role of roles) {
      await iteratee(role);
    }
  }

  public async iterateAppCreatedLogs(
    iteratee: ResourceIteratee<LogEvent>,
  ): Promise<void> {
    // Use filter to only find instances of a newly created application.
    // We must specify 'since' to a time far in the past, otherwise we
    // will only get the last 7 days of data.  Okta only saves the last
    // 90 days, so this is not us limiting what we're able to get.
    const daysAgo = Date.now() - NINETY_DAYS_AGO;
    const startDate = new Date(daysAgo);
    const filter =
      'eventType eq "application.lifecycle.update" and debugContext.debugData.requestUri ew "_new_"';
    const url = `/api/v1/logs?filter=${encodeURIComponent(
      filter,
    )}&since=${startDate.toISOString()}&until=${new Date().toISOString()}`;
    for await (const logEvent of this.paginate<LogEvent>(url)) {
      await iteratee(logEvent);
    }
  }
}

let client: APIClient | undefined;

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  if (!client) {
    client = new APIClient(config, logger);
  }
  return client;
}
