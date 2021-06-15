import {
  IntegrationMissingKeyError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createAccountGroupRelationship } from '../converters';
import {
  createGroupUserRelationship,
  createUserGroupEntity,
} from '../converters/group';
import {
  ACCOUNT_ENTITY_TYPE,
  ACCOUNT_GROUP_RELATIONSHIP_TYPE,
  APP_USER_GROUP_ENTITY_TYPE,
  DATA_ACCOUNT_ENTITY,
  GROUP_USER_RELATIONSHIP_TYPE,
  USER_ENTITY_TYPE,
  USER_GROUP_ENTITY_TYPE,
} from '../okta/constants';
import { StandardizedOktaAccount, StandardizedOktaUserGroup } from '../types';

export async function fetchGroups({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as StandardizedOktaAccount;

  await apiClient.iterateGroups(async (group) => {
    const groupEntity = (await jobState.addEntity(
      createUserGroupEntity(instance.config, group),
    )) as StandardizedOktaUserGroup;

    await jobState.addRelationship(
      createAccountGroupRelationship(accountEntity, groupEntity),
    );

    await apiClient.iterateUsersForGroup(group, async (user) => {
      const userEntity = await jobState.findEntity(user.id);

      if (!userEntity) {
        throw new IntegrationMissingKeyError(
          `Expected user with key to exist (key=${user.id})`,
        );
      }

      await jobState.addRelationship(
        createGroupUserRelationship(groupEntity, userEntity),
      );
    });
  });
}

export const groupSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-groups',
    name: 'Fetch Groups',
    entities: [
      {
        resourceName: 'Okta UserGroup',
        _type: USER_GROUP_ENTITY_TYPE,
        _class: 'UserGroup',
      },
      {
        resourceName: 'Okta App UserGroup',
        _type: APP_USER_GROUP_ENTITY_TYPE,
        _class: 'UserGroup',
      },
    ],
    relationships: [
      {
        _type: ACCOUNT_GROUP_RELATIONSHIP_TYPE,
        _class: RelationshipClass.HAS,
        sourceType: ACCOUNT_ENTITY_TYPE,
        targetType: USER_GROUP_ENTITY_TYPE,
      },
      {
        _type: ACCOUNT_GROUP_RELATIONSHIP_TYPE,
        _class: RelationshipClass.HAS,
        sourceType: ACCOUNT_ENTITY_TYPE,
        targetType: APP_USER_GROUP_ENTITY_TYPE,
      },
      {
        _type: GROUP_USER_RELATIONSHIP_TYPE,
        _class: RelationshipClass.HAS,
        sourceType: USER_GROUP_ENTITY_TYPE,
        targetType: USER_ENTITY_TYPE,
      },
      {
        _type: GROUP_USER_RELATIONSHIP_TYPE,
        _class: RelationshipClass.HAS,
        sourceType: APP_USER_GROUP_ENTITY_TYPE,
        targetType: USER_ENTITY_TYPE,
      },
    ],
    dependsOn: ['fetch-users'],
    executionHandler: fetchGroups,
  },
];
