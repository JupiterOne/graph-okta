import {
  Entity,
  GraphObjectFilter,
  GraphObjectIteratee,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';

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

export { batchIterateEntities };
