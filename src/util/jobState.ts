import {
  Entity,
  GraphObjectFilter,
  GraphObjectIteratee,
  IntegrationError,
  IntegrationStepExecutionContext,
  JobState,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';
import { DATA_USER_ENTITIES_MAP } from '../steps/constants';

interface IterateEntitiesWithBufferParams {
  context: IntegrationStepExecutionContext<IntegrationConfig>;
  batchSize: number;
  filter: GraphObjectFilter;
  iteratee: GraphObjectIteratee<Entity[]>;
}

async function batchIterateEntities({
  context: { jobState },
  batchSize,
  filter,
  iteratee,
}: IterateEntitiesWithBufferParams) {
  let entitiesBuffer: Entity[] = [];

  async function processBufferedEntities() {
    if (entitiesBuffer.length) await iteratee(entitiesBuffer);
    entitiesBuffer = [];
  }

  await jobState.iterateEntities(filter, async (e) => {
    entitiesBuffer.push(e);

    if (entitiesBuffer.length >= batchSize) {
      await processBufferedEntities();
    }
  });

  await processBufferedEntities();
}

async function getUserIdToUserEntityMap(jobState: JobState) {
  const userIdToUserEntityMap = await jobState.getData<Map<string, Entity>>(
    DATA_USER_ENTITIES_MAP,
  );

  if (!userIdToUserEntityMap) {
    throw new IntegrationError({
      message: 'Missing required user data in job state',
      code: 'MISSING_JOB_STATE_DATA',
      fatal: true,
    });
  }

  return userIdToUserEntityMap;
}

export { batchIterateEntities, getUserIdToUserEntityMap };
