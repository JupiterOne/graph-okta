import {
  IntegrationLogger,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { OktaExecutionContext } from "../types";
import retryIfRateLimited from "../util/retryIfRateLimited";
import fetchBatchOfResources from "./fetchBatchOfResources";
import {
  OktaApplication,
  OktaApplicationCacheData,
  OktaApplicationGroup,
  OktaApplicationUser,
  OktaClient,
  OktaQueryParams,
} from "./types";

export default async function fetchBatchOfApplications(
  executionContext: OktaExecutionContext,
  iterationState: IntegrationStepIterationState,
): Promise<IntegrationStepIterationState> {
  return fetchBatchOfResources({
    resource: "applications",
    executionContext,
    iterationState,
    pageLimitVariable: "OKTA_APPLICATIONS_PAGE_LIMIT",
    batchPagesVariable: "OKTA_APPLICATIONS_BATCH_PAGES",
    fetchCollection: (queryParams?: OktaQueryParams) =>
      executionContext.okta.listApplications(queryParams),
    fetchData: async (
      application: OktaApplication,
      okta: OktaClient,
      logger: IntegrationLogger,
    ): Promise<OktaApplicationCacheData> => {
      const applicationGroups: OktaApplicationGroup[] = [];
      const applicationUsers: OktaApplicationUser[] = [];

      const listApplicationGroups = await okta.listApplicationGroupAssignments(
        application.id,
      );
      await retryIfRateLimited(logger, () =>
        listApplicationGroups.each((group: OktaApplicationGroup) => {
          applicationGroups.push(group);
        }),
      );

      const listApplicationUsers = await okta.listApplicationUsers(
        application.id,
      );
      await retryIfRateLimited(logger, () =>
        listApplicationUsers.each((user: OktaApplicationUser) => {
          applicationUsers.push(user);
        }),
      );

      return {
        application,
        applicationGroups,
        applicationUsers,
      };
    },
  });
}
