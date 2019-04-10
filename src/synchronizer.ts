import {
  EntityFromIntegration,
  EntityOperation,
  PersisterOperations,
  RelationshipFromIntegration,
  RelationshipOperation,
} from "@jupiterone/jupiter-managed-integration-sdk";

import * as constants from "./constants";
import * as converters from "./converters";
import {
  OktaApplication,
  OktaExecutionContext,
  OktaFactor,
  OktaIntegrationConfig,
  OktaUser,
  OktaUserGroup,
  StandardizedOktaAccount,
  StandardizedOktaAccountApplicationRelationship,
  StandardizedOktaAccountGroupRelationship,
  StandardizedOktaApplication,
  StandardizedOktaApplicationGroupRelationship,
  StandardizedOktaApplicationUserRelationship,
  StandardizedOktaFactor,
  StandardizedOktaService,
  StandardizedOktaUser,
  StandardizedOktaUserFactorRelationship,
  StandardizedOktaUserGroup,
  StandardizedOktaUserGroupRelationship,
} from "./types";
import getOktaAccountInfo from "./util/getOktaAccountInfo";
import retryIfRateLimited from "./util/retryIfRateLimited";

async function listAllUsers(
  executionContext: OktaExecutionContext,
): Promise<
  [
    StandardizedOktaUser[],
    StandardizedOktaFactor[],
    StandardizedOktaUserFactorRelationship[]
  ]
> {
  const users: StandardizedOktaUser[] = [];
  const factors: StandardizedOktaFactor[] = [];
  const relationships: StandardizedOktaUserFactorRelationship[] = [];

  const { okta, jobs, logger } = executionContext;

  await jobs.logEvent("query_start", "Querying for users from Okta...");

  const userCollection = await okta.listUsers();
  await retryIfRateLimited(logger, () =>
    userCollection.each((user: OktaUser) => {
      users.push(converters.convertOktaUser(executionContext, user));
    }),
  );

  await jobs.logEvent("query_end", "Successfully queried users from Okta.");

  await jobs.logEvent(
    "query_start",
    "Querying for mfa factors from Okta for all users...",
  );

  for (const user of users) {
    logger.info(
      { user },
      `Querying for mfa factors assigned to user ${user.id} from Okta...`,
    );

    const userFactorCollection = await okta.listFactors(user.id);
    await retryIfRateLimited(logger, () =>
      userFactorCollection.each((factor: OktaFactor) => {
        factors.push(converters.convertOktaFactor(factor));
        relationships.push(
          converters.convertOktaUserFactorRelationship(user, factor),
        );
      }),
    );
  }

  await jobs.logEvent(
    "query_end",
    "Successfully queried user factors from Okta.",
  );

  return [users, factors, relationships];
}

async function listAllUserGroups(
  executionContext: OktaExecutionContext,
  user: StandardizedOktaUser,
): Promise<StandardizedOktaUserGroup[]> {
  const groups: StandardizedOktaUserGroup[] = [];
  const { okta, logger } = executionContext;

  logger.info({ user }, "Querying Okta user groups...");

  const userGroupCollection = await okta.listUserGroups(user.id);
  await retryIfRateLimited(logger, () =>
    userGroupCollection.each((group: OktaUserGroup) => {
      groups.push(converters.convertOktaUserGroup(executionContext, group));
    }),
  );

  logger.info(
    {
      accountId: executionContext.instance.accountId,
      user,
    },
    "Successfully queried for user groups from Okta.",
  );

  return groups;
}

async function listAllApplications(
  executionContext: OktaExecutionContext,
): Promise<StandardizedOktaApplication[]> {
  const applications: StandardizedOktaApplication[] = [];
  const { okta, jobs, logger } = executionContext;

  await jobs.logEvent("query_start", "Querying for applications from Okta...");

  const applicationsCollection = await okta.listApplications();
  await retryIfRateLimited(logger, () =>
    applicationsCollection.each((app: OktaApplication) => {
      applications.push(
        converters.convertOktaApplication(executionContext, app),
      );
    }),
  );

  await jobs.logEvent(
    "query_end",
    "Successfully queried for applications from Okta.",
  );

  return applications;
}

async function listAllApplicationUserAssignments(
  executionContext: OktaExecutionContext,
  application: StandardizedOktaApplication,
): Promise<RelationshipFromIntegration[]> {
  const relationships: RelationshipFromIntegration[] = [];
  const { okta, logger } = executionContext;

  logger.info(
    {
      accountId: executionContext.instance.accountId,
      application,
    },
    `Querying for users for application from Okta...`,
  );

  const users = await okta.listApplicationUsers(application.id);
  await retryIfRateLimited(logger, () =>
    users.each((user: OktaUser) => {
      relationships.push(
        ...converters.convertOktaApplicationUserRelationship(application, user),
      );
    }),
  );

  logger.info(
    {
      accountId: executionContext.instance.accountId,
      application,
    },
    "Successfully queried for users for application from Okta",
  );

  return relationships;
}

