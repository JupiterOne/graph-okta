import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../config';
import { createAccountEntity } from '../converters/account';
import {
  createMFAServiceEntity,
  createSSOServiceEntity,
} from '../converters/service';
import getOktaAccountInfo from '../util/getOktaAccountInfo';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  Relationships,
  Steps,
} from './constants';
import { createAPIClient } from '../client';

export async function fetchAccountDetails({
  jobState,
  instance,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const oktaAccountInfo = getOktaAccountInfo({
    name: instance.name,
    config: instance.config,
  });

  const oktaSupportInfo = await apiClient.getSupportInfo();

  const accountProperties = createAccountEntity(
    instance.config,
    oktaAccountInfo,
    oktaSupportInfo,
  );

  const accountEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: oktaAccountInfo,
        assign: accountProperties,
      },
    }),
  );

  await jobState.setData(DATA_ACCOUNT_ENTITY, accountEntity);

  const ssoServiceEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: {},
        assign: createSSOServiceEntity(accountProperties),
      },
    }),
  );

  await jobState.addRelationship(
    createDirectRelationship({
      _class: RelationshipClass.HAS,
      from: accountEntity,
      to: ssoServiceEntity,
    }),
  );

  const mfaServiceEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: {},
        assign: createMFAServiceEntity(accountProperties),
      },
    }),
  );

  await jobState.addRelationship(
    createDirectRelationship({
      _class: RelationshipClass.HAS,
      from: accountEntity,
      to: mfaServiceEntity,
    }),
  );
}

export const accountSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.ACCOUNT,
    name: 'Fetch Account Details',
    entities: [Entities.ACCOUNT, Entities.SERVICE],
    relationships: [Relationships.ACCOUNT_HAS_SERVICE],
    dependsOn: [],
    executionHandler: fetchAccountDetails,
  },
];
