import {
  IntegrationLogger,
  IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';

export default async function logIfForbiddenOrNotFound({
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
    if (err.status === 403 || err.status === 404) {
      // TODO: log an event visible to the user so they know that their entity
      // will be partially deflated and what permissions they need to grant to
      // fix the issue.
      logger.info({ err }, `Couldn't list ${resource}`);
      await onForbidden(err);
    } else {
      throw new IntegrationProviderAPIError(err);
    }
  }
}