async function listAllApplicationGroupAssignments(
  executionContext: OktaExecutionContext,
  application: StandardizedOktaApplication,
): Promise<StandardizedOktaApplicationGroupRelationship[]> {
  const relationships: StandardizedOktaApplicationGroupRelationship[] = [];
  const { okta, logger } = executionContext;

  logger.info(
    {
      accountId: executionContext.instance.accountId,
      application,
    },
    "Querying for groups for application from Okta...",
  );

  const groups = await okta.listApplicationGroupAssignments(application.id);
  await retryIfRateLimited(logger, () =>
    groups.each((group: OktaUserGroup) => {
      relationships.push(
        converters.convertOktaApplicationGroupRelationship(application, group),
      );
    }),
  );

  logger.info(
    {
      accountId: executionContext.instance.accountId,
      application,
    },
    "Successfully queried for groups for application from Okta.",
  );

  return relationships;
}

async function queryExistingEntities<T extends EntityFromIntegration>(
  entityType: string,
  executionContext: OktaExecutionContext,
): Promise<T[]> {
  const { graph, instance, jobs, logger } = executionContext;

  await jobs.logEvent(
    "query_start",
    `Querying for existing ${entityType} entities from database...`,
  );

  const filters = {
    _type: entityType,
    _accountId: instance.accountId,
    _integrationInstanceId: instance.id,
    _deleted: false,
  };

  logger.info(
    {
      filters,
    },
    "Finding entities...",
  );

  const entities = await graph.findEntities(filters);

  logger.info(
    {
      entitiesLength: entities.length,
    },
    "Finished finding entities",
  );

  await jobs.logEvent(
    "query_end",
    `Successfully queried for existing ${entityType} entities from database.`,
  );

  return entities as T[];
}

async function queryExistingRelationships<
  T extends RelationshipFromIntegration
>(
  relationshipType: string,
  executionContext: OktaExecutionContext,
): Promise<T[]> {
  const { graph, instance, jobs, logger } = executionContext;

  await jobs.logEvent(
    "query_start",
    `Querying for existing ${relationshipType} relationships...`,
  );

  const filters = {
    _type: relationshipType,
    _accountId: instance.accountId,
    _integrationInstanceId: instance.id,
    _deleted: false,
  };

  logger.info(
    {
      filters,
    },
    "Finding relationships...",
  );

  const relationships = await graph.findRelationships(filters);

  logger.info(
    {
      filters,
      relationshipsLength: relationships.length,
    },
    "Finished finding relationships",
  );

  await jobs.logEvent(
    "query_end",
    `Successfully queried for existing ${relationshipType} relationships.`,
  );

  return relationships as T[];
}

interface Lookup<V> {
  [k: string]: V;
}

