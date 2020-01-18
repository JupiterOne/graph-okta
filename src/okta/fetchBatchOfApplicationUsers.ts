import { IntegrationStepIterationState } from "@jupiterone/jupiter-managed-integration-sdk";

import { OktaExecutionContext } from "../types";
import extractCursorFromNextUri from "../util/extractCursorFromNextUri";
import retryIfRateLimited from "../util/retryIfRateLimited";
import {
  OktaApplicationCacheEntry,
  OktaApplicationUser,
  OktaApplicationUserCacheEntry,
  OktaCacheState,
  OktaQueryParams,
} from "./types";

export default async function fetchBatchOfApplicationUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
): Promise<IntegrationStepIterationState> {
  const { okta, logger } = executionContext;

  const pageLimit = process.env.OKTA_APPLICATION_USERS_PAGE_LIMIT
    ? Number(process.env.OKTA_APPLICATION_USERS_PAGE_LIMIT)
    : 200;
  const batchPages = process.env.OKTA_APPLICATION_USERS_BATCH_PAGES
    ? Number(process.env.OKTA_APPLICATION_USERS_BATCH_PAGES)
    : 2;

  const cache = executionContext.clients.getCache();
  const applicationCache = cache.iterableCache<
    OktaApplicationCacheEntry,
    OktaCacheState
  >("applications");
  const applicationUserCache = cache.iterableCache<
    OktaApplicationUserCacheEntry,
    OktaCacheState
  >("application_users");

  const cacheEntries: OktaApplicationUserCacheEntry[] = [];

  let count = iterationState.state.count || 0;
  let after = iterationState.state.after;
  let applicationIndex = iterationState.state.applicationIndex || 0;

  // Track number of pages (API calls) made in current iteration.
  let pagesProcessed = 0;

  // Indicates when all application users for all applications have been
  // fetched.
  let fetchCompleted = false;

  logger.trace(
    {
      count,
      after,
      applicationIndex,
      pageLimit,
      batchPages,
    },
    "Fetching batch of application users...",
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

      logger.trace(
        {
          applicationIndex,
          applicationId,
          queryParams,
        },
        "Fetching batch of pages of users for application...",
      );

      // Create application user iterator for current applicationIndex, picking
      // up at the page represented by the last obtained pagination token.
      const listApplicationUsers = await okta.listApplicationUsers(
        applicationId,
        queryParams,
      );

      // Track number of users seen for the application.
      let userCountForApplication = 0;

      await retryIfRateLimited(logger, () => {
        return listApplicationUsers.each(
          async (applicationUser: OktaApplicationUser) => {
            cacheEntries.push({
              key: `app/${applicationId}/user/${applicationUser.id}`,
              data: {
                applicationId,
                applicationUser,
              },
            });

            userCountForApplication++;
            count++;

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
              "Processed user for application",
            );

            // Continue paginating users for the current applicationIndex as
            // long as batchPages has not been reached.
            const continuePaginatingApplicationUsers =
              pagesProcessed !== batchPages;

            return continuePaginatingApplicationUsers;
          },
        );
      });

      // Increment pagesProcessed when there were no users for an application.
      if (userCountForApplication === 0) {
        pagesProcessed++;
      }

      // Clear used pagination token and capture the next one.
      after = extractCursorFromNextUri(listApplicationUsers.nextUri);

      // The current applicationIndex has no more users when no pagination
      // token.
      const applicationComplete = typeof after !== "string";

      logger.trace(
        {
          applicationId,
          applicationIndex,
          applicationComplete,
          pagesProcessed,
          count,
          after,
        },
        "Finished fetching batch of users for application.",
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

  await applicationUserCache.putEntries(cacheEntries);
  await applicationUserCache.putState({ fetchCompleted });

  const nextIterationState = {
    ...iterationState,
    finished: fetchCompleted,
    state: {
      after,
      applicationIndex,
      count,
    },
  };

  logger.trace(
    nextIterationState,
    "Finished one iteration of fetching application users.",
  );

  return nextIterationState;
}
