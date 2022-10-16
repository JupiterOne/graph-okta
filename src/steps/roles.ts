import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  parseTimePropertyValue,
  Entity,
  JobState,
  IntegrationLogger,
} from '@jupiterone/integration-sdk-core';
import pMap from 'p-map';
import { APIClient, createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  OktaRole,
  OktaRoleAssignmentType,
  OktaRoleStatus,
} from '../okta/types';
import { batchIterateEntities } from '../util/jobState';
import { Entities, Relationships, Steps } from './constants';

function generateRoleKey(role: OktaRole) {
  // We don't have an easy to use key, so construct one of our own.  Finally, we
  // perform a replace to get rid of any spaces that came in on the label or type.
  return (Entities.ROLE._type + ':' + role.label).replace(/ /g, '');
}

function createRoleEntity(role: OktaRole) {
  return createIntegrationEntity({
    entityData: {
      source: role,
      assign: {
        _key: generateRoleKey(role),
        _type: Entities.ROLE._type,
        _class: Entities.ROLE._class,
        id: role.id,
        description: role.description,
        name: role.label,
        displayName: role.label,
        roleType: role.type,
        status: role.status.toLowerCase(), //example: 'ACTIVE' or 'INACTIVE'
        active: role.status === OktaRoleStatus.ACTIVE,
        superAdmin: role.type === 'SUPER_ADMIN',
        createdOn: parseTimePropertyValue(role.created)!,
        lastUpdatedOn: parseTimePropertyValue(role.lastUpdated)!,
      },
    },
  });
}

export async function fetchRoles(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { instance, logger, jobState } = context;
  const apiClient = createAPIClient(instance.config, logger);

  await batchIterateEntities({
    context,
    batchSize: 1000,
    filter: { _type: Entities.USER._type },
    async iteratee(userEntities) {
      const iterateUserEntitiesBatchStartTime = Date.now();

      logger.info(
        {
          userEntities: userEntities.length,
        },
        'Iterating batch of user entities',
      );

      const rolesForUserGroupEntities = await collectRolesForUserEntities(
        apiClient,
        userEntities,
      );

      for (const { userEntity, roles } of rolesForUserGroupEntities) {
        for (const role of roles) {
          await createOktaUserRoleGraph({ jobState, logger, userEntity, role });
        }
      }

      const iterateUserEntitiesBatchTotalTime =
        Date.now() - iterateUserEntitiesBatchStartTime;

      logger.info(
        {
          iterateUserEntitiesBatchTotalTime,
          numGroupEntities: userEntities.length,
          iterateUserEntitiesBatchStartTime,
        },
        'Finished iterating batch of user entities',
      );
    },
  });
}

export async function buildGroupRoleRelationships(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { instance, logger, jobState } = context;
  const apiClient = createAPIClient(instance.config, logger);

  await batchIterateEntities({
    context,
    batchSize: 1000,
    filter: { _type: Entities.USER_GROUP._type },
    async iteratee(userGroupEntities) {
      const iterateUserGroupEntitiesBatchStartTime = Date.now();

      logger.info(
        {
          userGroupEntities: userGroupEntities.length,
        },
        'Iterating batch of user group entities',
      );

      const rolesForUserGroupEntities = await collectRolesForGroupEntities(
        apiClient,
        userGroupEntities,
      );

      for (const { groupEntity, roles } of rolesForUserGroupEntities) {
        for (const role of roles) {
          await createOktaUserGroupRoleGraph({
            jobState,
            groupEntity,
            role,
          });
        }
      }

      const iterateUserGroupEntitiesBatchTotalTime =
        Date.now() - iterateUserGroupEntitiesBatchStartTime;

      logger.info(
        {
          iterateUserGroupEntitiesBatchTotalTime,
          numUserGroupEntities: userGroupEntities.length,
          iterateUserGroupEntitiesBatchStartTime,
        },
        'Finished iterating batch of user group entities',
      );
    },
  });
}

async function createOktaUserRoleGraph({
  userEntity,
  role,
  jobState,
  logger,
}: {
  jobState: JobState;
  logger: IntegrationLogger;
  userEntity: Entity;
  role: OktaRole;
}) {
  let roleEntity = await jobState.findEntity(generateRoleKey(role));

  if (!roleEntity) {
    roleEntity = await jobState.addEntity(createRoleEntity(role));
  }

  // Only create relationships if this is a direct USER assignment
  if (role.assignmentType !== OktaRoleAssignmentType.USER) return;

  // Users may have already been granted access to the same role via multiple different groups.
  // We need to catch these duplicates to prevent key collisions.
  const userToRoleRelationship = createDirectRelationship({
    _class: RelationshipClass.ASSIGNED,
    from: userEntity,
    to: roleEntity,
  });

  if (!jobState.hasKey(userToRoleRelationship._key)) {
    await jobState.addRelationship(userToRoleRelationship);
  } else {
    logger.info(
      { userToRoleRelationship },
      'Skipping relationship creation.  Relationship already exists.',
    );
  }
}

async function createOktaUserGroupRoleGraph({
  jobState,
  groupEntity,
  role,
}: {
  jobState: JobState;
  groupEntity: Entity;
  role: OktaRole;
}) {
  let roleEntity = await jobState.findEntity(generateRoleKey(role));

  if (!roleEntity) {
    roleEntity = await jobState.addEntity(createRoleEntity(role));
  }

  await jobState.addRelationship(
    createDirectRelationship({
      _class: RelationshipClass.ASSIGNED,
      from: groupEntity,
      to: roleEntity,
    }),
  );
}

async function collectRolesForUserEntities(
  apiClient: APIClient,
  userEntities: Entity[],
) {
  return await pMap(
    userEntities,
    async (userEntity) => {
      const roles: OktaRole[] = [];

      await apiClient.iterateRolesByUser(userEntity._key, async (role) => {
        roles.push(role);
        return Promise.resolve();
      });

      return { userEntity, roles };
    },
    {
      concurrency: 10,
    },
  );
}

async function collectRolesForGroupEntities(
  apiClient: APIClient,
  groupEntities: Entity[],
) {
  return await pMap(
    groupEntities,
    async (groupEntity) => {
      const roles: OktaRole[] = [];

      await apiClient.iterateRolesByGroup(groupEntity._key, async (role) => {
        roles.push(role);
        return Promise.resolve();
      });

      return { groupEntity, roles };
    },
    {
      concurrency: 10,
    },
  );
}

export const roleSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.ROLES,
    name: 'Fetch Roles',
    entities: [Entities.ROLE],
    relationships: [Relationships.USER_ASSIGNED_ROLE],
    dependsOn: [Steps.USERS, Steps.GROUPS],
    executionHandler: fetchRoles,
  },
  {
    id: Steps.BUILD_GROUP_ROLE_RELATIONSHIPS,
    name: 'Build group role relationships',
    entities: [Entities.ROLE],
    relationships: [Relationships.GROUP_ASSIGNED_ROLE],
    dependsOn: [Steps.GROUPS, Steps.ROLES],
    executionHandler: buildGroupRoleRelationships,
  },
];
