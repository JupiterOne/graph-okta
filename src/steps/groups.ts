import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';

import { APIClient, createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createAccountGroupRelationship } from '../converters';
import {
  createGroupUserRelationship,
  createUserGroupEntity,
} from '../converters/group';
import { OktaUser } from '../okta/types';
import { StandardizedOktaAccount, StandardizedOktaUserGroup } from '../types';
import {
  batchIterateEntities,
  getUserIdToUserEntityMap,
} from '../util/jobState';
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
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { instance, logger, jobState } = context;
  const apiClient = createAPIClient(instance.config, logger);
  const userIdToUserEntityMap = await getUserIdToUserEntityMap(jobState);

  logger.info(
    {
      groupEntityType,
    },
    'Starting to build user group relationships',
  );

  async function createGroupUserRelationshipWithJob(
    groupEntity: Entity,
    user: OktaUser,
  ) {
    const groupId = groupEntity.id as string;
    const userEntity = userIdToUserEntityMap.get(user.id);

    if (userEntity) {
      await jobState.addRelationship(
        createGroupUserRelationship(groupEntity, userEntity),
      );

      logger.info(
        {
          groupId,
          userId: user.id,
        },
        'Successfully created user group relationship',
      );
    } else {
      logger.warn(
        { groupId, userId: user.id },
        '[SKIP] User not found in job state, could not build relationship to group',
      );
    }
  }

  await batchIterateEntities({
    context,
    batchSize: 1000,
    filter: { _type: groupEntityType },
    async iteratee(groupEntities) {
      const iterateGroupEntitiesBatchStartTime = Date.now();

      logger.info(
        {
          groupEntityType,
          numGroupEntities: groupEntities.length,
        },
        'Iterating batch of group entities',
      );

      const usersForGroupEntities = await collectUsersForGroupEntities(
        apiClient,
        groupEntities,
      );

      for (const { groupEntity, users } of usersForGroupEntities) {
        for (const user of users) {
          await createGroupUserRelationshipWithJob(groupEntity, user);
        }
      }

      const iterateGroupEntitiesBatchTotalTime =
        Date.now() - iterateGroupEntitiesBatchStartTime;

      logger.info(
        {
          iterateGroupEntitiesBatchTotalTime,
          groupEntityType,
          numGroupEntities: groupEntities.length,
          iterateGroupEntitiesBatchStartTime,
        },
        'Finished iterating batch of group entities',
      );
    },
  });
}

async function collectUsersForGroupEntities(
  apiClient: APIClient,
  groupEntities: Entity[],
) {
  return await pMap(
    groupEntities,
    async (groupEntity) => {
      const groupId = groupEntity.id as string;
      const users: OktaUser[] = [];

      await apiClient.iterateUsersForGroup(groupId, async (user) => {
        users.push(user);
        return Promise.resolve();
      });

      return { groupEntity, users };
    },
    {
      concurrency: 10,
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
