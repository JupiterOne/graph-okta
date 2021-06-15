import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../config';
import getOktaAccountInfo from '../util/getOktaAccountInfo';
import { createAccountEntity } from '../converters/account';
import {
  createSSOServiceEntity,
  createMFAServiceEntity,
} from '../converters/service';

import {
  DATA_ACCOUNT_ENTITY,
  SERVICE_ENTITY_TYPE,
  SERVICE_ENTITY_CLASS,
} from '../okta/constants';

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
    id: 'fetch-account',
    name: 'Fetch Account Details',
    entities: [
      {
        resourceName: 'Okta Account',
        _type: 'okta_account',
        _class: 'Account',
      },
      {
        resourceName: 'Okta Service',
        _type: SERVICE_ENTITY_TYPE,
        _class: SERVICE_ENTITY_CLASS,
      },
    ],
    relationships: [
      {
        _type: 'okta_account_has_service',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: SERVICE_ENTITY_TYPE,
      },
    ],
    dependsOn: [],
    executionHandler: fetchAccountDetails,
  },
];
