import {
  IntegrationCacheEntry,
  IntegrationInstanceAuthorizationError,
  IntegrationLogger,
} from '@jupiterone/jupiter-managed-integration-sdk';
import {
  OktaClient,
  OktaCollection,
  OktaQueryParams,
  OktaResource,
} from '../okta/types';
import {
  OktaExecutionContext,
  OktaIntegrationStepIterationState,
} from '../types';
import extractCursorFromNextUri from '../util/extractCursorFromNextUri';
import logIfForbiddenOrNotFound from '../util/logIfForbidden';
import retryApiCall from '../util/retryApiCall';
import { OktaCacheState } from './types';

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
  iterationState: OktaIntegrationStepIterationState;
  /**
   * The environment variable for the number of resources to request per Okta
   * API call (pagination `limit`).
   */
  pageLimitVariable: string;
  /**
   * The environment variable for the number of pages to process per iteration.
   */
  batchPagesVariable: string;
  fetchCollection: (queryParams: OktaQueryParams) => OktaCollection<Resource>;
  fetchData: (
    item: Resource,
    okta: OktaClient,
    logger: IntegrationLogger,
  ) => Promise<CacheData>;
}): Promise<OktaIntegrationStepIterationState> {
  const pageLimit = process.env[pageLimitVariable]
    ? Number(process.env[pageLimitVariable])
    : 200;
  const batchPages = process.env[batchPagesVariable]
    ? Number(process.env[batchPagesVariable])
    : 2;

  const { okta, logger } = executionContext;
  const resourceLogger = logger.child({ resource });

  const cache = executionContext.clients.getCache();
  const resourceCache = cache.iterableCache<
    IntegrationCacheEntry,
    OktaCacheState
  >(resource);

  const cacheEntries: IntegrationCacheEntry[] = [];

  let pagesProcessed = 0;
  let seen = iterationState.state.seen || 0;

  const queryParams: OktaQueryParams = {
    after: iterationState.state.after,
    limit: String(pageLimit),
  };

  const listResources = fetchCollection(queryParams);

  await logIfForbiddenOrNotFound({
    logger: resourceLogger,
    resource,
    onForbidden: async (err) => {
      await resourceCache.putState({
        seen,
        putEntriesKeys: 0,
        fetchCompleted: true,
        encounteredAuthorizationError: true,
      });

      throw new IntegrationInstanceAuthorizationError(err, resource);
    },
    func: async () => {
      await retryApiCall(resourceLogger, () =>
        listResources.each(async (res: Resource) => {
          cacheEntries.push({
            key: res.id,
            data: await fetchData(res, okta, resourceLogger),
          });

          seen++;

          const moreItemsInCurrentPage = listResources.currentItems.length > 0;
          if (!moreItemsInCurrentPage) {
            pagesProcessed++;
            resourceLogger.info(
              { resource: { type: resource, pagesProcessed } },
              'Fetching page of resources completed.',
            );
          }

          // Prevent the listResources collection from loading another page by
          // returning `false` once all items of `BATCH_PAGES` have been
          // processed.
          return pagesProcessed !== batchPages;
        }),
      );
    },
  });

  const finished = typeof listResources.nextUri !== 'string';

  const putEntriesKeys = await resourceCache.putEntries(cacheEntries);
  const cacheState = await resourceCache.putState({
    seen,
    putEntriesKeys,
    fetchCompleted: finished,
  });

  const nextIterationState = {
    ...iterationState,
    finished,
    state: {
      after: extractCursorFromNextUri(listResources.nextUri),
      limit: pageLimit,
      pages: pagesProcessed,
      seen,
    },
  };

  resourceLogger.info(
    { nextIterationState, cacheState },
    'Completed one iteration',
  );

  return nextIterationState;
}
