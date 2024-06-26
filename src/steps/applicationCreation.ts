import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { Entities, Relationships, Steps } from './constants';

export async function buildUserCreatedApplication({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  try {
    await apiClient.iterateAppCreatedLogs(async (log) => {
      if (!log.actor?.id || !(log.target?.length && log.target[0].id)) {
        return;
      }

      const createdBy = log.actor.id;
      const createdApp = log.target[0].id;

      // Logs will contain all apps in the last 90 days, even if we've deleted them, so check before
      // trying to create the relationship.
      if (jobState.hasKey(createdBy) && jobState.hasKey(createdApp)) {
        const createdByRelationship = createDirectRelationship({
          _class: RelationshipClass.CREATED,
          fromType: Entities.USER._type,
          fromKey: createdBy,
          toType: Entities.APPLICATION._type,
          toKey: createdApp,
        });
        if (!jobState.hasKey(createdByRelationship._key)) {
          await jobState.addRelationship(createdByRelationship);
        } else {
          logger.info(
            { createdByRelationship },
            'Skipping relationship creation. Relationship already exists.',
          );
        }
      }
    });
  } catch (err) {
    if (err.status === 403) {
      logger.publishWarnEvent({
        name: IntegrationWarnEventName.MissingPermission,
        description: 'The API key does not have access to fetch system logs.',
      });
      return;
    }
    throw err;
  }
}

export const applicationCreationSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.APPLICATION_CREATION,
    name: 'Build User Created Application Relationship',
    entities: [],
    relationships: [Relationships.USER_CREATED_APPLICATION],
    dependsOn: [Steps.APPLICATIONS, Steps.USERS],
    executionHandler: buildUserCreatedApplication,
  },
];
