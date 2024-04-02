import {
  Entity,
  GraphObjectFilter,
  GraphObjectIteratee,
  IntegrationStep,
  IntegrationStepExecutionContext,
  Relationship,
} from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';

import { APIClient, createAPIClient } from '../client';
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

  try {
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
  } catch (err) {
    logger.error({ err }, 'Failed to fetch groups');
  }

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

  logger.info(
    {
      groupEntityType,
    },
    'Starting to build user group relationships',
  );

  try {
    await batchIterateEntities({
      context,
      batchSize: 1000,
      filter: { _type: groupEntityType },
      async iteratee(groupEntities) {
        const usersForGroupEntities = await collectUsersForGroupEntities(
          apiClient,
          groupEntities,
        );

        let relationships: Relationship[] = [];

        for (const { groupEntity, userKeys } of usersForGroupEntities) {
          for (const userKey of userKeys) {
            if (jobState.hasKey(userKey)) {
              relationships.push(
                createGroupUserRelationship(groupEntity, userKey),
              );
            } else {
              logger.warn(
                { groupId: groupEntity.id as string, userId: userKey },
                '[SKIP] User not found in job state, could not build relationship to group',
              );
            }

            if (relationships.length >= 500) {
              await jobState.addRelationships(relationships);
              relationships = [];
            }
          }
        }
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to build group to user relationships');
  }
}

async function collectUsersForGroupEntities(
  apiClient: APIClient,
  groupEntities: Entity[],
) {
  return await pMap(
    groupEntities,
    async (groupEntity) => {
      const groupId = groupEntity.id as string;
      const userKeys: string[] = [];

      await apiClient.iterateUsersForGroup(groupId, async (user) => {
        if (!user.id) {
          return;
        }
        userKeys.push(user.id);
        return Promise.resolve();
      });

      return { groupEntity, userKeys };
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
    dependsOn: [Steps.ACCOUNT],
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
