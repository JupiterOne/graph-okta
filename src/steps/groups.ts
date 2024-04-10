import {
  Entity,
  IntegrationLogger,
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
  const skippedGroups: string[] = [];
  let everyoneGroupEntity: Entity | undefined;
  const statsLogger = createStatsLogger(stats, logger, logGroupMetrics);

  try {
    await jobState.iterateEntities(
      { _type: groupEntityType },
      async (groupEntity) => {
        stats.processedGroups++;
        statsLogger(`[${groupEntityType}] Processed groups`);

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

        const groupId = groupEntity.id as string;
        try {
          await apiClient.iterateUsersForGroup(groupId, async (user) => {
            if (!user.id) {
              return;
            }
            const userKey = user.id;
            if (jobState.hasKey(userKey)) {
              await jobState.addRelationship(
                createGroupUserRelationship(groupEntity, userKey),
              );
              stats.relationshipsCreated++;
              statsLogger(`[${groupEntityType}] Added relationships`);
            } else {
              logger.warn(
                { groupId: groupEntity.id as string, userId: userKey },
                '[SKIP] User not found in job state, could not build relationship to group',
              );
            }
          });
        } catch (err) {
          if (err.code === 'ECONNRESET') {
            logger.warn(`ECONNRESET error for group ${groupId}. Skipping.`);
            skippedGroups.push(groupId);
          } else {
            throw err;
          }
        } finally {
          stats.requestedGroups++;
        }
      },
    );
  } catch (err) {
    logger.error({ err }, 'Failed to build group to user relationships');
    throw err;
  }

  if (everyoneGroupEntity) {
    logger.info('Adding all users to the "Everyone" group');
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

  if (skippedGroups.length) {
    logger.publishWarnEvent({
      name: IntegrationWarnEventName.IncompleteData,
      description: `Skipped groups due to ECONNRESET error: ${JSON.stringify(skippedGroups)}`,
    });
  }
}

/**
 * Create a function that logs group stats every 5 minutes.
 */
function createStatsLogger(
  stats: any,
  logger: IntegrationLogger,
  logGroupMetrics: boolean | undefined,
) {
  const FIVE_MINUTES = 5 * 60 * 1000;
  let lastLogTime = Date.now();
  return (message: string) => {
    const now = Date.now();
    if (Date.now() - lastLogTime >= FIVE_MINUTES && logGroupMetrics) {
      logger.info({ stats }, message);
      lastLogTime = now;
    }
  };
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
