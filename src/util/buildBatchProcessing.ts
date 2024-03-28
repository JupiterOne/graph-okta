import { Entity } from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';

export function buildBatchProcessing<T extends Entity = Entity>(options: {
  processCallback: (entity: T) => Promise<void>;
  batchSize: number;
  concurrency: number;
}) {
  let entitiesBatch: T[] = [];
  const withBatchProcessing = async (entity: T) => {
    if (entitiesBatch.length < options.batchSize) {
      entitiesBatch.push(entity);
      return;
    }
    entitiesBatch.push(entity);
    await pMap(entitiesBatch, options.processCallback, {
      concurrency: options.concurrency,
    });
    entitiesBatch = [];
  };

  const flushBatch = async () => {
    if (entitiesBatch.length) {
      await pMap(entitiesBatch, options.processCallback, {
        concurrency: options.concurrency,
      });
    }
  };

  return { withBatchProcessing, flushBatch };
}
