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
  const apiClient = createAPIClient(instance.config, logger);
  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  const userIdToUserEntityMap = new Map<string, Entity>();

  await apiClient.iterateUsers(async (user) => {
    const userEntity = await jobState.addEntity(
      createUserEntity(instance.config, user),
    );

    userIdToUserEntityMap.set(user.id, userEntity);

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: userEntity,
      }),
    );
  });

  await jobState.setData(DATA_USER_ENTITIES_MAP, userIdToUserEntityMap);
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
