import Logger from "bunyan";
import { Request } from "koa";
import getIntegrationInstance from "./instance";

export default async function verifyRequest(
  request: Request,
  logger: Logger,
): Promise<boolean> {
  const accountId = request.get("Jupiter-One-Account-Id");
  const integrationInstanceId = request.get(
    "Jupiter-One-Integration-Instance-ID",
  );
  const authenticationSecret = request.get("Authentication");

  if (!accountId || !integrationInstanceId || !authenticationSecret) {
    return false;
  }

  let integrationInstanceAuthenticationSecret: string | undefined;

  try {
    const integrationInstance = await getIntegrationInstance(
      accountId,
      integrationInstanceId,
      logger,
    );

    if (integrationInstance) {
      integrationInstanceAuthenticationSecret =
        integrationInstance.config.authenticationSecret;
    }
  } catch (err) {
    logger.warn(
      err,
      "Encountered an issue while trying to fetch integration instance for event hook",
    );
  }

  if (
    !integrationInstanceAuthenticationSecret ||
    authenticationSecret !== integrationInstanceAuthenticationSecret
  ) {
    return false;
  }

  return true;
}
