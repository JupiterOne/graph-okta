import {
  IntegrationLogger,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { URL } from "url";
import {
  OktaClient,
  OktaFactor,
  OktaQueryParams,
  OktaUser,
  OktaUserGroup,
} from "../okta/types";
import { OktaExecutionContext } from "../types";
import retryIfRateLimited from "../util/retryIfRateLimited";
import { OktaCacheState, OktaUserCacheData, OktaUserCacheEntry } from "./types";

/**
 * The number of users to request per Okta users API call (pagination `limit`).
 */
const PAGE_LIMIT = process.env.OKTA_USERS_PAGE_LIMIT
  ? Number(process.env.OKTA_USERS_PAGE_LIMIT)
  : 200;

/**
 * The number of pages to process per iteration.
 */
const BATCH_PAGES = process.env.OKTA_USERS_BATCH_PAGES
  ? Number(process.env.OKTA_USERS_BATCH_PAGES)
  : 2;

/**
 * An iterating execution handler that loads Okta users and associated data in
 * `BATCH_PAGES` batches of `PAGE_LIMIT` users, storing the raw response data in
 * the `IntegrationCache` for later processing in another step.
 *
 * This is necessary because Okta throttles API requests, leading to a need to
 * spread requests over a period of time that exceeds the execution time limits
 * of the execution environment.
 */
export default async function fetchBatchOfUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
): Promise<IntegrationStepIterationState> {
  const { okta, logger } = executionContext;
  const cache = executionContext.clients.getCache();
  const userCache = cache.iterableCache<OktaUserCacheEntry, OktaCacheState>(
    "users",
  );

  const userQueryParams: OktaQueryParams = {
    after: iterationState.state.after,
    limit: String(PAGE_LIMIT),
  };

  const userCacheEntries: OktaUserCacheEntry[] = [];

  let pagesProcessed = 0;
  let count = iterationState.state.count || 0;

  const listUsers = await okta.listUsers(userQueryParams);
  await retryIfRateLimited(logger, () =>
    listUsers.each((user: OktaUser) => {
      return (async () => {
        userCacheEntries.push({
          key: user.id,
          data: await fetchUserData(user, okta, logger),
        });

        count++;

        const moreItemsInCurrentPage = listUsers.currentItems.length > 0;
        if (!moreItemsInCurrentPage) {
          pagesProcessed++;
        }

        // Prevent the listUsers collection from loading another page by
        // returning `false` once all items of `BATCH_PAGES` have been
        // processed.
        return pagesProcessed !== BATCH_PAGES;
      })();
    }),
  );

  await userCache.putEntries(userCacheEntries);

  const finished = typeof listUsers.nextUri !== "string";
  await userCache.putState({ fetchCompleted: finished });

  return {
    ...iterationState,
    finished,
    state: {
      after: extractAfterParam(listUsers.nextUri),
      limit: PAGE_LIMIT,
      pages: pagesProcessed,
      count,
    },
  };
}

async function fetchUserData(
  user: OktaUser,
  okta: OktaClient,
  logger: IntegrationLogger,
): Promise<OktaUserCacheData> {
  const factors: OktaFactor[] = [];
  const userGroups: OktaUserGroup[] = [];

  const listFactors = await okta.listFactors(user.id);
  await retryIfRateLimited(logger, () =>
    listFactors.each((factor: OktaFactor) => {
      factors.push(factor);
    }),
  );

  const listUserGroups = await okta.listUserGroups(user.id);
  await retryIfRateLimited(logger, () =>
    listUserGroups.each((group: OktaUserGroup) => {
      userGroups.push(group);
    }),
  );

  return {
    user,
    factors,
    userGroups,
  };
}

/*
 * Extracts cursor 00ubfjQEMYBLRUWIEDKK from
 * https://lifeomic.okta.com/api/v1/users?after=00ubfjQEMYBLRUWIEDKK
 */
function extractAfterParam(
  nextUri: string | undefined,
): string | null | undefined {
  if (nextUri) {
    const url = new URL(nextUri);
    return url.searchParams.get("after");
  }
}
