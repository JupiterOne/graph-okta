import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  Relationship,
  getRawData,
} from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';

import { APIClient, createAPIClient } from '../client';
import { ExecutionConfig, IntegrationConfig } from '../config';
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
import { Group } from '@okta/okta-sdk-nodejs';

export async function fetchGroups({
  instance,
  jobState,
  logger,
  executionConfig,
}: IntegrationStepExecutionContext<IntegrationConfig, ExecutionConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  const { logGroupMetrics } = executionConfig;

  const accountEntity = (await jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as StandardizedOktaAccount;

  const groupCollectionStartTime = Date.now();
  const { stats, collectStats } = getGroupStatsCollector();

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

      collectStats(stats, group);

      await jobState.addRelationship(
        createAccountGroupRelationship(accountEntity, groupEntity),
      );
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch groups');
    throw err;
  }

  const groupCollectionEndTime = Date.now() - groupCollectionStartTime;

  logger.info(
    {
      groupCollectionEndTime,
      ...(logGroupMetrics && { stats }),
    },
    'Finished processing groups',
  );
}

type GroupStats = {
  totalGroupsCollected: number;
  userGroupsCollected: number;
  appUserGroupsCollected: number;
  userGroupsCollectedWithUsers: number;
  appUserGroupsCollectedWithUsers: number;
};

function getGroupStatsCollector() {
  const stats = {
    totalGroupsCollected: 0,
    userGroupsCollected: 0,
    appUserGroupsCollected: 0,
    userGroupsCollectedWithUsers: 0,
    appUserGroupsCollectedWithUsers: 0,
  };

  return {
    stats,
    collectStats: (stats: GroupStats, group: Group) => {
      stats.totalGroupsCollected++;
      const isUserGroup =
        group.type === 'OKTA_GROUP' || group.type === 'BUILT_IN';
      if (isUserGroup) {
        stats.userGroupsCollected++;
      } else {
        stats.appUserGroupsCollected++;
      }
      if (group._embedded?.stats?.usersCount) {
        if (isUserGroup) {
          stats.userGroupsCollectedWithUsers++;
        } else {
          stats.appUserGroupsCollectedWithUsers++;
        }
      }
    },
  };
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
  context: IntegrationStepExecutionContext<IntegrationConfig, ExecutionConfig>,
) {
  await buildGroupEntityToUserRelationships(Entities.USER_GROUP._type, context);
}

async function buildGroupEntityToUserRelationships(
  groupEntityType: string,
  context: IntegrationStepExecutionContext<IntegrationConfig, ExecutionConfig>,
) {
  const { instance, logger, jobState, executionConfig } = context;
  const { logGroupMetrics } = executionConfig;

  const apiClient = createAPIClient(instance.config, logger);

  logger.info(
    {
      groupEntityType,
    },
    'Starting to build user group relationships',
  );

  const stats = {
    processedGroups: 0,
    requestedGroups: 0,
    relationshipsCreated: 0,
  };

  const processGroupEntities = async (groupEntities: Entity[]) => {
    const usersForGroupEntities = await collectUsersForGroupEntities(
      apiClient,
      groupEntities,
    );
    stats.requestedGroups += groupEntities.length;

    let relationships: Relationship[] = [];

    for (const { groupEntity, userKeys } of usersForGroupEntities) {
      for (const userKey of userKeys) {
        if (jobState.hasKey(userKey)) {
          relationships.push(createGroupUserRelationship(groupEntity, userKey));
          stats.relationshipsCreated++;
        } else {
          logger.warn(
            { groupId: groupEntity.id as string, userId: userKey },
            '[SKIP] User not found in job state, could not build relationship to group',
          );
        }

        if (relationships.length >= 500) {
          await jobState.addRelationships(relationships);
          if (logGroupMetrics) {
            logger.info({ stats }, `[${groupEntityType}] Added relationships`);
          }
          relationships = [];
        }
      }
    }

    // Add any remaining relationships
    if (relationships.length) {
      await jobState.addRelationships(relationships);
      if (logGroupMetrics) {
        logger.info({ stats }, `[${groupEntityType}] Added relationships`);
      }
    }
  };

  let everyoneGroupEntity: Entity | undefined;
  try {
    let entitiesBuffer: Entity[] = [];

    const processBufferedEntities = async () => {
      if (entitiesBuffer.length) await processGroupEntities(entitiesBuffer);
      entitiesBuffer = [];
    };

    await jobState.iterateEntities(
      { _type: groupEntityType },
      async (groupEntity) => {
        stats.processedGroups++;
        const rawGroup = getRawData(groupEntity) as Group;
        if ('_embedded' in rawGroup && !rawGroup._embedded?.stats?.usersCount) {
          return;
        }

        if (
          rawGroup.type === 'BUILT_IN' &&
          rawGroup.profile?.name === 'Everyone'
        ) {
          // Don't process the "Everyone" group here.
          // We already know this group relates to all existing users, so no need to fetch all the related users.
          // We'll relate it to all users at the end of this step.
          // https://support.okta.com/help/s/article/The-Everyone-Group-in-Okta?language=en_US
          everyoneGroupEntity = groupEntity;
          return;
        }

        entitiesBuffer.push(groupEntity);

        if (entitiesBuffer.length >= 1000) {
          await processBufferedEntities();
          if (logGroupMetrics) {
            logger.info({ stats }, `[${groupEntityType}] Processed groups`);
          }
        }
      },
    );

    if (entitiesBuffer.length) {
      await processBufferedEntities();
      if (logGroupMetrics) {
        logger.info({ stats }, `[${groupEntityType}] Processed groups`);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to build group to user relationships');
    throw err;
  }

  if (everyoneGroupEntity) {
    logger.info('Adding all users to the Everyone group');
    await jobState.iterateEntities(
      { _type: Entities.USER._type },
      async (userEntity) => {
        await jobState.addRelationship(
          createGroupUserRelationship(
            everyoneGroupEntity as Entity,
            userEntity._key as string,
          ),
        );
      },
    );
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
