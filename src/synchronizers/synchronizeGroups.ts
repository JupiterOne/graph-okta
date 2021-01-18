import {
  IntegrationExecutionResult,
  IntegrationInstanceAuthorizationError,
} from '@jupiterone/jupiter-managed-integration-sdk';

import {
  ACCOUNT_GROUP_RELATIONSHIP_TYPE,
  APP_USER_GROUP_ENTITY_TYPE,
  createAccountEntity,
  createAccountGroupRelationship,
  createUserGroupEntity,
  USER_GROUP_ENTITY_TYPE,
} from '../converters';
import { OktaUserGroup } from '../okta/types';
import {
  OktaExecutionContext,
  StandardizedOktaAccountGroupRelationship,
  StandardizedOktaUserGroup,
} from '../types';
import getOktaAccountInfo from '../util/getOktaAccountInfo';
import logIfForbiddenOrNotFound from '../util/logIfForbidden';
import retryApiCall from '../util/retryApiCall';

/**
 * Synchronizes Okta user groups, whether managed by Okta or external
 * applications. This must be executed after `synchronizeAccount` to ensure that
 * related entities are created before relationships.
 */
export default async function synchronizeGroups(
  executionContext: OktaExecutionContext,
): Promise<IntegrationExecutionResult> {
  const {
    instance,
    instance: { config },
    okta,
    graph,
    persister,
    logger,
  } = executionContext;

  const oktaAccountInfo = getOktaAccountInfo(instance);
  const accountEntity = createAccountEntity(config, oktaAccountInfo);

  const newOktaManagedUserGroups: StandardizedOktaUserGroup[] = [];
  const newAppManagedUserGroups: StandardizedOktaUserGroup[] = [];
  const newAccountGroupRelationships: StandardizedOktaAccountGroupRelationship[] = [];

  const groupsCollection = okta.listGroups();

  await logIfForbiddenOrNotFound({
    logger,
    resource: 'groups',
    onForbidden: (err) => {
      throw new IntegrationInstanceAuthorizationError(err, 'groups');
    },
    func: async () => {
      await retryApiCall(logger, () =>
        groupsCollection.each((group: OktaUserGroup) => {
          const groupEntity = createUserGroupEntity(config, group);
          newAccountGroupRelationships.push(
            createAccountGroupRelationship(accountEntity, groupEntity),
          );
          if (groupEntity._type === USER_GROUP_ENTITY_TYPE) {
            newOktaManagedUserGroups.push(groupEntity);
          } else {
            newAppManagedUserGroups.push(groupEntity);
          }
        }),
      );
    },
  });

  const [
    oldOktaManagedUserGroups,
    oldAppManagedUserGroups,
  ] = await Promise.all([
    graph.findEntitiesByType(USER_GROUP_ENTITY_TYPE),
    graph.findEntitiesByType(APP_USER_GROUP_ENTITY_TYPE),
  ]);

  const oldAccountGroupRelationships = await graph.findRelationshipsByType(
    ACCOUNT_GROUP_RELATIONSHIP_TYPE,
  );

  logger.info(
    {
      newOktaManagedUserGroups: newOktaManagedUserGroups.length,
      oldOktaManagedUserGroups: oldOktaManagedUserGroups.length,
      oldAppManagedUserGroups: oldAppManagedUserGroups.length,
      newAppManagedUserGroups: newAppManagedUserGroups.length,
      oldAccountGroupRelationships: oldAccountGroupRelationships.length,
      newAccountGroupRelationships: newAccountGroupRelationships.length,
    },
    'Synchronizing groups...',
  );

  return {
    operations: await persister.publishPersisterOperations([
      [
        ...persister.processEntities({
          oldEntities: oldOktaManagedUserGroups,
          newEntities: newOktaManagedUserGroups,
        }),
        ...persister.processEntities({
          oldEntities: oldAppManagedUserGroups,
          newEntities: newAppManagedUserGroups,
        }),
      ],
      persister.processRelationships({
        oldRelationships: oldAccountGroupRelationships,
        newRelationships: newAccountGroupRelationships,
      }),
    ]),
  };
}
