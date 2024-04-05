/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { OktaIntegrationConfig } from '../types';
import { APIClient } from '../client';

let client: APIClient | undefined;

export default function createOktaClient(
  logger: IntegrationLogger,
  config: OktaIntegrationConfig,
) {
  if (!client) {
    client = new APIClient(config, logger);
  }
  return client;
}
