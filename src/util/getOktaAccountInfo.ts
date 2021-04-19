import { OktaAccountInfo } from '../okta/types';
import { OktaIntegrationConfig } from '../types';

const DOMAIN_REGEX = /\/\/([^.]*).okta(preview)?.com/;

export default function getOktaAccountInfo(integrationInstance: {
  name: string;
  config?: object;
}): OktaAccountInfo {
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
