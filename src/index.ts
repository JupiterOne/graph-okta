import {
  IntegrationInvocationConfig,
  IntegrationStepExecutionContext,
} from "@jupiterone/jupiter-managed-integration-sdk";

import initializeContext from "./initializeContext";
import invocationValidator from "./invocationValidator";
import fetchBatchOfUsers from "./okta/fetchBatchOfUsers";
import synchronizeAccount from "./synchronizers/synchronizeAccount";
import synchronizeApplications from "./synchronizers/synchronizeApplications";
import synchronizeGroups from "./synchronizers/synchronizeGroups";
import synchronizeUsers from "./synchronizers/synchronizeUsers";

const invocationConfig: IntegrationInvocationConfig = {
  invocationValidator,
  integrationStepPhases: [
    {
      steps: [
        {
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
          name: "Fetch Users",
          iterates: true,
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ) => {
            return fetchBatchOfUsers(
              await initializeContext(executionContext),
              executionContext.event.continuation!,
            );
          },
        },
      ],
    },
    {
      steps: [
        {
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
