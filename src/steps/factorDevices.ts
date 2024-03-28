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
import { buildBatchProcessing } from '../util/buildBatchProcessing';

export async function fetchFactorDevices({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  const processUserDevices = async (userEntity: StandardizedOktaUser) => {
    if (userEntity.status === 'deprovisioned') {
      //asking for factors for DEPROV users throws error
      return;
    }
    await apiClient.iterateFactorDevicesForUser(
      userEntity.id,
      async (device) => {
        const deviceEntity = createMFADeviceEntity(device);
        if (!deviceEntity) {
          return;
        }
        await jobState.addEntity(deviceEntity);
        if (device.status === 'ACTIVE') {
          // TODO: this is not updating the user entity, find a way to update it before sending the entity to persister.
          userEntity.mfaEnabled = true;
        }
        await jobState.addRelationship(
          createUserMfaDeviceRelationship(userEntity, deviceEntity),
        );
      },
    );
  };

  const { withBatchProcessing, flushBatch } =
    buildBatchProcessing<StandardizedOktaUser>({
      processCallback: processUserDevices,
      batchSize: 200,
      concurrency: 4,
    });
  try {
    await jobState.iterateEntities(
      { _type: Entities.USER._type },
      async (entity: StandardizedOktaUser) => {
        await withBatchProcessing(entity);
      },
    );

    await flushBatch();
  } catch (err) {
    logger.error({ err }, 'Failed to fetch MFA devices');
    throw err;
  }
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
