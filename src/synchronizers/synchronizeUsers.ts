import { IntegrationExecutionResult } from "@jupiterone/jupiter-managed-integration-sdk";

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
import { createUserCache } from "../okta/cache";
import {
  OktaExecutionContext,
  StandardizedOktaFactor,
  StandardizedOktaUser,
  StandardizedOktaUserFactorRelationship,
  StandardizedOktaUserGroupRelationship,
} from "../types";
import { fetchSucceeded } from "../util/fetchSuccess";

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
    logger,
  } = executionContext;
  const cache = executionContext.clients.getCache();
  const usersCache = createUserCache(cache);

  if (!(await fetchSucceeded(cache, ["users"]))) {
    const err = new Error("User fetching did not complete");
    executionContext.logger.error({ err }, "User synchronization aborted");
    return {
      error: err,
    };
  }

  const userIds = await usersCache.getIds();
  if (userIds) {
    const newUsers: StandardizedOktaUser[] = [];
    const newMFADevices: StandardizedOktaFactor[] = [];
    const newUserMFADeviceRelationships: StandardizedOktaUserFactorRelationship[] = [];
    const newGroupUserRelationships: StandardizedOktaUserGroupRelationship[] = [];

    const usersCacheEntries = await usersCache.getEntries(userIds);
    for (const entry of usersCacheEntries) {
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
    }

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
  } else {
    logger.info("No userIds found in cache, nothing to synchronize");
    return {
      operations: {
        created: 0,
        updated: 0,
        deleted: 0,
      },
    };
  }
}
