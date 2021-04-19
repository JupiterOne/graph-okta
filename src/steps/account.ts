import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../config';
import getOktaAccountInfo from '../util/getOktaAccountInfo';

export const DATA_ACCOUNT_ENTITY = 'DATA_ACCOUNT_ENTITY';
export const SERVICE_ENTITY_TYPE = 'okta_service';
export const SERVICE_ENTITY_CLASS = ['Service', 'Control'];

export async function fetchAccountDetails({
  jobState,
  instance,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const oktaAccountInfo = getOktaAccountInfo({
    name: instance.name,
    config: instance.config,
  });
  let displayName = oktaAccountInfo.name;
  if (oktaAccountInfo.preview) {
    displayName += ' (preview)';
  }
  const accountId = instance.config.oktaOrgUrl.replace(/^https?:\/\//, '');
  const accountEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: {
          id: `okta-account:${instance.name}`,
          name: 'Okta Account',
        },
        assign: {
          _key: `okta_account_${accountId}`,
          _type: 'okta_account',
          _class: 'Account',
          name: oktaAccountInfo.name,
          displayName: displayName,
          webLink: instance.config.oktaOrgUrl,
          accountId,
        },
      },
    }),
  );

  await jobState.setData(DATA_ACCOUNT_ENTITY, accountEntity);

  const ssoServiceEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: {},
        assign: {
          _type: SERVICE_ENTITY_TYPE,
          _key: `okta:sso:${oktaAccountInfo.name}`,
          _class: SERVICE_ENTITY_CLASS,
          name: 'SSO',
          displayName: 'Okta SSO',
          category: ['security'],
          function: 'SSO',
          controlDomain: 'identity-access',
        },
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
        assign: {
          _type: SERVICE_ENTITY_TYPE,
          _key: `okta:mfa:${oktaAccountInfo.name}`,
          _class: SERVICE_ENTITY_CLASS,
          name: 'MFA',
          displayName: 'Okta MFA',
          category: ['security'],
          function: 'MFA',
          controlDomain: 'identity-access',
        },
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
