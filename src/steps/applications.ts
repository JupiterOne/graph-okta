import {
  IntegrationMissingKeyError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  createAccountApplicationRelationship,
  createApplicationEntity,
  createApplicationGroupRelationships,
  createApplicationUserRelationships,
} from '../converters';
import {
  ACCOUNT_APPLICATION_RELATIONSHIP_TYPE,
  ACCOUNT_ENTITY_TYPE,
  APPLICATION_ENTITY_TYPE,
  APPLICATION_GROUP_RELATIONSHIP_TYPE,
  APPLICATION_USER_RELATIONSHIP_TYPE,
  DATA_ACCOUNT_ENTITY,
  GROUP_IAM_ROLE_RELATIONSHIP_TYPE,
  USER_ENTITY_TYPE,
  USER_IAM_ROLE_RELATIONSHIP_TYPE,
} from '../okta/constants';
import { StandardizedOktaAccount, StandardizedOktaApplication } from '../types';

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
    id: 'fetch-applications',
    name: 'Fetch Applications',
    entities: [
      {
        resourceName: 'Okta Application',
        _type: APPLICATION_ENTITY_TYPE,
        _class: 'Application',
      },
    ],
    relationships: [
      {
        _type: ACCOUNT_APPLICATION_RELATIONSHIP_TYPE,
        _class: RelationshipClass.HAS,
        sourceType: ACCOUNT_ENTITY_TYPE,
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: APPLICATION_GROUP_RELATIONSHIP_TYPE,
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_group',
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: APPLICATION_USER_RELATIONSHIP_TYPE,
        _class: RelationshipClass.ASSIGNED,
        sourceType: USER_ENTITY_TYPE,
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: USER_IAM_ROLE_RELATIONSHIP_TYPE,
        _class: RelationshipClass.ASSIGNED,
        sourceType: USER_ENTITY_TYPE,
        targetType: 'aws_iam_role',
      },
      {
        _type: GROUP_IAM_ROLE_RELATIONSHIP_TYPE,
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_user_group',
        targetType: 'aws_iam_role',
      },
    ],
    dependsOn: ['fetch-groups'],
    executionHandler: fetchApplications,
  },
];
