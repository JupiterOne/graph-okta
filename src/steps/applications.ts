import {
  Entity,
  IntegrationLogger,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  Relationship,
} from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';

import { APIClient, createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  createAccountApplicationRelationship,
  createApplicationEntity,
  createApplicationGroupRelationships,
  createApplicationUserRelationships,
} from '../converters';
import { OktaApplicationGroup, OktaApplicationUser } from '../okta/types';
import { StandardizedOktaAccount, StandardizedOktaApplication } from '../types';
import { batchIterateEntities } from '../util/jobState';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  Relationships,
  Steps,
} from './constants';

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
  });
}

export async function buildGroupApplicationRelationships(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { jobState, instance, logger } = context;
  const apiClient = createAPIClient(instance.config, logger);

  await batchIterateEntities({
    context,
    batchSize: 1000,
    filter: { _type: Entities.APPLICATION._type },
    async iteratee(appEntities) {
      const groupsForAppEntities = await collectGroupsForAppEntities(
        apiClient,
        appEntities,
      );

      for (const { appEntity, groups } of groupsForAppEntities) {
        for (const group of groups) {
          await createGroupApplicationRelationships({
            appEntity: appEntity as StandardizedOktaApplication,
            group,
            jobState,
            logger,
          });
        }
      }
    },
  });
}

export async function buildUserApplicationRelationships(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { jobState, instance, logger } = context;
  const apiClient = createAPIClient(instance.config, logger);

  await batchIterateEntities({
    context,
    batchSize: 1000,
    filter: { _type: Entities.APPLICATION._type },
    async iteratee(appEntities) {
      const usersForAppEntities = await collectUsersForAppEntities(
        apiClient,
        appEntities,
      );

      for (const { appEntity, users } of usersForAppEntities) {
        for (const user of users) {
          await createUserApplicationRelationships({
            appEntity: appEntity as StandardizedOktaApplication,
            user,
            jobState,
            logger,
          });
        }
      }
    },
  });
}

async function createGroupApplicationRelationships({
  appEntity,
  group,
  jobState,
  logger,
}: {
  appEntity: StandardizedOktaApplication;
  group: OktaApplicationGroup;
  logger: IntegrationLogger;
  jobState: JobState;
}) {
  const appId = appEntity.id as string;
  const appName = appEntity.name as string;

  const groupEntity = await jobState.findEntity(group.id);

  if (groupEntity) {
    await jobState.addRelationships(
      createApplicationGroupRelationships(appEntity, group),
    );
  } else {
    logger.warn(
      { appId, appName, groupId: group.id },
      '[SKIP] Group not found in job state, could not build relationship to application',
    );
  }
}

async function createUserApplicationRelationships({
  appEntity,
  user,
  jobState,
  logger,
}: {
  appEntity: StandardizedOktaApplication;
  user: OktaApplicationUser;
  logger: IntegrationLogger;
  jobState: JobState;
}) {
  const appId = appEntity.id as string;
  const appName = appEntity.name as string;

  const userEntity = await jobState.findEntity(user.id);

  if (userEntity) {
    const relationships: Relationship[] = createApplicationUserRelationships(
      appEntity,
      user,
    );

    // These relationships include both USER_ASSIGNED_APPLICATION and USER_ASSIGNED_AWS_IAM_ROLE
    // USER_ASSIGNED_APPLICATION will be unique to this user and app pair
    // however, multiple apps for that user can use AWS and have the same IAM Role assigned
    // therefore, the USER_ASSIGNED_AWS_IAM_ROLE relationship may have been specified in a previous app for this user
    for (const rel of relationships) {
      if (!jobState.hasKey(rel._key)) {
        await jobState.addRelationship(rel);
      }
    }
  } else {
    logger.warn(
      { appId: appId, appName, userId: user.id },
      '[SKIP] User not found in job state, could not build relationship to application',
    );
  }
}

async function collectGroupsForAppEntities(
  apiClient: APIClient,
  appEntities: Entity[],
) {
  return await pMap(
    appEntities,
    async (appEntity) => {
      const appId = appEntity.id as string;
      const groups: OktaApplicationGroup[] = [];

      await apiClient.iterateGroupsForApp(appId, async (group) => {
        groups.push(group);
        return Promise.resolve();
      });

      return { appEntity, groups };
    },
    {
      concurrency: 10,
    },
  );
}

async function collectUsersForAppEntities(
  apiClient: APIClient,
  appEntities: Entity[],
) {
  return await pMap(
    appEntities,
    async (appEntity) => {
      const appId = appEntity.id as string;
      const users: OktaApplicationUser[] = [];

      await apiClient.iterateUsersForApp(appId, async (user) => {
        users.push(user);
        return Promise.resolve();
      });

      return { appEntity, users };
    },
    {
      concurrency: 10,
    },
  );
}

export const applicationSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.APPLICATIONS,
    name: 'Fetch Applications',
    entities: [Entities.APPLICATION],
    relationships: [Relationships.ACCOUNT_HAS_APPLICATION],
    dependsOn: [Steps.GROUPS],
    executionHandler: fetchApplications,
  },
  {
    id: Steps.BUILD_GROUP_APPLICATION_RELATIONSHIPS,
    name: 'Build group application relationships',
    entities: [],
    relationships: [
      Relationships.GROUP_ASSIGNED_APPLICATION,
      Relationships.USER_GROUP_ASSIGNED_AWS_IAM_ROLE,
    ],
    dependsOn: [Steps.APPLICATIONS, Steps.GROUPS],
    executionHandler: buildGroupApplicationRelationships,
  },
  {
    id: Steps.BUILD_USER_APPLICATION_RELATIONSHIPS,
    name: 'Build user application relationships',
    entities: [],
    relationships: [
      Relationships.USER_ASSIGNED_APPLICATION,
      Relationships.USER_ASSIGNED_AWS_IAM_ROLE,
    ],
    dependsOn: [Steps.APPLICATIONS, Steps.USERS],
    executionHandler: buildUserApplicationRelationships,
  },
];
