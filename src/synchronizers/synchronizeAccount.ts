import { IntegrationExecutionResult } from "@jupiterone/jupiter-managed-integration-sdk";

import { createHasRelationships } from "../converters";
import {
  ACCOUNT_ENTITY_TYPE,
  createAccountEntity,
} from "../converters/account";
import {
  ACCOUNT_SERVICE_RELATIONSHIP_TYPE,
  createMFAServiceEntity,
  createSSOServiceEntity,
  SERVICE_ENTITY_TYPE,
} from "../converters/service";
import { OktaExecutionContext } from "../types";
import getOktaAccountInfo from "../util/getOktaAccountInfo";

export default async function synchronizeAccount(
  executionContext: OktaExecutionContext,
): Promise<IntegrationExecutionResult> {
  const {
    instance,
    instance: { config },
    graph,
    persister,
  } = executionContext;

  const oktaAccountInfo = getOktaAccountInfo(instance);
  const account = createAccountEntity(config, oktaAccountInfo);
  const ssoService = createSSOServiceEntity(account);
  const mfaService = createMFAServiceEntity(account);

  const [oldAccounts, oldServices] = await Promise.all([
    graph.findEntitiesByType(ACCOUNT_ENTITY_TYPE),
    graph.findEntitiesByType(SERVICE_ENTITY_TYPE),
  ]);

  const oldAccountServiceRelationships = await graph.findRelationshipsByType(
    ACCOUNT_SERVICE_RELATIONSHIP_TYPE,
  );

  const newAccounts = [account];
  const newServices = [ssoService, mfaService];

  const newAccountServiceRelationships = createHasRelationships(
    account,
    [ssoService, mfaService],
    ACCOUNT_SERVICE_RELATIONSHIP_TYPE,
  );

  const operationResults = await persister.publishPersisterOperations([
    [
      ...persister.processEntities(oldAccounts, newAccounts),
      ...persister.processEntities(oldServices, newServices),
    ],
    persister.processRelationships(
      oldAccountServiceRelationships,
      newAccountServiceRelationships,
    ),
  ]);

  return {
    operations: operationResults,
  };
}
