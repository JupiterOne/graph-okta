import {
  IntegrationExecutionResult,
  IntegrationRelationship,
} from "@jupiterone/jupiter-managed-integration-sdk";

import {
  ACCOUNT_APPLICATION_RELATIONSHIP_TYPE,
  APPLICATION_ENTITY_TYPE,
  APPLICATION_GROUP_RELATIONSHIP_TYPE,
  APPLICATION_USER_RELATIONSHIP_TYPE,
  createAccountApplicationRelationship,
  createAccountEntity,
  createApplicationEntity,
  createApplicationGroupRelationship,
  createApplicationUserRelationships,
  createUserEntity,
  createUserGroupEntity,
  USER_IAM_ROLE_RELATIONSHIP_TYPE,
} from "../converters";
import { OktaApplication, OktaUser, OktaUserGroup } from "../okta/types";
import {
  OktaExecutionContext,
  StandardizedOktaAccountApplicationRelationship,
  StandardizedOktaApplication,
  StandardizedOktaApplicationGroupRelationship,
} from "../types";
import getOktaAccountInfo from "../util/getOktaAccountInfo";
import retryIfRateLimited from "../util/retryIfRateLimited";

/**
 * Synchronizes Okta applications. This must be executed after
 * `synchronizeAccount`, `synchronizeGroups`, `synchronizeUsers` to ensure that
 * related entities are created before relationships.
 */
export default async function synchronizeApplications(
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

  const newApplications: StandardizedOktaApplication[] = [];
  const newAccountApplicationRelationships: StandardizedOktaAccountApplicationRelationship[] = [];
  const newApplicationGroupRelationships: StandardizedOktaApplicationGroupRelationship[] = [];
  const newApplicationUserAndUserRoleRelationships: IntegrationRelationship[] = [];

  const applicationsCollection = await okta.listApplications();
  await retryIfRateLimited(logger, () =>
    applicationsCollection.each((app: OktaApplication) => {
      const applicationEntity = createApplicationEntity(instance, app);
      newApplications.push(applicationEntity);
      newAccountApplicationRelationships.push(
        createAccountApplicationRelationship(accountEntity, applicationEntity),
      );
    }),
  );

  for (const applicationEntity of newApplications) {
    const applicationGroups = await okta.listApplicationGroupAssignments(
      applicationEntity.id,
    );
    await retryIfRateLimited(logger, () =>
      applicationGroups.each((group: OktaUserGroup) => {
        const groupEntity = createUserGroupEntity(config, group);
        newApplicationGroupRelationships.push(
          createApplicationGroupRelationship(applicationEntity, groupEntity),
        );
      }),
    );

    const applicationUsersCollection = await okta.listApplicationUsers(
      applicationEntity.id,
    );
    await retryIfRateLimited(logger, () =>
      applicationUsersCollection.each((user: OktaUser) => {
        const userEntity = createUserEntity(config, user);
        newApplicationUserAndUserRoleRelationships.push(
          ...createApplicationUserRelationships(applicationEntity, userEntity),
        );
      }),
    );
  }

  const [
    oldApplications,
    oldAccountApplicationRelationships,
    oldApplicationGroupRelationships,
    oldApplicationUserRelationships,
    oldUserIAMRoleRelationships,
  ] = await Promise.all([
    graph.findEntitiesByType(APPLICATION_ENTITY_TYPE),
    graph.findRelationshipsByType(ACCOUNT_APPLICATION_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(APPLICATION_GROUP_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(APPLICATION_USER_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(USER_IAM_ROLE_RELATIONSHIP_TYPE),
  ]);

  return {
    operations: await persister.publishPersisterOperations([
      [...persister.processEntities(oldApplications, newApplications)],
      [
        ...persister.processRelationships(
          oldAccountApplicationRelationships,
          newAccountApplicationRelationships,
        ),
        ...persister.processRelationships(
          oldApplicationGroupRelationships,
          newApplicationGroupRelationships,
        ),
        ...persister.processRelationships(
          [...oldApplicationUserRelationships, ...oldUserIAMRoleRelationships],
          newApplicationUserAndUserRoleRelationships,
        ),
      ],
    ]),
  };
}
