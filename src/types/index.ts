export * from './entities';

export interface OktaIntegrationConfig {
  oktaApiKey: string;
  oktaOrgUrl: string;
  rateLimitThreshold?: number;
}
