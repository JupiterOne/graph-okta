import {
  IntegrationExecutionContext,
  IntegrationInstanceConfigError,
  IntegrationInvocationEvent,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { OktaIntegrationConfig } from "./types";
import isValidOktaOrgUrl from "./util/isValidOktaOrgUrl";

export default async function invocationValidator(
  context: IntegrationExecutionContext<IntegrationInvocationEvent>,
) {
  const { accountId, config } = context.instance;
  const oktaInstanceConfig = config as OktaIntegrationConfig;

  if (!oktaInstanceConfig) {
    throw new IntegrationInstanceConfigError(
      `Okta configuration not found (accountId=${accountId})`,
    );
  }

  const { oktaOrgUrl, oktaApiKey } = config;

  if (!oktaOrgUrl || !isValidOktaOrgUrl(oktaOrgUrl)) {
    throw new IntegrationInstanceConfigError(
      `Invalid Okta org URL provided (oktaOrgUrl=${oktaOrgUrl}, accountId=${accountId})`,
    );
  }

  if (!oktaApiKey) {
    throw new IntegrationInstanceConfigError(
      `Missing oktaApiKey in configuration (accountId=${accountId})`,
    );
  }
}
