import {
  GraphClient,
  IntegrationExecutionContext,
  PersisterClient,
} from "@jupiterone/jupiter-managed-integration-sdk";

export * from "./entities";
export * from "./relationships";

import { OktaClient } from "../okta/types";

export interface OktaIntegrationConfig {
  oktaApiKey: string;
  oktaOrgUrl: string;
}

export interface OktaExecutionContext extends IntegrationExecutionContext {
  okta: OktaClient;
  graph: GraphClient;
  persister: PersisterClient;
}
