import {
  IntegrationError,
  IntegrationInstanceAuthorizationError,
} from '@jupiterone/jupiter-managed-integration-sdk';

import {
  OktaExecutionContext,
  OktaIntegrationStepIterationState,
} from '../types';
import extractCursorFromNextUri from '../util/extractCursorFromNextUri';
import logIfForbiddenOrNotFound from '../util/logIfForbidden';
import retryApiCall from '../util/retryApiCall';
import {
  OktaApplicationCacheEntry,
  OktaApplicationUser,
  OktaApplicationUserCacheEntry,
  OktaCacheState,
  OktaQueryParams,
} from './types';

export default async function fetchBatchOfApplicationUsers(
  executionContext: OktaExecutionContext,
  iterationState: OktaIntegrationStepIterationState,
): Promise<OktaIntegrationStepIterationState> {
  const { okta, logger } = executionContext;

  const cache = executionContext.clients.getCache();
  const applicationCache = cache.iterableCache<
    OktaApplicationCacheEntry,
    OktaCacheState
  >('applications');
  const applicationUserCache = cache.iterableCache<
    OktaApplicationUserCacheEntry,
    OktaCacheState
  >('application_users');

  const applicationsState = await applicationCache.getState();
  if (!applicationsState || !applicationsState.fetchCompleted) {
    throw new IntegrationError({
      message:
        "Step 'Fetch Application Users' dependency failed, cannot ingest application users: 'fetch-applications'",
      expose: true,
    });
  }

  if (applicationsState.encounteredAuthorizationError) {
    await applicationUserCache.putState({
      seen: 0,
      putEntriesKeys: 0,
      fetchCompleted: true,
      encounteredAuthorizationError: true,
    });

    throw new IntegrationInstanceAuthorizationError(
      new Error(
        "Applications' Users ingestion depends on Applications ingestion",
      ),
      'application_users',
    );
  }

  const pageLimit = process.env.OKTA_APPLICATION_USERS_PAGE_LIMIT
    ? Number(process.env.OKTA_APPLICATION_USERS_PAGE_LIMIT)
    : 200;
  const batchPages = process.env.OKTA_APPLICATION_USERS_BATCH_PAGES
    ? Number(process.env.OKTA_APPLICATION_USERS_BATCH_PAGES)
    : 2;

  const cacheEntries: OktaApplicationUserCacheEntry[] = [];

  let seen = iterationState.state.seen || 0;
  let after = iterationState.state.after;
  let applicationIndex = iterationState.state.applicationIndex || 0;

  // Track number of pages (API calls) made in current iteration.
  let pagesProcessed = 0;

  // Indicates when all application users for all applications have been
  // fetched.
  let fetchCompleted = false;

  logger.info(
    {
      seen,
      after,
      applicationIndex,
      pageLimit,
      batchPages,
    },
    'Fetching batch of application users...',
  );

  // Work through as many applications as possible, limited only by the number
  // of pages (API calls) that are allowed in single iteration.
  await applicationCache.forEach(
    async ({ entry, entryIndex, totalEntries }) => {
      const applicationId = entry.data!.application.id;

      const queryParams: OktaQueryParams = {
        after,
        limit: String(pageLimit),
      };

      logger.info(
        {
          applicationIndex,
          applicationId,
          queryParams,
        },
        'Fetching batch of pages of users for application...',
      );

      // Create application user iterator for current applicationIndex, picking
      // up at the page represented by the last obtained pagination token.
      const listApplicationUsers = okta.listApplicationUsers(
        applicationId,
        queryParams,
      );

      let usersSeenForApplication = 0;

      await logIfForbiddenOrNotFound({
        logger,
        resource: 'application_users',
        onForbidden: async (err) => {
          await applicationUserCache.putState({
            seen,
            putEntriesKeys: 0,
            fetchCompleted: true,
            encounteredAuthorizationError: true,
          });

          throw new IntegrationInstanceAuthorizationError(
            err,
            'application_users',
          );
        },
        func: async () => {
          await retryApiCall(logger, () => {
            return listApplicationUsers.each(
              (applicationUser: OktaApplicationUser) => {
                cacheEntries.push({
                  key: `app/${applicationId}/user/${applicationUser.id}`,
                  data: {
                    applicationId,
                    applicationUser,
                  },
                });

                usersSeenForApplication++;
                seen++;

                const moreItemsInCurrentPage =
                  listApplicationUsers.currentItems.length > 0;

                if (!moreItemsInCurrentPage) {
                  pagesProcessed++;
                }

                logger.trace(
                  {
                    applicationIndex,
                    applicationId,
                    pagesProcessed,
                    applicationUserId: applicationUser.id,
                  },
                  'Processed user for application',
                );

                // Continue paginating users for the current applicationIndex as
                // long as batchPages has not been reached.
                const continuePaginatingApplicationUsers =
                  pagesProcessed !== batchPages;

                return continuePaginatingApplicationUsers;
              },
            );
          });
        },
      });

      // Increment pagesProcessed when there were no users for an application.
      if (usersSeenForApplication === 0) {
        pagesProcessed++;
      }

      // Clear used pagination token and capture the next one.
      after = extractCursorFromNextUri(listApplicationUsers.nextUri);

      // The current applicationIndex has no more users when no pagination
      // token.
      const applicationComplete = typeof after !== 'string';

      logger.info(
        {
          applicationId,
          applicationIndex,
          applicationComplete,
          pagesProcessed,
          seen,
          after,
        },
        'Finished fetching batch of users for application.',
      );

      if (applicationComplete) {
        // Move to the next application
        applicationIndex = entryIndex + 1;

        // Indicate all fetching is complete when there are no more applications
        // to work through
        fetchCompleted = entryIndex === totalEntries - 1;
      }

      // Stop iteration of everything if we've processed the number of pages
      // allowed. Iteration will stop naturally when there are no more entries.
      return pagesProcessed >= batchPages;
    },
    {
      skip: applicationIndex,
    },
  );

  // Terminate iteration when there were no applications
  if (applicationIndex === 0) {
    fetchCompleted = true;
  }

  const putEntriesKeys = await applicationUserCache.putEntries(cacheEntries);
  const cacheState = await applicationUserCache.putState({
    seen,
    putEntriesKeys,
    fetchCompleted,
  });

  const nextIterationState = {
    ...iterationState,
    finished: fetchCompleted,
    state: {
      after,
      applicationIndex,
      seen,
    },
  };

  logger.info({ nextIterationState, cacheState }, 'Completed one iteration');

  return nextIterationState;
}
