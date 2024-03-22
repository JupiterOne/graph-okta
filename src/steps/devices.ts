import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createDeviceEntity } from '../converters/device';
import { accountFlagged } from '../okta/createOktaClient';
import { StepAnnouncer } from '../util/runningTimer';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  IngestionSources,
  Relationships,
  Steps,
} from './constants';

export async function fetchDevices({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  let stepAnnouncer;
  if (accountFlagged) {
    stepAnnouncer = new StepAnnouncer(Steps.DEVICES, 10, logger);
  }

  const apiClient = createAPIClient(instance.config, logger);
  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  try {
    await apiClient.iterateDevices(async (device) => {
      const deviceEntity = createDeviceEntity(device);
      if (!deviceEntity) {
        return;
      }
      await jobState.addEntity(deviceEntity);
      for (const user of device._embedded?.users ?? []) {
        const userKey = user.user?.id;
        if (userKey && jobState.hasKey(userKey)) {
          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.HAS,
              fromType: Entities.USER._type,
              fromKey: userKey,
              toType: Entities.DEVICE._type,
              toKey: deviceEntity._key,
            }),
          );
        }
      }

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: deviceEntity,
        }),
      );
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch devices');
  }

  if (accountFlagged) {
    stepAnnouncer.finish();
  }
}

export const deviceSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.DEVICES,
    name: 'Fetch Devices',
    entities: [Entities.DEVICE],
    relationships: [
      Relationships.ACCOUNT_HAS_DEVICE,
      Relationships.USER_HAS_DEVICE,
    ],
    dependsOn: [Steps.USERS],
    ingestionSourceId: IngestionSources.DEVICES,
    executionHandler: fetchDevices,
  },
];
