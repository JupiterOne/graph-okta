import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { MFA_DEVICE_ENTITY_TYPE } from '../okta/constants';

export const USER_GROUP_ENTITY_TYPE = 'okta_user_group';
export const APP_USER_GROUP_ENTITY_TYPE = 'okta_app_user_group';

export async function fetchFactors({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  await jobState.iterateEntities(
    {
      _type: 'okta_user',
    },
    async (userEntity) => {
      if (userEntity.status !== 'DEPROVISIONED') {
        //asking for factors for DEPROV users throws error
        await apiClient.iterateFactorsForUser(
          userEntity._key,
          async (factor) => {
            const factorEntity = await jobState.addEntity(
              createIntegrationEntity({
                entityData: {
                  source: factor,
                  assign: {
                    _key: factor.id,
                    _type: MFA_DEVICE_ENTITY_TYPE,
                    _class: ['Key', 'AccessKey'],
                    displayName: `${factor.provider} ${factor.factorType}`,
                    id: factor.id,
                    factorType: factor.factorType,
                    provider: factor.provider,
                    vendorName: factor.vendorName,
                    device: factor.device,
                    deviceType: factor.deviceType,
                    status: factor.status,
                    created: factor.created,
                    lastUpdated: factor.lastUpdated,
                    active: factor.status === 'ACTIVE',
                  },
                },
              }),
            );

            await jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.ASSIGNED,
                from: userEntity,
                to: factorEntity,
              }),
            );
          },
        );
      }
    },
  );
}

export const factorSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-factors',
    name: 'Fetch Factors',
    entities: [
      {
        resourceName: 'Okta Factor Device',
        _type: MFA_DEVICE_ENTITY_TYPE,
        _class: 'Key',
      },
    ],
    relationships: [
      {
        _type: 'okta_user_assigned_mfa_device',
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_user',
        targetType: MFA_DEVICE_ENTITY_TYPE,
      },
    ],
    dependsOn: ['fetch-users'],
    executionHandler: fetchFactors,
  },
];
