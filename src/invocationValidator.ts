import {
  IntegrationExecutionContext,
  IntegrationInstanceConfigError,
  IntegrationInvocationEvent,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { OktaIntegrationConfig } from "./types";
import isValidOktaOrgUrl from "./util/isValidOktaOrgUrl";

/**
 * Performs validation of the execution before the execution handler function is
 * invoked.
 *
 * At a minimum, integrations should ensure that the
 * `executionContext.instance.config` is valid. Integrations that require
 * additional information in `executionContext.invocationArgs` should also
 * validate those properties. It is also helpful to perform authentication with
 * the provider to ensure that credentials are valid.
 *
 * The function will be awaited to support connecting to the provider for this
 * purpose.
 *
 * @param executionContext
 */
export default async function invocationValidator(
  executionContext: IntegrationExecutionContext<IntegrationInvocationEvent>,
) {
  const { accountId, config } = executionContext.instance;
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
