import {
  IntegrationError,
  IntegrationExecutionResult,
  IntegrationInstanceAuthorizationError,
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
    logger,
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
    return {
      error: new IntegrationError({
        message:
          "Step 'Applications' dependency failed, cannot ingest application users: 'fetch-applications'",
        expose: true,
      }),
    };
  }

  const applicationUsersCache = cache.iterableCache<
    OktaApplicationUserCacheEntry,
    OktaCacheState
  >("application_users");
  const applicationUsersState = await applicationUsersCache.getState();
  if (!applicationUsersState || !applicationUsersState.fetchCompleted) {
    return {
      error: new IntegrationError({
        message:
          "Step 'Applications' dependency failed, cannot ingest application users: 'fetch-application-users'",
        expose: true,
      }),
    };
  }

  if (
    applicationsState.encounteredAuthorizationError ||
    applicationUsersState.encounteredAuthorizationError
  ) {
    throw new IntegrationInstanceAuthorizationError(
      new Error(
        "Applications synchronization depends on Applications and Applications' Users ingestion",
      ),
      "applications",
    );
  }

  const oktaAccountInfo = getOktaAccountInfo(instance);
  const accountEntity = createAccountEntity(config, oktaAccountInfo);

  const newApplications: { [id: string]: StandardizedOktaApplication } = {};
  const newAccountApplicationRelationships: StandardizedOktaAccountApplicationRelationship[] = [];
  const newApplicationGroupAndGroupRoleRelationships: IntegrationRelationship[] = [];
  const newApplicationUserAndUserRoleRelationships: IntegrationRelationship[] = [];

  await applicationsCache.forEach(({ entry }) => {
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

  await applicationUsersCache.forEach(({ entry }) => {
    const application = newApplications[entry.data!.applicationId];
    newApplicationUserAndUserRoleRelationships.push(
      ...createApplicationUserRelationships(
        application,
        entry.data!.applicationUser,
      ),
    );
  });

  const oldApplications = await graph.findEntitiesByType(
    APPLICATION_ENTITY_TYPE,
  );
  const [
    oldAccountApplicationRelationships,
    oldApplicationGroupRelationships,
    oldGroupIAMRoleRelationships,
    oldApplicationUserRelationships,
    oldUserIAMRoleRelationships,
  ] = await Promise.all([
    graph.findRelationshipsByType(ACCOUNT_APPLICATION_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(APPLICATION_GROUP_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(GROUP_IAM_ROLE_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(APPLICATION_USER_RELATIONSHIP_TYPE),
    graph.findRelationshipsByType(USER_IAM_ROLE_RELATIONSHIP_TYPE),
  ]);

  logger.info(
    {
      newApplications: newApplications.length,
      oldApplications: oldApplications.length,
      newAccountApplicationRelationships:
        newAccountApplicationRelationships.length,
      oldAccountApplicationRelationships:
        oldAccountApplicationRelationships.length,
      newApplicationGroupAndGroupRoleRelationships:
        newApplicationGroupAndGroupRoleRelationships.length,
      oldApplicationGroupRelationships: oldApplicationGroupRelationships.length,
      oldGroupIAMRoleRelationships: oldGroupIAMRoleRelationships.length,
      newApplicationUserAndUserRoleRelationships:
        newApplicationUserAndUserRoleRelationships.length,
      oldApplicationUserRelationships: oldApplicationUserRelationships.length,
      oldUserIAMRoleRelationships: oldUserIAMRoleRelationships.length,
    },
    "Synchronizing applications...",
  );

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
