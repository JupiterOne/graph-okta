import {
  IntegrationError,
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
  createApplicationGroupRelationships,
  createApplicationUserRelationships,
  GROUP_IAM_ROLE_RELATIONSHIP_TYPE,
  USER_IAM_ROLE_RELATIONSHIP_TYPE,
} from "../converters";
import {
  OktaApplicationCacheEntry,
  OktaApplicationUserCacheEntry,
  OktaCacheState,
} from "../okta/types";
import {
  OktaExecutionContext,
  StandardizedOktaAccountApplicationRelationship,
  StandardizedOktaApplication,
} from "../types";
import getOktaAccountInfo from "../util/getOktaAccountInfo";

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
    graph,
    persister,
  } = executionContext;
  const cache = executionContext.clients.getCache();

  const applicationsCache = cache.iterableCache<
    OktaApplicationCacheEntry,
    OktaCacheState
  >("applications");
  const applicationsState = await applicationsCache.getState();
  if (!applicationsState || !applicationsState.fetchCompleted) {
    throw new IntegrationError("Application fetching did not complete");
  }

  const applicationUsersCache = cache.iterableCache<
    OktaApplicationUserCacheEntry,
    OktaCacheState
  >("application_users");
  const applicationUsersState = await applicationUsersCache.getState();
  if (!applicationUsersState || !applicationUsersState.fetchCompleted) {
    throw new IntegrationError("Application users fetching did not complete");
  }

  const oktaAccountInfo = getOktaAccountInfo(instance);
  const accountEntity = createAccountEntity(config, oktaAccountInfo);

  const newApplications: { [id: string]: StandardizedOktaApplication } = {};
  const newAccountApplicationRelationships: StandardizedOktaAccountApplicationRelationship[] = [];
  const newApplicationGroupAndGroupRoleRelationships: IntegrationRelationship[] = [];
  const newApplicationUserAndUserRoleRelationships: IntegrationRelationship[] = [];

  await applicationsCache.forEach(entry => {
    const applicationEntity = createApplicationEntity(
      instance,
      entry.data!.application,
    );
    newApplications[applicationEntity.id] = applicationEntity;

    newAccountApplicationRelationships.push(
      createAccountApplicationRelationship(accountEntity, applicationEntity),
    );

    for (const group of entry.data!.applicationGroups) {
      newApplicationGroupAndGroupRoleRelationships.push(
        ...createApplicationGroupRelationships(applicationEntity, group),
      );
    }
  });

  await applicationUsersCache.forEach(entry => {
    const application = newApplications[entry.data!.applicationId];
    newApplicationUserAndUserRoleRelationships.push(
      ...createApplicationUserRelationships(
        application,
        entry.data!.applicationUser,
      ),
    );
  });

  const [
    oldApplications,
    oldAccountApplicationRelationships,
    oldApplicationGroupRelationships,
    oldGroupIAMRoleRelationships,
    oldApplicationUserRelationships,
    oldUserIAMRoleRelationships,
  ] = await Promise.all([
    graph.findEntitiesByType(APPLICATION_ENTITY_TYPE),
    graph.findRelationshipsByType(ACCOUNT_APPLICATION_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(APPLICATION_GROUP_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(GROUP_IAM_ROLE_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(APPLICATION_USER_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(USER_IAM_ROLE_RELATIONSHIP_TYPE),
  ]);

  return {
    operations: await persister.publishPersisterOperations([
      [
        ...persister.processEntities(
          oldApplications,
          Object.values(newApplications),
        ),
      ],
      [
        ...persister.processRelationships(
          oldAccountApplicationRelationships,
          newAccountApplicationRelationships,
        ),
        ...persister.processRelationships(
          [
            ...oldApplicationGroupRelationships,
            ...oldGroupIAMRoleRelationships,
          ],
          newApplicationGroupAndGroupRoleRelationships,
        ),
        ...persister.processRelationships(
          [...oldApplicationUserRelationships, ...oldUserIAMRoleRelationships],
          newApplicationUserAndUserRoleRelationships,
        ),
      ],
    ]),
  };
}
