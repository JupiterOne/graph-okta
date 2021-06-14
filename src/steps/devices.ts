import {
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createUserMfaDeviceRelationship } from '../converters';
import { createMFADeviceEntity } from '../converters/device';
import { MFA_DEVICE_ENTITY_TYPE } from '../okta/constants';
import { StandardizedOktaUser } from '../types';

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
    async (userEntity: StandardizedOktaUser) => {
      if (userEntity.status !== 'DEPROVISIONED') {
        //asking for factors for DEPROV users throws error
        await apiClient.iterateDevicesForUser(
          userEntity._key,
          async (device) => {
            const deviceEntity = createMFADeviceEntity(device);
            await jobState.addEntity(createMFADeviceEntity(device));

            if (device.status === 'ACTIVE') {
              userEntity.mfaEnabled = true;
            }

            await jobState.addRelationship(
              createUserMfaDeviceRelationship(userEntity, deviceEntity),
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
