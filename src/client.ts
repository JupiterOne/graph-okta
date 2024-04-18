import {
  IntegrationError,
  IntegrationLogger,
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from './config';
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
import parse from 'parse-link-header';
import {
  BaseAPIClient,
  RetryOptions,
  fatalRequestError,
  isRetryableRequest,
  retryableRequestError,
} from '@jupiterone/integration-sdk-http-client';
import Bottleneck from 'bottleneck';
import { retry } from '@lifeomic/attempt';
import { Response } from 'node-fetch';
import { QueueTasksState } from './types/queue';
import { setTimeout } from 'node:timers/promises';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

const NINETY_DAYS_AGO = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_RATE_LIMIT_THRESHOLD = 0.5;

/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient extends BaseAPIClient {
  constructor(
    readonly config: IntegrationConfig,
    logger: IntegrationLogger,
  ) {
    const rateLimitThreshold =
      config.rateLimitThreshold || DEFAULT_RATE_LIMIT_THRESHOLD;
    super({
      baseUrl: config.oktaOrgUrl,
      logger,
      retryOptions: {
        timeout: 0,
      },
      rateLimitThrottling: {
        threshold: rateLimitThreshold,
        resetMode: 'datetime_epoch_s',
        rateLimitHeaders: {
          limit: 'x-rate-limit-limit',
          remaining: 'x-rate-limit-remaining',
          reset: 'x-rate-limit-reset',
        },
      },
    });
    this.retryOptions.handleError = this.getHandleErrorFn();
  }

  protected getAuthorizationHeaders(): Record<string, string> {
    return {
      Authorization: `SSWS ${this.config.oktaApiKey}`,
    };
  }

  private getHandleErrorFn(): RetryOptions['handleError'] {
    return async (err, context, logger) => {
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
        let retryAfter = 60_000;
        if (
          err.cause &&
          err.cause.headers?.['date'] &&
          err.cause.headers?.['x-rate-limit-reset']
        ) {
          const headers = err.cause.headers;
          retryAfter = this.getDelayUntilReset(
            headers['date'] as string,
            headers['x-rate-limit-reset'] as string,
          );
        }

        logger.warn(
          {
            retryAfter,
            endpoint: err.endpoint,
          },
          'Received a rate limit error. Waiting before retrying.',
        );
        await setTimeout(retryAfter);
      }
    };
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

  private async *iteratePages<T>(endpoint: string) {
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
    for await (const user of this.iteratePages<OktaUser>('/api/v1/users')) {
      await iteratee(user);
    }

    const search = 'status eq "DEPROVISIONED"';
    for await (const user of this.iteratePages<OktaUser>(
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

  public async getGroupUsersLimit(
    groupId: string,
  ): Promise<number | undefined> {
    const response = await this.retryableRequest(
      `/api/v1/groups/${groupId}/users?limit=1`,
    );
    await response.text(); // Consume body to avoid memory leaks
    if (!response.headers.has('x-rate-limit-limit')) {
      return;
    }
    const limitHeader = response.headers.get('x-rate-limit-limit');
    return parseInt(limitHeader as string, 10);
  }

  /**
   * Iterates each user resource assigned to a given group.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public iterateUsersForGroup(
    groupId: string,
    iteratee: ResourceIteratee<OktaUser>,
    limiter: Bottleneck,
    tasksState: QueueTasksState,
  ): void {
    const initialUrl = `/api/v1/groups/${groupId}/users?limit=1000`;
    this.scheduleRequest(initialUrl, iteratee, limiter, tasksState, (err) => {
      if (err.status === 404) {
        //ignore it. It's probably a group that got deleted between steps
      } else {
        err.groupId = groupId;
        throw err;
      }
    });
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
    for await (const device of this.iteratePages<OktaDevice>(
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
    for await (const application of this.iteratePages<OktaApplication>(
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
      for await (const group of this.iteratePages<ApplicationGroupAssignment>(
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

  public async getAppUsersLimit(appId: string): Promise<number | undefined> {
    const response = await this.retryableRequest(
      `/api/v1/apps/${appId}/users?limit=1`,
    );
    await response.text(); // Consume body to avoid memory leaks
    if (!response.headers.has('x-rate-limit-limit')) {
      return;
    }
    const limitHeader = response.headers.get('x-rate-limit-limit');
    return parseInt(limitHeader as string, 10);
  }

  /**
   * Iterates each individual user assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public iterateUsersForApp(
    appId: string,
    iteratee: ResourceIteratee<OktaApplicationUser>,
    limiter: Bottleneck,
    tasksState: QueueTasksState,
  ) {
    const initialUrl = `/api/v1/apps/${appId}/users?limit=500`;
    this.scheduleRequest(initialUrl, iteratee, limiter, tasksState, (err) => {
      if (err.status === 404) {
        //ignore it. It's probably an app that got deleted between steps
      } else {
        throw err;
      }
    });
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
      for await (const rule of this.iteratePages<GroupRule>(
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
    for await (const logEvent of this.iteratePages<LogEvent>(url)) {
      await iteratee(logEvent);
    }
  }

  private scheduleRequest<T>(
    initialUrl: string,
    iteratee: ResourceIteratee<T>,
    limiter: Bottleneck,
    tasksState: QueueTasksState,
    onError?: (err: any) => void,
  ) {
    const iteratePages = async (url: string) => {
      if (tasksState.error) {
        // Stop processing if an error has occurred in previous tasks
        // This happens when this task has been queued before the error occurred
        return;
      }
      let nextUrl: string | undefined;
      try {
        nextUrl = await this.requestPage(url, iteratee, tasksState);
      } catch (err) {
        if (err.code === 'RATE_LIMIT_REACHED') {
          // Retry this task after the rate limit is reset
          void limiter.schedule(() => iteratePages(url));
          return;
        }
        if (onError) {
          onError(err);
        } else {
          throw err;
        }
      }
      if (nextUrl) {
        // Queue another task to process the next page
        void limiter.schedule(() => iteratePages(nextUrl as string));
      }
    };
    void limiter.schedule(() => iteratePages(initialUrl));
  }

  private async requestPage<T>(
    url: string,
    iteratee: ResourceIteratee<T>,
    tasksState: QueueTasksState,
  ): Promise<string | undefined> {
    const response = await this.retryableQueueRequest(url, tasksState);
    const data = await response.json();
    for (const item of data) {
      await iteratee(item);
    }

    const link = response.headers.get('link') as string | undefined;
    if (!link) {
      return;
    }

    const parsedLink = parse(link);
    if (!parsedLink?.next?.url) {
      return;
    }

    return parsedLink.next.url;
  }

  private async retryableQueueRequest(
    endpoint: string,
    tasksState: QueueTasksState,
  ) {
    return retry(
      async () => {
        return this.withQueueRateLimiting(async () => {
          if (tasksState.rateLimitReached) {
            // throw error to re-enqueue this task until rate limit is reset
            const error = new IntegrationError({
              code: 'RATE_LIMIT_REACHED',
              message: 'Rate limit reached',
            });
            throw error;
          }
          let response: Response | undefined;
          try {
            response = await this.request(endpoint);
          } catch (err) {
            this.logger.error(
              { code: err.code, err, endpoint },
              'Error sending request',
            );
            throw err;
          }

          if (response.ok) {
            return response;
          }

          let error: IntegrationProviderAPIError | undefined;
          const requestErrorParams = {
            endpoint,
            response,
            logger: this.logger,
            logErrorBody: this.logErrorBody,
          };
          if (isRetryableRequest(response.status)) {
            error = await retryableRequestError(requestErrorParams);
          } else {
            error = await fatalRequestError(requestErrorParams);
          }
          for await (const _chunk of response.body) {
            // force consumption of body to avoid memory leaks
            // https://github.com/node-fetch/node-fetch/issues/83
          }
          throw error;
        }, tasksState);
      },
      {
        maxAttempts: this.retryOptions.maxAttempts,
        delay: this.retryOptions.delay,
        factor: this.retryOptions.factor,
        handleError: async (err, context) => {
          if (err.code === 'ETIMEDOUT') {
            return;
          }

          if (!err.retryable) {
            // can't retry this? just abort
            context.abort();
            return;
          }

          if (err.status === 429) {
            let retryAfter = 60_000;
            if (
              err.cause &&
              err.cause.headers?.['date'] &&
              err.cause.headers?.['x-rate-limit-reset']
            ) {
              const headers = err.cause.headers;
              retryAfter = this.getDelayUntilReset(
                headers['date'] as string,
                headers['x-rate-limit-reset'] as string,
              );
            }

            this.logger.warn(
              {
                retryAfter,
                endpoint: err.endpoint,
              },
              'Received a rate limit error. Waiting before retrying.',
            );

            tasksState.rateLimitReached = true;
            await setTimeout(retryAfter);
            tasksState.rateLimitReached = false;
          }
        },
      },
    );
  }

  private async withQueueRateLimiting(
    fn: () => Promise<Response>,
    tasksState: QueueTasksState,
  ): Promise<Response> {
    const response = await fn();
    const { headers } = response;
    if (
      !headers.has('x-rate-limit-limit') ||
      !headers.has('x-rate-limit-remaining') ||
      !headers.has('x-rate-limit-reset')
    ) {
      return response;
    }
    const limit = parseInt(headers.get('x-rate-limit-limit') as string, 10);
    const remaining = parseInt(
      headers.get('x-rate-limit-remaining') as string,
      10,
    );
    const rateLimitConsumed = limit - remaining;
    const shouldThrottleRequests =
      rateLimitConsumed / limit > this.rateLimitThrottling!.threshold;

    if (shouldThrottleRequests) {
      const timeToSleepInMs = this.getDelayUntilReset(
        headers.get('date')!,
        headers.get('x-rate-limit-reset')!,
      );
      this.logger.warn(
        {
          endpoint: response.url,
          limit,
          remaining,
          timeToSleepInMs,
        },
        `Exceeded ${this.rateLimitThrottling!.threshold * 100}% of rate limit. Sleeping until x-rate-limit-reset.`,
      );
      tasksState.rateLimitReached = true;
      await setTimeout(timeToSleepInMs);
      tasksState.rateLimitReached = false;
    }
    return response;
  }

  /**
   * Determine wait time by getting the delta X-Rate-Limit-Reset and the Date header
   * Add 1 second to account for sub second differences between the clocks that create these headers
   */
  private getDelayUntilReset(
    nowTimestamp: string,
    resetTimestamp: string,
  ): number {
    const nowDate = new Date(nowTimestamp);
    const retryDate = new Date(parseInt(resetTimestamp, 10) * 1000);
    return retryDate.getTime() - nowDate.getTime() + 1000;
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
