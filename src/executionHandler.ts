import {
  IntegrationExecutionContext,
  IntegrationExecutionResult,
  IntegrationInvocationEvent,
} from "@jupiterone/jupiter-managed-integration-sdk";
import initializeContext from "./initializeContext";
import processUsers from "./processUsers";

export default async function executionHandler(
  context: IntegrationExecutionContext<IntegrationInvocationEvent>,
): Promise<IntegrationExecutionResult> {
  const executionContext = await initializeContext(context);
  const operations = await processUsers(executionContext);
  return {
    operations: await executionContext.persister.publishPersisterOperations(
      operations,
    ),
  };
}
