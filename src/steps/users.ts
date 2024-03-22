import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createUserEntity } from '../converters/user';
import { accountFlagged } from '../okta/createOktaClient';
import { StepAnnouncer } from '../util/runningTimer';
import {
  DATA_ACCOUNT_ENTITY,
  DATA_USER_ENTITIES_MAP,
  Entities,
  Relationships,
  Steps,
} from './constants';

export async function fetchUsers({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  let stepAnnouncer;
  if (accountFlagged) {
    stepAnnouncer = new StepAnnouncer(Steps.USERS, 10, logger);
  }

  const apiClient = createAPIClient(instance.config, logger);
  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  const userIdToUserEntityMap = new Map<string, Entity>();

  try {
    await apiClient.iterateUsers(async (user) => {
      const userEntity = createUserEntity(instance.config, user);
      if (!userEntity) {
        return;
      }

      await jobState.addEntity(userEntity);
      userIdToUserEntityMap.set(user.id as string, userEntity);

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: userEntity,
        }),
      );
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch users');

    if (stepAnnouncer) {
      stepAnnouncer.finish();
    }
    throw err;
  }

  await jobState.setData(DATA_USER_ENTITIES_MAP, userIdToUserEntityMap);

  if (stepAnnouncer) {
    stepAnnouncer.finish();
  }
}

export const userSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.USERS,
    name: 'Fetch Users',
    entities: [Entities.USER],
    relationships: [Relationships.ACCOUNT_HAS_USER],
    dependsOn: [Steps.ACCOUNT],
    executionHandler: fetchUsers,
  },
];
