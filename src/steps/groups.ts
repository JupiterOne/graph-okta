import {
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
  getRawData,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { ExecutionConfig, IntegrationConfig } from '../config';
import { createAccountGroupRelationship } from '../converters';
import {
  createGroupUserRelationship,
  createUserGroupEntity,
} from '../converters/group';
import { StandardizedOktaAccount, StandardizedOktaUserGroup } from '../types';
import {
  APP_USER_GROUP_IDS,
  DATA_ACCOUNT_ENTITY,
  EVERYONE_GROUP_KEY,
  Entities,
  IngestionSources,
  Relationships,
  Steps,
  USER_GROUP_IDS,
} from './constants';
import { Group } from '@okta/okta-sdk-nodejs';
import { chunk } from 'lodash';
import { withConcurrentQueue } from '../util/withConcurrentQueue';
import { createStatsLogger } from '../util/createStatsLogger';

export async function fetchGroups({
  instance,
  jobState,
  logger,
  executionConfig,
}: IntegrationStepExecutionContext<IntegrationConfig, ExecutionConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  const { logMetrics } = executionConfig;

  const accountEntity = (await jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as StandardizedOktaAccount;

  const groupCollectionStartTime = Date.now();
  const { stats, collectStats } = getGroupStatsCollector();

  const { groupIds, collectGroupId } = getGroupIdsCollector();
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

      if (group.type === 'BUILT_IN' && group.profile?.name === 'Everyone') {
        await jobState.setData(EVERYONE_GROUP_KEY, groupEntity._key);
      } else {
        collectGroupId(groupEntity);
      }

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

  await Promise.all([
    jobState.setData(USER_GROUP_IDS, groupIds.userGroupIds),
    jobState.setData(APP_USER_GROUP_IDS, groupIds.appUserGroupIds),
  ]);

  logger.info(
    {
      groupCollectionEndTime,
      ...(logMetrics && { stats }),
    },
    'Finished processing groups',
  );
}

function getGroupIdsCollector() {
  const userGroupIds: string[] = [];
  const appUserGroupIds: string[] = [];

  return {
    groupIds: {
      userGroupIds,
      appUserGroupIds,
    },
    collectGroupId: (groupEntity: StandardizedOktaUserGroup) => {
      const rawGroup = getRawData(groupEntity) as Group;
      if ('_embedded' in rawGroup && !rawGroup._embedded?.stats?.usersCount) {
        return;
      }
      if (groupEntity._type === Entities.USER_GROUP._type) {
        userGroupIds.push(groupEntity.id);
      }
      if (groupEntity._type === Entities.APP_USER_GROUP._type) {
        appUserGroupIds.push(groupEntity.id);
      }
    },
  };
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
      const isAppUserGroup = group.type === 'APP_GROUP';
      if (isAppUserGroup) {
        stats.appUserGroupsCollected++;
      } else {
        stats.userGroupsCollected++;
      }
      if (group._embedded?.stats?.usersCount) {
        if (isAppUserGroup) {
          stats.appUserGroupsCollectedWithUsers++;
        } else {
          stats.userGroupsCollectedWithUsers++;
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

  const groupIds = await context.jobState.getData<string[]>(APP_USER_GROUP_IDS);
  if (!groupIds) {
    throw new Error('No APP_USER_GROUP_IDS found in job state');
  }

  await buildGroupEntityToUserRelationships(
    groupIds,
    Entities.APP_USER_GROUP._type,
    context,
  );
}

export async function buildUserGroupUserRelationships(
  context: IntegrationStepExecutionContext<IntegrationConfig, ExecutionConfig>,
) {
  const groupIds = await context.jobState.getData<string[]>(USER_GROUP_IDS);
  if (!groupIds) {
    throw new Error('No USER_GROUP_IDS found in job state');
  }

  await buildGroupEntityToUserRelationships(
    groupIds,
    Entities.USER_GROUP._type,
    context,
  );

  const { jobState, logger } = context;
  const everyoneGroupKey = await jobState.getData<string>(EVERYONE_GROUP_KEY);
  if (everyoneGroupKey) {
    logger.info('Adding all users to the "Everyone" group');
    await jobState.iterateEntities(
      { _type: Entities.USER._type },
      async (userEntity) => {
        await jobState.addRelationship(
          createGroupUserRelationship(
            everyoneGroupKey,
            userEntity._key as string,
          ),
        );
      },
    );
  }
}

async function buildGroupEntityToUserRelationships(
  groupIds: string[],
  groupEntityType: string,
  context: IntegrationStepExecutionContext<IntegrationConfig, ExecutionConfig>,
) {
  if (!groupIds.length) {
    return;
  }
  const BATCH_SIZE = 500;
  const { instance, logger, jobState, executionConfig } = context;
  const { logMetrics } = executionConfig;

  const apiClient = createAPIClient(instance.config, logger);

  const stats = {
    processedGroups: 0,
    requestedGroups: 0,
    relationshipsCreated: 0,
  };
  const skippedGroups: string[] = [];
  const statsLogger = createStatsLogger(stats, logger, logMetrics);

  const limit = await apiClient.getGroupUsersLimit(groupIds[0]);
  const maxConcurrent = limit ? limit * 0.5 : 20; // 50% of the limit.
  logger.info(
    `[${groupEntityType}] Calculated concurrent requests: ${maxConcurrent}`,
  );
  const groupIdBatches = chunk(groupIds, BATCH_SIZE);

  try {
    await withConcurrentQueue(
      {
        maxConcurrent,
        logger,
        logPrefix: `[${groupEntityType}]`,
        onFailed: (err) => {
          if (err.code === 'ECONNRESET') {
            const groupId = err.groupId as string;
            logger.warn(`ECONNRESET error for group ${err.groupId}. Skipping.`);
            if (typeof groupId === 'string') {
              skippedGroups.push(err.groupId);
            }
            return true; // Ignore the error.
          } else {
            return false;
          }
        },
        logQueueState: logMetrics,
      },
      async (limiter, tasksState, waitForTasksCompletion) => {
        for (const groupIdBatch of groupIdBatches) {
          for (const groupId of groupIdBatch) {
            stats.processedGroups++;
            apiClient.iterateUsersForGroup(
              groupId,
              async (user) => {
                if (!user.id) {
                  return;
                }
                const userKey = user.id;
                if (jobState.hasKey(userKey)) {
                  const relationship = createGroupUserRelationship(
                    groupId,
                    userKey,
                  );
                  if (!jobState.hasKey(relationship._key)) {
                    await jobState.addRelationship(relationship);
                    stats.relationshipsCreated++;
                    statsLogger(`[${groupEntityType}] Added relationships`);
                  }
                } else {
                  logger.warn(
                    { groupId, userId: userKey },
                    '[SKIP] User not found in job state, could not build relationship to group',
                  );
                }
              },
              limiter,
              tasksState,
            );
          }
          await waitForTasksCompletion();

          stats.requestedGroups += groupIdBatch.length;
          logger.info(
            { stats },
            `[${groupEntityType}] Finished requesting groups batch`,
          );
        }
      },
    );
  } catch (err) {
    logger.error({ err }, 'Failed to build group to user relationships');
    throw err;
  }

  if (skippedGroups.length) {
    logger.publishWarnEvent({
      name: IntegrationWarnEventName.IncompleteData,
      description: `Skipped groups due to ECONNRESET error: ${JSON.stringify(skippedGroups)}`,
    });
  }
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
    dependsOn: [
      Steps.USERS,
      Steps.GROUPS,
      // Added so these steps are not executed in parallel.
      // They use the same endpoint, which can cause rate limiting issues.
      Steps.USER_GROUP_USERS_RELATIONSHIP,
    ],
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
