import {
  IntegrationStep,
  IntegrationStepExecutionContext,
  Relationship,
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

      if (groupEntity) {
        await jobState.addRelationships(
          createApplicationGroupRelationships(appEntity, group),
        );
      } else {
        logger.warn(
          { appId: app.id, appName: app.name, groupId: group.id },
          '[SKIP] Group not found in job state, could not build relationship to application',
        );
      }
    });

    //get the individual users that are assigned to this app (ie. not assigned as part of group)
    await apiClient.iterateUsersForApp(app, async (user) => {
      const userEntity = await jobState.findEntity(user.id);

      if (userEntity) {
        const relationships: Relationship[] = createApplicationUserRelationships(
          appEntity,
          user,
        );
        //these relationships include both USER_ASSIGNED_APPLICATION and USER_ASSIGNED_AWS_IAM_ROLE
        //USER_ASSIGNED_APPLICATION will be unique to this user and app pair
        //however, multiple apps for that user can use AWS and have the same IAM Role assigned
        //therefore, the USER_ASSIGNED_AWS_IAM_ROLE relationship may have been specified in a previous app for this user
        for (const rel of relationships) {
          if (!jobState.hasKey(rel._key)) {
            await jobState.addRelationship(rel);
          }
        }
      } else {
        logger.warn(
          { appId: app.id, appName: app.name, userId: user.id },
          '[SKIP] User not found in job state, could not build relationship to application',
        );
      }
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
