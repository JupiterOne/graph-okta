import { URL } from "url";

import {
  IntegrationLogger,
  IntegrationStepExecutionResult,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

import {
  OktaClient,
  OktaFactor,
  OktaQueryParams,
  OktaUser,
  OktaUserGroup,
} from "../okta/types";
import { OktaExecutionContext } from "../types";
import retryIfRateLimited from "../util/retryIfRateLimited";
import {
  createUserCache,
  OktaUserCacheData,
  OktaUserCacheEntry,
} from "./cache";

const PAGE_LIMIT = 5;

/**
 * An iterating execution handler that loads Okta users and associated data in
 * batches of `PAGE_LIMIT`, storing the raw response data in the
 * `IntegrationCache` for later processing in another step.
 *
 * This is necessary because Okta throttles API requests, leading to a need to
 * spread requests over a period of time that exceeds the execution time limits
 * of the execution environment.
 */
export default async function fetchBatchOfUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
): Promise<IntegrationStepExecutionResult> {
  const { okta, logger } = executionContext;
  const userCache = createUserCache(executionContext.clients.getCache());

  const userQueryParams: OktaQueryParams = {
    after: iterationState.state.after,
    limit: String(PAGE_LIMIT),
  };

  const userIds =
    iterationState.iteration > 0 ? (await userCache.getIds())! : [];
  const userCacheEntries: OktaUserCacheEntry[] = [];

  const listUsers = await okta.listUsers(userQueryParams);
  await retryIfRateLimited(logger, () =>
    listUsers.each((user: OktaUser) => {
      userIds.push(user.id);

      return (async () => {
        userCacheEntries.push({
          key: user.id,
          data: await fetchUserData(user, okta, logger),
        });

        // Prevent the listUsers collection from loading another page by
        // returning `false` once all items of the current page have been
        // processed.
        return listUsers.currentItems.length > 0;
      })();
    }),
  );

  await Promise.all([
    userCache.putIds(userIds),
    userCache.putEntries(userCacheEntries),
  ]);

  return {
    iterationState: {
      ...iterationState,
      finished: typeof listUsers.nextUri !== "string",
      state: {
        after: extractAfterParam(listUsers.nextUri),
        limit: PAGE_LIMIT,
        count: userIds.length,
      },
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

// https://lifeomic.okta.com/api/v1/users?after=00ubfjQEMYBLRUWIEDKK
function extractAfterParam(
  nextUri: string | undefined,
): string | null | undefined {
  if (nextUri) {
    const url = new URL(nextUri);
    return url.searchParams.get("after");
  }
}
