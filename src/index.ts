import {
  IntegrationError,
  IntegrationInvocationConfig,
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
} from '@jupiterone/jupiter-managed-integration-sdk';
import initializeContext from './initializeContext';
import invocationValidator from './invocationValidator';
import fetchBatchOfApplications from './okta/fetchBatchOfApplications';
import fetchBatchOfApplicationUsers from './okta/fetchBatchOfApplicationUsers';
import {
  fetchBatchOfUsers,
  fetchBatchOfDeprovisionedUsers,
} from './okta/fetchBatchOfUsers';
import synchronizeAccount from './synchronizers/synchronizeAccount';
import synchronizeApplications from './synchronizers/synchronizeApplications';
import synchronizeGroups from './synchronizers/synchronizeGroups';
import synchronizeUsers from './synchronizers/synchronizeUsers';
import {
  OktaExecutionContext,
  OktaIntegrationStepIterationState,
} from './types';

function fetchResourceWith(
  func: (
    context: OktaExecutionContext,
    state: OktaIntegrationStepIterationState,
  ) => Promise<OktaIntegrationStepIterationState>,
): (
  context: IntegrationStepExecutionContext,
) => Promise<IntegrationStepExecutionResult> {
  return async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepExecutionResult> => {
    const iterationState = executionContext.event.iterationState;
    if (!iterationState) {
      throw new IntegrationError('Expected iterationState not found in event!');
    }
    return func(initializeContext(executionContext), iterationState);
  };
}

export const stepFunctionsInvocationConfig: IntegrationInvocationConfig = {
  instanceConfigFields: {
    oktaOrgUrl: {
      type: 'string',
      mask: false,
    },
    oktaApiKey: {
      type: 'string',
      mask: true,
    },
  },

  invocationValidator,

  integrationStepPhases: [
    {
      steps: [
        {
          id: 'account',
          name: 'Account',
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            return synchronizeAccount(initializeContext(executionContext));
          },
        },
      ],
    },
    {
      steps: [
        {
          id: 'fetch-users',
          name: 'Fetch Users',
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfUsers),
        },
        {
          id: 'fetch-deprovisioned-users',
          name: 'Fetch Deprovisioned Users',
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfDeprovisionedUsers),
        },
      ],
    },
    {
      steps: [
        {
          id: 'fetch-applications',
          name: 'Fetch Applications',
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfApplications),
        },
      ],
    },
    {
      steps: [
        {
          id: 'fetch-application-users',
          name: 'Fetch Application Users',
          iterates: true,
          executionHandler: fetchResourceWith(fetchBatchOfApplicationUsers),
        },
      ],
    },
    {
      steps: [
        {
          id: 'groups',
          name: 'Groups',
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            return synchronizeGroups(initializeContext(executionContext));
          },
        },
      ],
    },
    {
      steps: [
        {
          id: 'users',
          name: 'Users',
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            return synchronizeUsers(initializeContext(executionContext));
          },
        },
      ],
    },
    {
      steps: [
        {
          id: 'applications',
          name: 'Applications',
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            return synchronizeApplications(initializeContext(executionContext));
          },
        },
      ],
    },
  ],
};
