import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { Relationships, Steps } from './constants';

export async function buildUserCreatedApplication({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  await apiClient.iterateAppCreatedLogs(async (log) => {
    const createdBy = await jobState.findEntity(log.actor?.id);
    const createdApp = await jobState.findEntity(log.target?.[0].id);

    // Logs will contain all apps in the last 90 days, even if we've deleted them, so check before
    // trying to create the relationship.
    if (createdBy && createdApp) {
      const createdByRelationship = createDirectRelationship({
        _class: RelationshipClass.CREATED,
        from: createdBy,
        to: createdApp,
      });
      if (!jobState.hasKey(createdByRelationship._key)) {
        await jobState.addRelationship(createdByRelationship);
      } else {
        logger.info(
          { createdByRelationship },
          'Skipping relationship creation.  Relationship already exists.',
        );
      }
    }
  });
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
