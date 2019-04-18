/* tslint:disable:no-console */
import { executeIntegrationLocal } from "@jupiterone/jupiter-managed-integration-sdk";

import invocationConfig from "../src/index";

async function run(): Promise<void> {
  const integrationConfig = {
    oktaApiKey: process.env.OKTA_LOCAL_EXECUTION_API_KEY,
    oktaOrgUrl: process.env.OKTA_LOCAL_EXECUTION_ORG_URL,
  };
  await executeIntegrationLocal(integrationConfig, invocationConfig, {});
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
