import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';
import { integrationSteps } from './steps';
import {
  validateInvocation,
  IntegrationConfig,
  instanceConfigFields,
  ingestionConfig,
} from './config';

export const invocationConfig: IntegrationInvocationConfig<IntegrationConfig> =
  {
    instanceConfigFields,
    validateInvocation,
    integrationSteps,
    ingestionConfig,
  };
