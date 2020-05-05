import fetch from "isomorphic-fetch";

import {
  IntegrationInstanceAuthenticationError,
  IntegrationInstanceConfigError,
  IntegrationValidationContext,
} from "@jupiterone/jupiter-managed-integration-sdk";

import createOktaClient from "./okta/createOktaClient";
import { OktaIntegrationConfig } from "./types";
import isValidOktaOrgUrl from "./util/isValidOktaOrgUrl";

// import createOktaClient from "./okta/createOktaClient";

/**
 * Performs validation of the execution before the execution handler function is
 * invoked.
 *
 * At a minimum, integrations should ensure that the
 * `context.instance.config` is valid. Integrations that require
 * additional information in `context.invocationArgs` should also
 * validate those properties. It is also helpful to perform authentication with
 * the provider to ensure that credentials are valid.
 *
 * The function will be awaited to support connecting to the provider for this
 * purpose.
 *
 * @param context
 */
export default async function invocationValidator(
  context: IntegrationValidationContext,
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

  const response = await fetch(oktaOrgUrl);
  if (response.status === 404) {
    throw new IntegrationInstanceConfigError(
      `Invalid Okta org URL provided (code=404, oktaOrgUrl=${oktaOrgUrl}, accountId=${accountId})`,
    );
  }

  const client = createOktaClient(context.logger, oktaOrgUrl, oktaApiKey);
  const usersCollection = await client.listUsers({ limit: "1" });

  try {
    await usersCollection.each((u) => {
      return false; // stop iteration
    });
  } catch (err) {
    throw new IntegrationInstanceAuthenticationError(err);
  }
}
