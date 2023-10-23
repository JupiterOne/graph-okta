import {
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createUserMfaDeviceRelationship } from '../converters';
import { createMFADeviceEntity } from '../converters/factorDevice';
import { StandardizedOktaUser } from '../types';
import { Entities, IngestionSources, Relationships, Steps } from './constants';

export async function fetchFactorDevices({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  await jobState.iterateEntities(
    {
      _type: Entities.USER._type,
    },
    async (userEntity: StandardizedOktaUser) => {
      if (userEntity.status !== 'deprovisioned') {
        //asking for factors for DEPROV users throws error
        await apiClient.iterateFactorDevicesForUser(
          userEntity.id,
          async (device) => {
            const deviceEntity = createMFADeviceEntity(device);
            if (!deviceEntity) {
              return;
            }
            await jobState.addEntity(deviceEntity);
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

export const factorDeviceSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.MFA_DEVICES,
    ingestionSourceId: IngestionSources.MFA_DEVICES,
    name: 'Fetch MFA Devices',
    entities: [Entities.MFA_DEVICE],
    relationships: [Relationships.USER_ASSIGNED_MFA_DEVICE],
    dependsOn: [Steps.USERS],
    executionHandler: fetchFactorDevices,
  },
];
