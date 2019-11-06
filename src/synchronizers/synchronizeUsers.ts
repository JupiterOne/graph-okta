import {
  IntegrationError,
  IntegrationExecutionResult,
} from "@jupiterone/jupiter-managed-integration-sdk";
import {
  createGroupUserRelationship,
  createMFADeviceEntity,
  createUserEntity,
  createUserGroupEntity,
  createUserMfaDeviceRelationship,
  GROUP_USER_RELATIONSHIP_TYPE,
  MFA_DEVICE_ENTITY_TYPE,
  USER_ENTITY_TYPE,
  USER_MFA_DEVICE_RELATIONSHIP_TYPE,
} from "../converters";
import { OktaCacheState, OktaUserCacheEntry } from "../okta/types";
import {
  OktaExecutionContext,
  StandardizedOktaFactor,
  StandardizedOktaUser,
  StandardizedOktaUserFactorRelationship,
  StandardizedOktaUserGroupRelationship,
} from "../types";

/**
 * Synchronizes Okta users, including their MFA devices and relationships to
 * their groups. This must be executed after `synchronizeAccount`,
 * `synchronizeGroups` to ensure that related entities are created before
 * relationships.
 */
export default async function synchronizeUsers(
  executionContext: OktaExecutionContext,
): Promise<IntegrationExecutionResult> {
  const {
    instance: { config },
    graph,
    persister,
  } = executionContext;
  const cache = executionContext.clients.getCache();
  const usersCache = cache.iterableCache<OktaUserCacheEntry, OktaCacheState>(
    "users",
  );

  const usersState = await usersCache.getState();
  if (!usersState || !usersState.fetchCompleted) {
    throw new IntegrationError("User fetching did not complete");
  }

  const newUsers: StandardizedOktaUser[] = [];
  const newMFADevices: StandardizedOktaFactor[] = [];
  const newUserMFADeviceRelationships: StandardizedOktaUserFactorRelationship[] = [];
  const newGroupUserRelationships: StandardizedOktaUserGroupRelationship[] = [];

  usersCache.forEach(entry => {
    const userEntity = createUserEntity(config, entry.data!.user);
    newUsers.push(userEntity);

    for (const factor of entry.data!.factors) {
      const mfaDeviceEntity = createMFADeviceEntity(factor);
      newMFADevices.push(mfaDeviceEntity);
      newUserMFADeviceRelationships.push(
        createUserMfaDeviceRelationship(userEntity, mfaDeviceEntity),
      );
    }

    for (const group of entry.data!.userGroups) {
      const groupEntity = createUserGroupEntity(config, group);
      newGroupUserRelationships.push(
        createGroupUserRelationship(groupEntity, userEntity),
      );
    }
  });

  const [
    oldUsers,
    oldMFADevices,
    oldUserMFADeviceRelationships,
    oldGroupUserRelationships,
  ] = await Promise.all([
    graph.findEntitiesByType(USER_ENTITY_TYPE),
    graph.findEntitiesByType(MFA_DEVICE_ENTITY_TYPE),
    graph.findRelationshipsByType(USER_MFA_DEVICE_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(GROUP_USER_RELATIONSHIP_TYPE),
  ]);

  return {
    operations: await persister.publishPersisterOperations([
      [
        ...persister.processEntities(oldUsers, newUsers),
        ...persister.processEntities(oldMFADevices, newMFADevices),
      ],
      [
        ...persister.processRelationships(
          oldUserMFADeviceRelationships,
          newUserMFADeviceRelationships,
        ),
        ...persister.processRelationships(
          oldGroupUserRelationships,
          newGroupUserRelationships,
        ),
      ],
    ]),
  };
}
