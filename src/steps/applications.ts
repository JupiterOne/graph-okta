import {
  IntegrationMissingKeyError,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  createAccountApplicationRelationship,
  createApplicationEntity,
  createApplicationGroupRelationships,
  createApplicationUserRelationships,
} from '../converters';
import { StandardizedOktaAccount, StandardizedOktaApplication } from '../types';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  Relationships,
  Steps,
} from './constants';

export async function fetchApplications({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as StandardizedOktaAccount;

  await apiClient.iterateApplications(async (app) => {
    const appEntity = (await jobState.addEntity(
      createApplicationEntity(instance, app),
    )) as StandardizedOktaApplication;

    await jobState.addRelationship(
      createAccountApplicationRelationship(accountEntity, appEntity),
    );

    //get the groups that are assigned to this app
    await apiClient.iterateGroupsForApp(app, async (group) => {
      const groupEntity = await jobState.findEntity(group.id);

      if (!groupEntity) {
        throw new IntegrationMissingKeyError(
          `Expected group with key to exist (key=${group.id})`,
        );
      }

      await jobState.addRelationships(
        createApplicationGroupRelationships(appEntity, group),
      );
    });

    //get the individual users that are assigned to this app (ie. not assigned as part of group)
    await apiClient.iterateUsersForApp(app, async (user) => {
      const userEntity = await jobState.findEntity(user.id);

      if (!userEntity) {
        throw new IntegrationMissingKeyError(
          `Expected user with key to exist (key=${user.id})`,
        );
      }

      await jobState.addRelationships(
        createApplicationUserRelationships(appEntity, user),
      );
    });
  });
}

export const applicationSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.APPLICATIONS,
    name: 'Fetch Applications',
    entities: [Entities.APPLICATION],
    relationships: [
      Relationships.ACCOUNT_HAS_APPLICATION,
      Relationships.GROUP_ASSIGNED_APPLICATION,
      Relationships.USER_ASSIGNED_APPLICATION,
      Relationships.USER_ASSIGNED_AWS_IAM_ROLE,
      Relationships.USER_GROUP_ASSIGNED_AWS_IAM_ROLE,
    ],
    dependsOn: [Steps.GROUPS],
    executionHandler: fetchApplications,
  },
];
