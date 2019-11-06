import {
  IntegrationCacheEntry,
  IntegrationLogger,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { URL } from "url";
import {
  OktaClient,
  OktaCollection,
  OktaQueryParams,
  OktaResource,
} from "../okta/types";
import { OktaExecutionContext } from "../types";
import retryIfRateLimited from "../util/retryIfRateLimited";
import { OktaCacheState } from "./types";

/**
 * An iterating execution handler that loads Okta resources and their associated
 * data in `BATCH_PAGES` batches of `PAGE_LIMIT` resources, storing the raw
 * response data in the `IntegrationCache` for later processing in another step.
 *
 * This is necessary because Okta throttles API requests, leading to a need to
 * spread requests over a period of time that exceeds the execution time limits
 * of the execution environment.
 */
export default async function fetchBatchOfResources<
  Resource extends OktaResource,
  CacheData
>({
  resource,
  executionContext,
  iterationState,
  pageLimitVariable,
  batchPagesVariable,
  fetchCollection,
  fetchData,
}: {
  resource: string;
  executionContext: OktaExecutionContext;
  iterationState: IntegrationStepIterationState;
  /**
   * The environment variable for the number of resources to request per Okta users
   * API call (pagination `limit`).
   */
  pageLimitVariable: string;
  /**
   * The environment variable for the number of pages to process per iteration.
   */
  batchPagesVariable: string;
  fetchCollection: (
    queryParams?: OktaQueryParams,
  ) => Promise<OktaCollection<Resource>>;
  fetchData: (
    item: Resource,
    okta: OktaClient,
    logger: IntegrationLogger,
  ) => Promise<CacheData>;
}) {
  const pageLimit = process.env[pageLimitVariable]
    ? Number(process.env[pageLimitVariable])
    : 200;
  const batchPages = process.env[batchPagesVariable]
    ? Number(process.env[batchPagesVariable])
    : 2;

  const { okta, logger } = executionContext;
  const cache = executionContext.clients.getCache();
  const resourceCache = cache.iterableCache<
    IntegrationCacheEntry,
    OktaCacheState
  >(resource);

  const cacheEntries: IntegrationCacheEntry[] = [];

  let pagesProcessed = 0;
  let count = iterationState.state.count || 0;

  const queryParams: OktaQueryParams = {
    after: iterationState.state.after,
    limit: String(pageLimit),
  };

  const listUsers = await fetchCollection(queryParams);
  await retryIfRateLimited(logger, () =>
    listUsers.each((user: Resource) => {
      return (async () => {
        cacheEntries.push({
          key: user.id,
          data: await fetchData(user, okta, logger),
        });

        count++;

        const moreItemsInCurrentPage = listUsers.currentItems.length > 0;
        if (!moreItemsInCurrentPage) {
          pagesProcessed++;
        }

        // Prevent the listUsers collection from loading another page by
        // returning `false` once all items of `BATCH_PAGES` have been
        // processed.
        return pagesProcessed !== batchPages;
      })();
    }),
  );

  await resourceCache.putEntries(cacheEntries);

  const finished = typeof listUsers.nextUri !== "string";
  await resourceCache.putState({ fetchCompleted: finished });

  return {
    ...iterationState,
    finished,
    state: {
      after: extractAfterParam(listUsers.nextUri),
      limit: pageLimit,
      pages: pagesProcessed,
      count,
    },
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
