import { IntegrationCache } from "@jupiterone/jupiter-managed-integration-sdk";

export async function appendFetchSuccess(
  cache: IntegrationCache,
  resourceName: string,
) {
  const fetchSuccess = await getFetchSuccess(cache);
  fetchSuccess.data.push(resourceName);
  return cache.putEntry(fetchSuccess);
}

export async function getFetchSuccess(cache: IntegrationCache) {
  const fetchSuccessEntry = await cache.getEntry("fetchSuccess");
  if (!fetchSuccessEntry.data) {
    fetchSuccessEntry.data = [];
  }
  return fetchSuccessEntry;
}

export async function fetchSucceeded(
  cache: IntegrationCache,
  resourceNames: string[],
): Promise<boolean> {
  const fetchSuccess = await getFetchSuccess(cache);
  return resourceNames.reduce(
    (prev, curr) => prev && fetchSuccess.data.includes(curr),
    true,
  );
}
