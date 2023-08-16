import { IntegrationConfig } from '../config';

export default function mutateIntegrationConfig(
  integrationConfig: IntegrationConfig,
): IntegrationConfig {
  integrationConfig.oktaOrgUrl = !integrationConfig.oktaOrgUrl.startsWith(
    'https://',
  )
    ? `https://${integrationConfig.oktaOrgUrl}`
    : integrationConfig.oktaOrgUrl;

  return integrationConfig;
}
