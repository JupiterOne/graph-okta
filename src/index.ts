import {
  IntegrationError,
  IntegrationInvocationConfig,
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";
import initializeContext from "./initializeContext";
import invocationValidator from "./invocationValidator";
import fetchBatchOfApplications from "./okta/fetchBatchOfApplications";
import fetchBatchOfApplicationUsers from "./okta/fetchBatchOfApplicationUsers";
import fetchBatchOfUsers from "./okta/fetchBatchOfUsers";
import synchronizeAccount from "./synchronizers/synchronizeAccount";
import synchronizeApplications from "./synchronizers/synchronizeApplications";
import synchronizeGroups from "./synchronizers/synchronizeGroups";
import synchronizeUsers from "./synchronizers/synchronizeUsers";
import { OktaExecutionContext } from "./types";

function fetchResourceWith(
  func: (
    context: OktaExecutionContext,
    state: IntegrationStepIterationState,
  ) => Promise<IntegrationStepIterationState>,
): (
  context: IntegrationStepExecutionContext,
) => Promise<IntegrationStepExecutionResult> {
  return async (executionContext: IntegrationStepExecutionContext) => {
    const iterationState = executionContext.event.iterationState;
    if (!iterationState) {
      throw new IntegrationError("Expected iterationState not found in event!");
    }
    return func(await initializeContext(executionContext), iterationState);
  };
}

const invocationConfig: IntegrationInvocationConfig = {
  instanceConfigFields: {
    oktaOrgUrl: {
      type: "string",
      mask: false,
    },
    oktaApiKey: {
      type: "string",
      mask: true,
    },
  },

  invocationValidator,

  integrationStepPhases: [
    {
      steps: [
        {
          id: "account",
          name: "Account",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            return synchronizeAccount(
              await initializeContext(executionContext),
            );
          },
        },
      ],
    },
    {
      steps: [
        {
          id: "fetch-users",
          name: "Fetch Users",
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfUsers),
        },
      ],
    },
    {
      steps: [
        {
          id: "fetch-applications",
          name: "Fetch Applications",
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfApplications),
        },
      ],
    },
    {
      steps: [
        {
          id: "fetch-application-users",
          name: "Fetch Application Users",
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfApplicationUsers),
        },
      ],
    },
    {
      steps: [
        {
          id: "groups",
          name: "Groups",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            return synchronizeGroups(await initializeContext(executionContext));
          },
        },
      ],
    },
    {
      steps: [
        {
          id: "users",
          name: "Users",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            return synchronizeUsers(await initializeContext(executionContext));
          },
        },
      ],
    },
    {
      steps: [
        {
          id: "applications",
          name: "Applications",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            return synchronizeApplications(
              await initializeContext(executionContext),
            );
          },
        },
      ],
    },
  ],
};

export default invocationConfig;
