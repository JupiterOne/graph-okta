import {
  IntegrationExecutionContext,
  IntegrationValidationError,
  IntegrationInstanceConfigFieldMap,
  IntegrationInstanceConfig,
  IntegrationIngestionConfigFieldMap,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from './client';
import isValidOktaOrgUrl from './util/isValidOktaOrgUrl';
import { IngestionSources } from './steps/constants';
import mutateIntegrationConfig from './util/mutateIntegrationConfig';

/**
 * A type describing the configuration fields required to execute the
 * integration for a specific account in the data provider.
 *
 * When executing the integration in a development environment, these values may
 * be provided in a `.env` file with environment variables. For example:
 *
 * - `CLIENT_ID=123` becomes `instance.config.clientId = '123'`
 * - `CLIENT_SECRET=abc` becomes `instance.config.clientSecret = 'abc'`
 *
 * Environment variables are NOT used when the integration is executing in a
 * managed environment. For example, in JupiterOne, users configure
 * `instance.config` in a UI.
 */
export const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  oktaOrgUrl: {
    type: 'string',
  },
  oktaApiKey: {
    type: 'string',
    mask: true,
  },
};

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The provider API org url used to authenticate requests. Example: https://yoursubdomain.okta.com/
   */
  oktaOrgUrl: string;

  /**
   * The provider API client secret used to authenticate requests.
   */
  oktaApiKey: string;
}

export async function validateInvocation(
  context: IntegrationExecutionContext<IntegrationConfig>,
) {
  const { config } = context.instance;

  if (!config.oktaOrgUrl || !config.oktaApiKey) {
    throw new IntegrationValidationError(
      'Config requires all of {oktaOrgUrl, oktaApiKey}',
    );
  }

  context.instance.config = mutateIntegrationConfig(config);

  if (!config.oktaOrgUrl || !isValidOktaOrgUrl(config.oktaOrgUrl)) {
    throw new IntegrationValidationError(
      `Invalid Okta org URL provided (oktaOrgUrl=${config.oktaOrgUrl}, accountId=${config.accountId})`,
    );
  }

  const apiClient = createAPIClient(config, context.logger);
  await apiClient.verifyAuthentication();
}

export const ingestionConfig: IntegrationIngestionConfigFieldMap = {
  [IngestionSources.APPLICATIONS]: {
    title: 'Okta Apps',
    description: 'Applications added to an organization',
  },
  [IngestionSources.GROUPS]: {
    title: 'Okta User Groups',
    description: 'Users added to Okta groups',
  },
  [IngestionSources.MFA_DEVICES]: {
    title: 'Okta MFA Devices',
    description: 'Okta multi-factor authentication devices assigned to users',
  },
  [IngestionSources.ROLES]: {
    title: 'Okta User Roles',
    description: 'Okta roles used to manage and control user access',
  },
  [IngestionSources.RULES]: {
    title: 'Okta Group Rules',
    description: 'Rules used to automate the assignment of users to groups',
  },
};
