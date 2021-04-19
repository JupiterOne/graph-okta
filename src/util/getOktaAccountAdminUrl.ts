import { OktaIntegrationConfig } from '../types';

export default function getOktaAccountAdminUrl(
  config: OktaIntegrationConfig,
): string {
  return config.oktaOrgUrl.replace('.', '-admin.');
}
