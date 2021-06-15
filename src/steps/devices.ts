import {
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createUserMfaDeviceRelationship } from '../converters';
import { createMFADeviceEntity } from '../converters/device';
import { StandardizedOktaUser } from '../types';
import { Entities, Relationships, Steps } from './constants';

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
    id: Steps.MFA_DEVICES,
    name: 'Fetch Devices',
    entities: [Entities.MFA_DEVICE],
    relationships: [Relationships.USER_ASSIGNED_MFA_DEVICE],
    dependsOn: [Steps.USERS],
    executionHandler: fetchDevices,
  },
];
