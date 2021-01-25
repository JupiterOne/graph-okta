import {
  IntegrationLogger,
  IntegrationError,
} from '@jupiterone/jupiter-managed-integration-sdk';

class IntegrationApiError extends IntegrationError {
  readonly name: string;

  constructor(cause: Error) {
    super({
      message:
        'Error calling API endpoint. Please contact us in Slack or at https://support.jupiterone.io if the problem continues to occur.',
      expose: true,
      cause,
      code: (cause as any).code,
      statusCode: (cause as any).statusCode,
    });
    this.name = 'error_provider_api';
  }
}

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
      throw new IntegrationApiError(err);
    }
  }
}
