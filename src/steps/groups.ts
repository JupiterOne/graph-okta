import {
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createAccountGroupRelationship } from '../converters';
import {
  createGroupUserRelationship,
  createUserGroupEntity,
} from '../converters/group';
import { StandardizedOktaAccount, StandardizedOktaUserGroup } from '../types';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  Relationships,
  Steps,
} from './constants';

export async function fetchGroups({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as StandardizedOktaAccount;

  const groupCollectionStartTime = Date.now();
  let totalGroupsCollected = 0;

  await apiClient.iterateGroups(async (group) => {
    logger.info({ groupId: group.id }, 'Creating group entity');

    const groupEntity = (await jobState.addEntity(
      createUserGroupEntity(instance.config, group),
    )) as StandardizedOktaUserGroup;

    totalGroupsCollected++;

    await jobState.addRelationship(
      createAccountGroupRelationship(accountEntity, groupEntity),
    );
  });

  const groupCollectionEndTime = Date.now() - groupCollectionStartTime;

  logger.info(
    {
      groupCollectionEndTime,
      totalGroupsCollected,
    },
    'Finished processing groups',
  );
}

export async function buildAppUserGroupUserRelationships(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  await buildGroupEntityToUserRelationships(
    Entities.APP_USER_GROUP._type,
    context,
  );
}

export async function buildUserGroupUserRelationships(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  await buildGroupEntityToUserRelationships(Entities.USER_GROUP._type, context);
}

async function buildGroupEntityToUserRelationships(
  groupEntityType: string,
  {
    instance,
    logger,
    jobState,
  }: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const apiClient = createAPIClient(instance.config, logger);

  logger.info(
    {
      groupEntityType,
    },
    'Starting to build user group relationships',
  );

  await jobState.iterateEntities(
    {
      _type: groupEntityType,
    },
    async (groupEntity) => {
      const groupId = groupEntity.id as string;

      let totalUsersInGroup = 0;

      logger.info(
        {
          groupId,
          groupEntityType,
        },
        'Starting to iterate users in group',
      );

      await apiClient.iterateUsersForGroup(groupId, async (user) => {
        totalUsersInGroup++;
        const userEntity = await jobState.findEntity(user.id);

        if (userEntity) {
          await jobState.addRelationship(
            createGroupUserRelationship(groupEntity, userEntity),
          );
        } else {
          logger.warn(
            { groupId, userId: user.id },
            '[SKIP] User not found in job state, could not build relationship to group',
          );
        }
      });

      logger.info(
        {
          groupEntityType,
          groupId,
          totalUsersInGroup,
        },
        'Finished iterating users in group',
      );
    },
  );
}

export const groupSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.GROUPS,
    name: 'Fetch Groups',
    entities: [Entities.USER_GROUP, Entities.APP_USER_GROUP],
    relationships: [
      Relationships.ACCOUNT_HAS_USER_GROUP,
      Relationships.ACCOUNT_HAS_APP_USER_GROUP,
    ],
    dependsOn: [Steps.USERS],
    executionHandler: fetchGroups,
  },
  {
    id: Steps.APP_USER_GROUP_USERS_RELATIONSHIP,
    name: 'Create app user group to user relationships',
    entities: [],
    relationships: [Relationships.APP_USER_GROUP_HAS_USER],
    dependsOn: [Steps.USERS, Steps.GROUPS],
    executionHandler: buildAppUserGroupUserRelationships,
  },
  {
    id: Steps.USER_GROUP_USERS_RELATIONSHIP,
    name: 'Create user group to user relationships',
    entities: [],
    relationships: [Relationships.USER_GROUP_HAS_USER],
    dependsOn: [Steps.USERS, Steps.GROUPS],
    executionHandler: buildUserGroupUserRelationships,
  },
];
