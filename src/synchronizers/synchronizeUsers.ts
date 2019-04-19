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
import { OktaFactor, OktaUser, OktaUserGroup } from "../okta/types";
import {
  OktaExecutionContext,
  StandardizedOktaFactor,
  StandardizedOktaUser,
  StandardizedOktaUserFactorRelationship,
  StandardizedOktaUserGroupRelationship,
} from "../types";
import retryIfRateLimited from "../util/retryIfRateLimited";

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
    okta,
    graph,
    persister,
    logger,
  } = executionContext;

  const newUsers: StandardizedOktaUser[] = [];
  const newMFADevices: StandardizedOktaFactor[] = [];
  const newUserMFADeviceRelationships: StandardizedOktaUserFactorRelationship[] = [];
  const newGroupUserRelationships: StandardizedOktaUserGroupRelationship[] = [];

  const usersCollection = await okta.listUsers();
  await retryIfRateLimited(logger, () =>
    usersCollection.each((user: OktaUser) => {
      newUsers.push(createUserEntity(config, user));
    }),
  );

  for (const userEntity of newUsers) {
    const userFactorsCollection = await okta.listFactors(userEntity.id);
    await retryIfRateLimited(logger, () =>
      userFactorsCollection.each((factor: OktaFactor) => {
        const mfaDeviceEntity = createMFADeviceEntity(factor);
        newMFADevices.push(mfaDeviceEntity);
        newUserMFADeviceRelationships.push(
          createUserMfaDeviceRelationship(userEntity, mfaDeviceEntity),
        );
      }),
    );

    const userGroupsCollection = await okta.listUserGroups(userEntity.id);
    await retryIfRateLimited(logger, () =>
      userGroupsCollection.each((group: OktaUserGroup) => {
        const groupEntity = createUserGroupEntity(config, group);
        newGroupUserRelationships.push(
          createGroupUserRelationship(groupEntity, userEntity),
        );
      }),
    );
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
}
