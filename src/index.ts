import {
  IntegrationError,
  IntegrationInvocationConfig,
  IntegrationStepExecutionContext,
} from "@jupiterone/jupiter-managed-integration-sdk";

import initializeContext from "./initializeContext";
import invocationValidator from "./invocationValidator";
import fetchBatchOfApplications from "./okta/fetchBatchOfApplications";
import fetchBatchOfUsers from "./okta/fetchBatchOfUsers";
import synchronizeAccount from "./synchronizers/synchronizeAccount";
import synchronizeApplications from "./synchronizers/synchronizeApplications";
import synchronizeGroups from "./synchronizers/synchronizeGroups";
import synchronizeUsers from "./synchronizers/synchronizeUsers";

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
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            const iterationState = executionContext.event.iterationState;
            if (!iterationState) {
              throw new IntegrationError(
                "Expected iterationState not found in event!",
              );
            }
            return fetchBatchOfUsers(
              await initializeContext(executionContext),
              iterationState,
            );
          },
        },
      ],
    },
    {
      steps: [
        {
          id: "fetch-applications",
          name: "Fetch Applications",
          iterates: true,
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            const iterationState = executionContext.event.iterationState;
            if (!iterationState) {
              throw new IntegrationError(
                "Expected iterationState not found in event!",
              );
            }
            return fetchBatchOfApplications(
              await initializeContext(executionContext),
              iterationState,
            );
          },
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
