import { IntegrationLogger } from '@jupiterone/integration-sdk-core';

/**
 * Generate id for realtionship `Applicaion - Group`
 * @date 4/7/2023 - 11:51:11 AM
 *
 * @export
 * @param {string} groupId
 * @param {string} appEntityKey
 * @param {IntegrationLogger} logger
 * @returns {(string | undefined)}
 */
export default function buildApplicationGroupRelationshipId(
  groupId: string,
  appEntityKey: string,
  logger: IntegrationLogger,
): string | undefined {
  if (!groupId || !appEntityKey) {
    logger?.info(
      "Couldn't create relationship id, invalid information provided",
    );
    return;
  }

  return `${groupId}|assigned|${appEntityKey}`;
}
