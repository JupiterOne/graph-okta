import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { v4 as uuid } from 'uuid';

interface TimeOperationInput<T extends () => any> {
  logger: IntegrationLogger;
  operationName: string;
  operation: T;
}

export async function timeOperation<T extends () => any>({
  logger,
  operationName,
  operation,
}: TimeOperationInput<T>): Promise<ReturnType<T>> {
  const startTime = Date.now();
  const operationId = uuid();

  logger.info(
    {
      operationId,
      startTime,
      operationName,
    },
    'Starting timed operation',
  );

  return await Promise.resolve(operation()).finally(() => {
    const duration = Date.now() - startTime;
    logger.info(
      { operationId, duration, operationName },
      'Timed operation complete',
    );
  });
}
