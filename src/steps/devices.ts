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
import { createMFADeviceEntity } from '../converters/device';

export async function fetchDevices({
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
        await apiClient.iterateDevicesForUser(
          userEntity._key,
          async (device) => {
            const deviceEntity = await jobState.addEntity(
              createIntegrationEntity({
                entityData: {
                  source: device,
                  assign: createMFADeviceEntity(device),
                },
              }),
            );

            await jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.ASSIGNED,
                from: userEntity,
                to: deviceEntity,
              }),
            );
          },
        );
      }
    },
  );
}

export const deviceSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-devices',
    name: 'Fetch Devices',
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
    executionHandler: fetchDevices,
  },
];
