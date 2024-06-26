import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
  parseTimePropertyValue,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { Role } from '@okta/okta-sdk-nodejs';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { Entities, IngestionSources, Relationships, Steps } from './constants';
import { buildBatchProcessing } from '../util/buildBatchProcessing';
import { StandardizedOktaUser, StandardizedOktaUserGroup } from '../types';

function generateRoleKey(role: Role) {
  // We don't have an easy to use key, so construct one of our own.  Finally, we
  // perform a replace to get rid of any spaces that came in on the label or type.
  return (Entities.ROLE._type + ':' + role.label).replace(/ /g, '');
}

function createRoleEntity(role: Role) {
  if (!role.label) {
    return;
  }

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
        status: role.status?.toLowerCase(), //example: 'ACTIVE' or 'INACTIVE'
        active: role.status === 'ACTIVE',
        superAdmin: role.type === 'SUPER_ADMIN',
        createdOn: parseTimePropertyValue(role.created),
        lastUpdatedOn: parseTimePropertyValue(role.lastUpdated),
      },
    },
  });
}

export async function fetchRoles({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const processUserRoles = async (user: StandardizedOktaUser) => {
    await apiClient.iterateRolesByUser(user._key, async (role) => {
      const roleEntity = createRoleEntity(role);
      if (!roleEntity) {
        return;
      }

      if (!jobState.hasKey(roleEntity._key)) {
        await jobState.addEntity(roleEntity);
      }

      // Only create relationships if this is a direct USER assignment
      if (role.assignmentType !== 'USER') {
        return;
      }
      // Users may have already been granted access to the same role via multiple different groups.
      // We need to catch these duplicates to prevent key collisions.
      const userToRoleRelationship = createDirectRelationship({
        _class: RelationshipClass.ASSIGNED,
        from: user,
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
    });
  };

  const processUserGroupRoles = async (group: StandardizedOktaUserGroup) => {
    await apiClient.iterateRolesByGroup(group._key, async (role) => {
      const roleEntity = createRoleEntity(role);
      if (!roleEntity) {
        return;
      }
      if (!jobState.hasKey(roleEntity._key)) {
        await jobState.addEntity(roleEntity);
      }

      const groupRoleRelationship = createDirectRelationship({
        _class: RelationshipClass.ASSIGNED,
        from: group,
        to: roleEntity,
      });

      if (!jobState.hasKey(groupRoleRelationship._key)) {
        await jobState.addRelationship(groupRoleRelationship);
      }
    });
  };

  try {
    const { withBatchProcessing, flushBatch } =
      buildBatchProcessing<StandardizedOktaUser>({
        processCallback: processUserRoles,
        batchSize: 200,
        concurrency: 4,
      });
    await jobState.iterateEntities(
      {
        _type: Entities.USER._type,
      },
      async (user: StandardizedOktaUser) => {
        await withBatchProcessing(user);
      },
    );
    await flushBatch();
  } catch (err) {
    if (err.status === 403) {
      logger.publishWarnEvent({
        name: IntegrationWarnEventName.MissingPermission,
        description: 'The API key does not have access to fetch user roles.',
      });
    } else {
      throw err;
    }
  }

  try {
    const { withBatchProcessing, flushBatch } =
      buildBatchProcessing<StandardizedOktaUserGroup>({
        processCallback: processUserGroupRoles,
        batchSize: 200,
        concurrency: 4,
      });
    await jobState.iterateEntities(
      {
        _type: Entities.USER_GROUP._type,
      },
      async (group: StandardizedOktaUserGroup) => {
        await withBatchProcessing(group);
      },
    );
    await flushBatch();
  } catch (err) {
    if (err.status === 403) {
      logger.publishWarnEvent({
        name: IntegrationWarnEventName.MissingPermission,
        description: 'The API key does not have access to fetch group roles.',
      });
    } else {
      throw err;
    }
  }
}

export const roleSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.ROLES,
    ingestionSourceId: IngestionSources.ROLES,
    name: 'Fetch Roles',
    entities: [Entities.ROLE],
    relationships: [
      Relationships.USER_ASSIGNED_ROLE,
      Relationships.GROUP_ASSIGNED_ROLE,
    ],
    dependsOn: [Steps.USERS, Steps.GROUPS],
    executionHandler: fetchRoles,
  },
];
