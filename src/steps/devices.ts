import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
} from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';

import { APIClient, createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createUserMfaDeviceRelationship } from '../converters';
import { createMFADeviceEntity } from '../converters/device';
import { OktaFactor } from '../okta/types';
import { StandardizedOktaUser } from '../types';
import { getUserIdToUserEntityMap } from '../util/jobState';
import { Entities, Relationships, Steps } from './constants';

export async function fetchDevices(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { jobState, instance, logger } = context;
  const apiClient = createAPIClient(instance.config, logger);

  const devicesForUserEntities = await collectDevicesForUserEntities(
    apiClient,
    await getActiveOktaUserEntities(jobState),
  );

  for (const { userEntity, devices } of devicesForUserEntities) {
    for (const device of devices) {
      await createOktaUserFactorGraph(
        jobState,
        userEntity as StandardizedOktaUser,
        device,
      );
    }
  }
}

async function getActiveOktaUserEntities(
  jobState: JobState,
): Promise<Entity[]> {
  const userIdToUserEntityMap = await getUserIdToUserEntityMap(jobState);
  const activeOktaUserEntities: Entity[] = [];

  for (const [_, userEntity] of userIdToUserEntityMap) {
    if (!isOktaUserEntityDeprovisioned(userEntity)) {
      activeOktaUserEntities.push(userEntity);
    }
  }

  return activeOktaUserEntities;
}

async function createOktaUserFactorGraph(
  jobState: JobState,
  userEntity: StandardizedOktaUser,
  device: OktaFactor,
) {
  const deviceEntity = createMFADeviceEntity(device);
  await jobState.addEntity(deviceEntity);

  if (device.status === 'ACTIVE') {
    // TODO (austinkelleher): This looks like a bug...The Okta user has already
    // been submitted, so this update won't do anything.
    userEntity.mfaEnabled = true;
  }

  await jobState.addRelationship(
    createUserMfaDeviceRelationship(userEntity, deviceEntity),
  );
}

async function collectDevicesForUserEntities(
  apiClient: APIClient,
  userEntities: Entity[],
) {
  return await pMap(
    userEntities,
    async (userEntity) => {
      const userId = userEntity._key;
      const devices: OktaFactor[] = [];

      await apiClient.iterateDevicesForUser(userId, async (device) => {
        devices.push(device);
        return Promise.resolve();
      });

      return { userEntity, devices };
    },
    {
      concurrency: 10,
    },
  );
}

function isOktaUserEntityDeprovisioned(userEntity: Entity) {
  return userEntity.status === 'deprovisioned';
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
