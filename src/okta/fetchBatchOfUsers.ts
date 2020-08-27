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
import logIfForbidden from "../util/logIfForbidden";
import retryIfRateLimited from "../util/retryIfRateLimited";
import fetchBatchOfResources from "./fetchBatchOfResources";
import { OktaUserCacheData } from "./types";

export default async function fetchBatchOfUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
  queryParams?: OktaQueryParams,
): Promise<IntegrationStepIterationState> {
  return fetchBatchOfResources({
    resource: "users",
    executionContext,
    iterationState,
    pageLimitVariable: "OKTA_USERS_PAGE_LIMIT",
    batchPagesVariable: "OKTA_USERS_BATCH_PAGES",
    fetchCollection: () => 
      executionContext.okta.listUsers(queryParams),
    fetchData: async (
      user: OktaUser,
      okta: OktaClient,
      logger: IntegrationLogger,
    ): Promise<OktaUserCacheData> => {
      const factors: OktaFactor[] = [];
      const userGroups: OktaUserGroup[] = [];

      await logIfForbidden({
        logger,
        resource: `user_factors`,
        func: async () => {
          const listFactors = await okta.listFactors(user.id);
          await retryIfRateLimited(logger, () =>
            listFactors.each((factor: OktaFactor) => {
              factors.push(factor);
            }),
          );
        },
      });

      await logIfForbidden({
        logger,
        resource: `user_groups`,
        func: async () => {
          const listUserGroups = await okta.listUserGroups(user.id);
          await retryIfRateLimited(logger, () =>
            listUserGroups.each((group: OktaUserGroup) => {
              userGroups.push(group);
            }),
          );
        },
      });

      return {
        user,
        factors,
        userGroups,
      };
    },
  });
}

export async function fetchBatchOfDeprovisionedUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
): Promise<IntegrationStepIterationState> {
  return fetchBatchOfUsers(executionContext, iterationState, {
    filter: 'status eq "DEPROVISIONED"',
  })
}
