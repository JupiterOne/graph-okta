import { OktaAccountInfo } from '../okta/types';
import { OktaIntegrationConfig } from '../types';
import { IntegrationConfig } from '../config';
import { IntegrationInstance } from '@jupiterone/integration-sdk-core';

const DOMAIN_REGEX = /\/\/([^.]*).okta(preview)?.com/;

export default function getOktaAccountInfo(
  integrationInstance: IntegrationInstance<IntegrationConfig>,
): OktaAccountInfo {
  const config = integrationInstance.config as OktaIntegrationConfig;
  const match = DOMAIN_REGEX.exec(config.oktaOrgUrl);
  if (!match) {
    return {
      name: integrationInstance.name,
      preview: false,
    };
  }

  const preview = match[2] === 'preview';
  const name = match[1];

  return {
    name,
    preview,
  };
}
