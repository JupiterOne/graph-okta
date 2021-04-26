import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  IntegrationMissingKeyError,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { USER_GROUP_ENTITY_TYPE, DATA_ACCOUNT_ENTITY } from '../okta/constants';

import {
  APPLICATION_ENTITY_TYPE,
  GROUP_IAM_ROLE_RELATIONSHIP_TYPE,
  USER_IAM_ROLE_RELATIONSHIP_TYPE,
} from '../okta/constants';
import {
  createApplicationEntity,
  mapAWSRoleAssignment,
} from '../converters/application';

export async function fetchApplications({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateApplications(async (app) => {
    const appProperties = createApplicationEntity(instance, app);
    delete app.credentials; //some OAuth config options stored here
    const appEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: app,
          assign: appProperties,
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: appEntity,
      }),
    );

    //get the groups that are assigned to this app
    await apiClient.iterateGroupsForApp(app, async (group) => {
      const groupEntity = await jobState.findEntity(group.id);

      if (!groupEntity) {
        throw new IntegrationMissingKeyError(
          `Expected group with key to exist (key=${group.id})`,
        );
      }

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.ASSIGNED,
          from: groupEntity,
          to: appEntity,
        }),
      );

      //if this appEntity points to an AWS IAM resource,
      //also add global mappings for this group to that resource
      if (appProperties['awsAccountId']) {
        if (group.profile) {
          const profile = group.profile;
          for (const role of profile.samlRoles || [profile.role]) {
            const relationship = mapAWSRoleAssignment({
              sourceKey: group.id,
              role,
              relationshipType: GROUP_IAM_ROLE_RELATIONSHIP_TYPE,
              awsAccountId: appProperties['awsAccountId'],
            });
            if (relationship) {
              await jobState.addRelationship(relationship);
            }
          }
        }
      }
    });

    //get the individual users that are assigned to this app (ie. not assigned as part of group)
    await apiClient.iterateUsersForApp(app, async (user) => {
      const userEntity = await jobState.findEntity(user.id);

      if (!userEntity) {
        throw new IntegrationMissingKeyError(
          `Expected user with key to exist (key=${user.id})`,
        );
      }

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.ASSIGNED,
          from: userEntity,
          to: appEntity,
        }),
      );

      //if this appEntity points to an AWS IAM resource,
      //also add global mappings for this user to that resource
      if (appProperties['awsAccountId']) {
        if (user.profile) {
          const profile = user.profile;
          for (const role of profile.samlRoles || [profile.role]) {
            const relationship = mapAWSRoleAssignment({
              sourceKey: user.id,
              role: role || '',
              relationshipType: USER_IAM_ROLE_RELATIONSHIP_TYPE,
              awsAccountId: appProperties['awsAccountId'],
            });
            if (relationship) {
              await jobState.addRelationship(relationship);
            }
          }
        }
      }
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
        _type: 'okta_account_has_application',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: 'okta_user_group_assigned_application',
        _class: RelationshipClass.ASSIGNED,
        sourceType: USER_GROUP_ENTITY_TYPE,
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: 'okta_user_assigned_application',
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_user',
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: USER_IAM_ROLE_RELATIONSHIP_TYPE,
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_user',
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