export default async function synchronize(
  executionContext: OktaExecutionContext,
): Promise<PersisterOperations> {
  const { instance, jobs, logger, persister } = executionContext;
  const integrationConfig = instance.config as OktaIntegrationConfig;

  let entityOperations: EntityOperation[] = [];
  let relationshipOperations: RelationshipOperation[] = [];

  await jobs.logEvent("work_start", "Processing Okta resources...");

  const oktaAccountInfo = getOktaAccountInfo(executionContext.instance);
  let displayName = oktaAccountInfo.name;
  if (oktaAccountInfo.preview) {
    displayName += " (preview)";
  }

  const account: StandardizedOktaAccount = {
    _type: constants.ENTITY_TYPE_ACCOUNT,
    _key: integrationConfig.oktaOrgUrl,
    _class: "Account",
    name: oktaAccountInfo.name,
    displayName,
    webLink: integrationConfig.oktaOrgUrl,
  };

  const ssoService: StandardizedOktaService = {
    _type: constants.ENTITY_TYPE_SERVICE,
    _key: `okta:sso:${oktaAccountInfo.name}`,
    _class: constants.ENTITY_CLASS_SERVICE,
    name: "SSO",
    displayName: "Okta SSO",
    category: "security",
    function: "sso",
    controlDomain: "identity-access",
  };

  const mfaService: StandardizedOktaService = {
    _type: constants.ENTITY_TYPE_SERVICE,
    _key: `okta:mfa:${oktaAccountInfo.name}`,
    _class: constants.ENTITY_CLASS_SERVICE,
    name: "MFA",
    displayName: "Okta MFA",
    category: "security",
    function: "mfa",
    controlDomain: "identity-access",
  };

  const oldAccounts = await queryExistingEntities<StandardizedOktaAccount>(
    constants.ENTITY_TYPE_ACCOUNT,
    executionContext,
  );
  const newAccounts = [account];

  const oldServices = await queryExistingEntities<StandardizedOktaService>(
    constants.ENTITY_TYPE_SERVICE,
    executionContext,
  );
  const newServices = [ssoService, mfaService];

  const oldAccountServiceRelationships = await queryExistingRelationships<
    RelationshipFromIntegration
  >(constants.RELATIONSHIP_TYPE_ACCOUNT_SERVICE, executionContext);
  const newAccountServiceRelationships: RelationshipFromIntegration[] = converters.createHasRelationships(
    account,
    [ssoService, mfaService],
    constants.RELATIONSHIP_TYPE_ACCOUNT_SERVICE,
  );

  const oldAccountGroupRelationships = await queryExistingRelationships<
    StandardizedOktaAccountGroupRelationship
  >(constants.RELATIONSHIP_TYPE_ACCOUNT_GROUP, executionContext);
  const newAccountGroupRelationships: StandardizedOktaAccountGroupRelationship[] = [];

  const [newUsers, newFactors, newUserFactorRelationships] = await listAllUsers(
    executionContext,
  );

  const oldUsers: StandardizedOktaUser[] = await queryExistingEntities<
    StandardizedOktaUser
  >(constants.ENTITY_TYPE_USER, executionContext);

  const oldFactors: StandardizedOktaFactor[] = await queryExistingEntities<
    StandardizedOktaFactor
  >(constants.ENTITY_TYPE_FACTOR, executionContext);

  const oldUserFactorRelationships = await queryExistingRelationships<
    StandardizedOktaUserFactorRelationship
  >(constants.RELATIONSHIP_TYPE_USER_FACTOR, executionContext);

  const oldOktaGroups = await queryExistingEntities<StandardizedOktaUserGroup>(
    constants.ENTITY_TYPE_USER_GROUP,
    executionContext,
  );

  const oldAppGroups = await queryExistingEntities<StandardizedOktaUserGroup>(
    constants.ENTITY_TYPE_APP_USER_GROUP,
    executionContext,
  );

  // newOktaGroups is the collection of new groups that are managed by Okta
  const newOktaGroups: StandardizedOktaUserGroup[] = [];

  // newAppGroups is the collection of new groups that are managed outside Okta
  // by other applications
  const newAppGroups: StandardizedOktaUserGroup[] = [];

  const oldApplications = await queryExistingEntities<
    StandardizedOktaApplication
  >(constants.ENTITY_TYPE_APPLICATION, executionContext);
  const newApplications = await listAllApplications(executionContext);

  const oldUserGroupRelationships = await queryExistingRelationships<
    StandardizedOktaUserGroupRelationship
  >(constants.RELATIONSHIP_TYPE_GROUP_USER, executionContext);
  const newUserGroupRelationships: StandardizedOktaUserGroupRelationship[] = [];

  const oldAccountApplicationRelationships = await queryExistingRelationships<
    StandardizedOktaAccountApplicationRelationship
  >(constants.RELATIONSHIP_TYPE_ACCOUNT_APPLICATION, executionContext);
  const newAccountApplicationRelationships: StandardizedOktaAccountApplicationRelationship[] = [];

  const oldApplicationUserRelationships = [
    ...(await queryExistingRelationships<RelationshipFromIntegration>(
      constants.RELATIONSHIP_TYPE_USER_IAM_ROLE_ASSIGNMENT,
      executionContext,
    )),
    ...(await queryExistingRelationships<
      StandardizedOktaApplicationUserRelationship
    >(constants.RELATIONSHIP_TYPE_APPLICATION_USER, executionContext)),
  ];
  const newApplicationUserRelationships: RelationshipFromIntegration[] = [];

  const oldApplicationGroupRelationships = await queryExistingRelationships<
    StandardizedOktaApplicationGroupRelationship
  >(constants.RELATIONSHIP_TYPE_APPLICATION_GROUP, executionContext);
  const newApplicationGroupRelationships: StandardizedOktaApplicationGroupRelationship[] = [];

  const groupByIdLookup: Lookup<StandardizedOktaUserGroup> = {};

  await jobs.logEvent("query_start", "Querying for user groups from Okta...");

  for (const user of newUsers) {
    // Examine the user and group relationships
    const groupsForUser = await listAllUserGroups(executionContext, user);
    for (const group of groupsForUser) {
      if (!groupByIdLookup[group.id]) {
        // Haven't seen this group before
        groupByIdLookup[group.id] = group;

        if (group._type === constants.ENTITY_TYPE_USER_GROUP) {
          newOktaGroups.push(group);
        } else {
          newAppGroups.push(group);
        }

        newAccountGroupRelationships.push(
          converters.convertOktaAccountGroupRelationship(account, group),
        );
      }

      newUserGroupRelationships.push(
        converters.convertOktaUserGroupRelationship(user, group),
      );
    }
  }

  await jobs.logEvent(
    "query_end",
    "Successfully queried for user groups from Okta.",
  );

  await jobs.logEvent(
    "query_start",
    "Querying for Okta application user/group assignments...",
  );

  for (const application of newApplications) {
    newAccountApplicationRelationships.push(
      converters.convertOktaAccountApplicationRelationship(
        account,
        application,
      ),
    );

    for (const relationship of await listAllApplicationUserAssignments(
      executionContext,
      application,
    )) {
      newApplicationUserRelationships.push(relationship);
    }

    for (const relationship of await listAllApplicationGroupAssignments(
      executionContext,
      application,
    )) {
      newApplicationGroupRelationships.push(relationship);
    }
  }

  await jobs.logEvent(
    "query_end",
    "Successfully queried for application assignments from Okta.",
  );

  logger.info(
    {
      accountId: instance.accountId,

      // Accounts
      oldAccountsLength: oldAccounts.length,
      newAccountsLength: newAccounts.length,

      // Users
      oldUsersLength: oldUsers.length,
      newUsersLength: newUsers.length,

      // Factors
      oldFactorsLength: oldFactors.length,
      newFactorsLength: newFactors.length,

      // Okta managed Groups
      oldOktaGroupsLength: oldOktaGroups.length,
      newOktaGroupsLength: newOktaGroups.length,

      // Non-Okta managed Groups (groups managed by external applications)
      oldAppGroupsLength: oldAppGroups.length,
      newAppGroupsLength: newAppGroups.length,

      // Applications
      oldApplicationsLength: oldApplications.length,
      newApplicationsLength: newApplications.length,

      // Account -> Group
      oldAccountGroupRelationshipsLength: oldAccountGroupRelationships.length,
      newAccountGroupRelationshipsLength: newAccountGroupRelationships.length,

      // Group -> User
      oldUserGroupRelationshipsLength: oldUserGroupRelationships.length,
      newUserGroupRelationshipsLength: newUserGroupRelationships.length,

      // Application -> User
      oldApplicationUserRelationshipsLength:
        oldApplicationUserRelationships.length,
      newApplicationUserRelationshipsLength:
        newApplicationUserRelationships.length,

      // Application -> Group
      oldApplicationGroupRelationshipsLength:
        oldApplicationGroupRelationships.length,
      newApplicationGroupRelationshipsLength:
        newApplicationGroupRelationships.length,

      // User -> Factor
      oldUserFactorRelationshipsLength: oldUserFactorRelationships.length,
      newUserFactorGroupRelationshipsLength: newUserFactorRelationships.length,
    },
    "Data fetched and ready to diff",
  );

  // Process `okta_account` entities
  entityOperations = entityOperations.concat(
    persister.processEntities(oldAccounts, newAccounts),
  );

  // Process `okta_service` entities
  entityOperations = entityOperations.concat(
    persister.processEntities(oldServices, newServices),
  );

  // Process `okta_account` -> `okta_user_group` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldAccountServiceRelationships,
      newAccountServiceRelationships,
    ),
  );

  // Process `okta_user` entities
  entityOperations = entityOperations.concat(
    persister.processEntities(oldUsers, newUsers),
  );

  // Process `mfa_device` entities
  entityOperations = entityOperations.concat(
    persister.processEntities(oldFactors, newFactors),
  );

  // Process `okta_user_group` entities (groups managed by Okta)
  entityOperations = entityOperations.concat(
    persister.processEntities(oldOktaGroups, newOktaGroups),
  );

  // Process `okta_app_user_group` entities (groups not managed by Okta)
  entityOperations = entityOperations.concat(
    persister.processEntities(oldAppGroups, newAppGroups),
  );

  // Process `okta_application` entities
  entityOperations = entityOperations.concat(
    persister.processEntities(oldApplications, newApplications),
  );

  // Process `okta_account` -> `okta_user_group` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldAccountGroupRelationships,
      newAccountGroupRelationships,
    ),
  );

  // Process `okta_user_group` -> `okta_user` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldUserGroupRelationships,
      newUserGroupRelationships,
    ),
  );

  // Process `okta_account` -> `okta_application` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldAccountApplicationRelationships,
      newAccountApplicationRelationships,
    ),
  );

  // Process `okta_application` -> `okta_user` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldApplicationUserRelationships,
      newApplicationUserRelationships,
    ),
  );

  // Process `okta_application` -> `okta_user_group` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldApplicationGroupRelationships,
      newApplicationGroupRelationships,
    ),
  );

  // Process `okta_user` -> `mfa_device` relationships
  relationshipOperations = relationshipOperations.concat(
    persister.processRelationships(
      oldUserFactorRelationships,
      newUserFactorRelationships,
    ),
  );

  await jobs.logEvent("work_end", "Successfully processed Okta resources.");

  return [entityOperations, relationshipOperations];
}
