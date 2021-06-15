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
import { DATA_ACCOUNT_ENTITY } from '../okta/constants';
import getOktaAccountInfo from '../util/getOktaAccountInfo';
import { Entities, Relationships, Steps } from './constants';

export async function fetchAccountDetails({
  jobState,
  instance,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const oktaAccountInfo = getOktaAccountInfo({
    name: instance.name,
    config: instance.config,
  });

  const accountProperties = createAccountEntity(
    instance.config,
    oktaAccountInfo,
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
