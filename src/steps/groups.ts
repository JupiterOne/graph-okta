import {
  Entity,
  GraphObjectFilter,
  GraphObjectIteratee,
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
  DATA_ACCOUNT_ENTITY,
  DATA_USER_ENTITIES_MAP,
  Entities,
  IngestionSources,
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
    const groupEntity = createUserGroupEntity(
      instance.config,
      group,
    ) as StandardizedOktaUserGroup;
    if (!groupEntity) {
      return;
    }

    logger.debug({ groupId: group.id }, 'Creating group entity');
    await jobState.addEntity(groupEntity);

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
  if (process.env.SKIP_STEP_APP_USER_GROUP_USERS_RELATIONSHIP) {
    context.logger.info('Skipping app user group relationships step');
    return;
  }

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
  const userIdToUserEntityMap = (await jobState.getData<Map<string, Entity>>(
    DATA_USER_ENTITIES_MAP,
  ))!;

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
    if (!user.id) {
      return;
    }

    const groupId = groupEntity.id as string;
    const userEntity = userIdToUserEntityMap.get(user.id);

    if (userEntity) {
      await jobState.addRelationship(
        createGroupUserRelationship(groupEntity, userEntity),
      );

      logger.debug(
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
      const usersForGroupEntities = await collectUsersForGroupEntities(
        apiClient,
        groupEntities,
      );

      for (const { groupEntity, users } of usersForGroupEntities) {
        for (const user of users) {
          await createGroupUserRelationshipWithJob(groupEntity, user);
        }
      }
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
      /**
       * We throttle requests when the x-rate-limit-remaining header drops below
       * 5. Previously, our concurrency here was 10, which meant that even if a
       * request was throttled, there could be 9 additional requests coming right
       * on its tail - which will result in throttling.
       */
      concurrency: 4,
    },
  );
}

interface IterateEntitiesWithBufferParams {
  context: IntegrationStepExecutionContext<IntegrationConfig>;
  batchSize: number;
  filter: GraphObjectFilter;
  iteratee: GraphObjectIteratee<Entity[]>;
}

async function batchIterateEntities({
  context: { jobState },
  batchSize,
  filter,
  iteratee,
}: IterateEntitiesWithBufferParams) {
  let entitiesBuffer: Entity[] = [];

  async function processBufferedEntities() {
    if (entitiesBuffer.length) await iteratee(entitiesBuffer);
    entitiesBuffer = [];
  }

  await jobState.iterateEntities(filter, async (e) => {
    entitiesBuffer.push(e);

    if (entitiesBuffer.length >= batchSize) {
      await processBufferedEntities();
    }
  });

  await processBufferedEntities();
}

export const groupSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.GROUPS,
    ingestionSourceId: IngestionSources.GROUPS,
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
    ingestionSourceId: IngestionSources.GROUPS,
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
