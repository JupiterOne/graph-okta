import {
  IntegrationLogger,
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
import fetchBatchOfResources from "./fetchBatchOfResources";
import { OktaUserCacheData } from "./types";

export default async function fetchBatchOfUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
): Promise<IntegrationStepIterationState> {
  return fetchBatchOfResources({
    resource: "users",
    executionContext,
    iterationState,
    pageLimitVariable: "OKTA_USERS_PAGE_LIMIT",
    batchPagesVariable: "OKTA_USERS_BATCH_PAGES",
    fetchCollection: (queryParams?: OktaQueryParams) =>
      executionContext.okta.listUsers(queryParams),
    fetchData: async (
      user: OktaUser,
      okta: OktaClient,
      logger: IntegrationLogger,
    ): Promise<OktaUserCacheData> => {
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
    },
  });
}
