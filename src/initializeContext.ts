import createOktaClient from "./okta/createOktaClient";

import { IntegrationExecutionContext } from "@jupiterone/jupiter-managed-integration-sdk";

import {
  OktaExecutionContext,
  OktaIntegrationConfig,
  StandardizedOktaApplication,
  StandardizedOktaUser,
} from "./types";

export default async function initializeContext(
  context: IntegrationExecutionContext,
): Promise<OktaExecutionContext> {
  const { oktaOrgUrl, oktaApiKey } = context.instance
    .config as OktaIntegrationConfig;

  const logger = context.logger.child({
    serializers: {
      application: (application: StandardizedOktaApplication) => {
        return {
          _key: application._key,
          _type: application._type,
          _class: application._class,
        };
      },
      user: (user: StandardizedOktaUser) => {
        return {
          _key: user._key,
          _type: user._type,
          _class: user._class,
        };
      },
    },
  });

  return {
    ...context,
    ...context.clients.getClients(),
    logger,
    okta: createOktaClient(logger, oktaOrgUrl, oktaApiKey),
  };
}
