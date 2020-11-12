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
import logIfForbiddenOrNotFound from "../util/logIfForbidden";
import retryApiCall from "../util/retryApiCall";
import fetchBatchOfResources from "./fetchBatchOfResources";
import { OktaUserCacheData } from "./types";

export async function fetchBatchOfUsers(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
  oktaQueryFilter?: Pick<OktaQueryParams, "filter">,
): Promise<IntegrationStepIterationState> {
  return fetchBatchOfResources({
    resource: "users",
    executionContext,
    iterationState,
    pageLimitVariable: "OKTA_USERS_PAGE_LIMIT",
    batchPagesVariable: "OKTA_USERS_BATCH_PAGES",
    fetchCollection: (queryParams: OktaQueryParams) =>
      executionContext.okta.listUsers({
        ...queryParams,
        filter: oktaQueryFilter?.filter,
      }),
    fetchData: async (
      user: OktaUser,
      okta: OktaClient,
      logger: IntegrationLogger,
    ): Promise<OktaUserCacheData> => {
      const factors: OktaFactor[] = [];
      const userGroups: OktaUserGroup[] = [];

      await logIfForbiddenOrNotFound({
        logger,
        resource: `user_factors`,
        func: async () => {
          const listFactors = await okta.listFactors(user.id);
          await retryApiCall(logger, () =>
            listFactors.each((factor: OktaFactor) => {
              factors.push(factor);
            }),
          );
        },
      });

      await logIfForbiddenOrNotFound({
        logger,
        resource: `user_groups`,
        func: async () => {
          const listUserGroups = await okta.listUserGroups(user.id);
          await retryApiCall(logger, () =>
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
  });
}
