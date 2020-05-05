import { IntegrationLogger } from "@jupiterone/jupiter-managed-integration-sdk";

export default async function logIfForbidden({
  logger,
  resource,
  func,
  // tslint:disable-next-line:no-empty
  onForbidden = async (): Promise<void> => {
    // no-op
  },
}: {
  logger: IntegrationLogger;
  resource: string;
  func: () => Promise<void>;
  onForbidden?: (err: any) => Promise<void>;
}): Promise<void> {
  try {
    await func();
  } catch (err) {
    if (err.status === 403) {
      // TODO: log an event visible to the user so they know that their entity
      // will be partially deflated and what permissions they need to grant to
      // fix the issue.
      logger.info({ err }, `Couldn't list ${resource}`);
      await onForbidden(err);
    } else {
      throw err;
    }
  }
}
