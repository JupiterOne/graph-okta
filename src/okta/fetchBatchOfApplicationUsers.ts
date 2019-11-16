import { IntegrationStepIterationState } from "@jupiterone/jupiter-managed-integration-sdk";
import { OktaExecutionContext } from "../types";
import extractCursorFromNextUri from "../util/extractCursorFromNextUri";
import retryIfRateLimited from "../util/retryIfRateLimited";
import {
  OktaApplicationCacheData,
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
  const pageLimit = process.env.OKTA_APPLICATION_USERS_PAGE_LIMIT
    ? Number(process.env.OKTA_APPLICATION_USERS_PAGE_LIMIT)
    : 200;
  const batchPages = process.env.OKTA_APPLICATION_USERS_BATCH_PAGES
    ? Number(process.env.OKTA_APPLICATION_USERS_BATCH_PAGES)
    : 2;

  const { okta, logger } = executionContext;
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

  // Should be maintained across applications so that we know the total number
  // of pages processed.
  let pagesProcessed = 0;

  let count = iterationState.state.count || 0;
  let after = iterationState.state.after;
  let applicationIndex = iterationState.state.applicationIndex || 0;

  let fetchCompleted = false;

  await applicationCache.forEach(async (entry, entryIndex, totalEntries) => {
    const applicationId = (entry.data as OktaApplicationCacheData).application
      .id;

    const queryParams: OktaQueryParams = {
      after,
      limit: String(pageLimit),
    };

    const listApplicationUsers = await okta.listApplicationUsers(
      applicationId,
      queryParams,
    );

    await retryIfRateLimited(logger, () =>
      listApplicationUsers.each(
        async (applicationUser: OktaApplicationUser) => {
          cacheEntries.push({
            key: `app/${applicationId}/user/${applicationUser.id}`,
            data: {
              applicationId,
              applicationUser,
            },
          });

          count++;

          const moreItemsInCurrentPage =
            listApplicationUsers.currentItems.length > 0;
          if (!moreItemsInCurrentPage) {
            pagesProcessed++;
            after = extractCursorFromNextUri(listApplicationUsers.nextUri);
          }

          // Prevent the listResources collection from loading another page by
          // returning `false` once all items of `BATCH_PAGES` have been
          // processed.
          return pagesProcessed !== batchPages;
        },
      ),
    );

    const applicationComplete =
      typeof listApplicationUsers.nextUri !== "string";
    if (applicationComplete) {
      applicationIndex = entryIndex;
      fetchCompleted = entryIndex === totalEntries - 1;
    } else {
      // We need to stop iteration through the applications if the users for the
      // current application were not fully processed.
      return true;
    }
  }, applicationIndex);

  await applicationUserCache.putEntries(cacheEntries);
  await applicationUserCache.putState({ fetchCompleted });

  return {
    ...iterationState,
    finished: fetchCompleted,
    state: {
      after,
      applicationIndex,
      limit: pageLimit,
      pages: pagesProcessed,
      count,
    },
  };
}
