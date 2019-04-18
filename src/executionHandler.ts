import {
  IntegrationExecutionResult,
  IntegrationStepExecutionContext,
} from "@jupiterone/jupiter-managed-integration-sdk";
import initializeContext from "./initializeContext";
import synchronize from "./synchronizer";

export default async function executionHandler(
  context: IntegrationStepExecutionContext,
): Promise<IntegrationExecutionResult> {
  const executionContext = await initializeContext(context);
  const operations = await synchronize(executionContext);
  return {
    operations: await executionContext.persister.publishPersisterOperations(
      operations,
    ),
  };
}
