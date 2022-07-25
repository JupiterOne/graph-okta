import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { Entities, Relationships, Steps } from './constants';

export async function fetchRoles({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  await jobState.iterateEntities(
    {
      _type: Entities.USER._type,
    },
    async (user) => {
      await apiClient.iterateRolesByUser(user._key, async (role) => {
        let roleEntity = await jobState.findEntity(
          Entities.ROLE._type + ':' + role.label + ':' + role.assignmentType,
        );
        if (!roleEntity) {
          roleEntity = await jobState.addEntity(
            createIntegrationEntity({
              entityData: {
                source: role,
                assign: {
                  _key:
                    Entities.ROLE._type +
                    ':' +
                    role.label +
                    ':' +
                    role.assignmentType,
                  _type: Entities.ROLE._type,
                  _class: Entities.ROLE._class,
                  id: role.id,
                  description: role.description,
                  name: role.label,
                  displayName: role.label,
                  roleType: role.type,
                  status: role.status, //example: 'ACTIVE' or 'INACTIVE'
                  created: parseTimePropertyValue(role.created)!,
                  createdOn: parseTimePropertyValue(role.created)!,
                  lastUpdated: parseTimePropertyValue(role.lastUpdated)!,
                  lastUpdatedOn: parseTimePropertyValue(role.lastUpdated)!,
                },
              },
            }),
          );
        }

        await jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.ASSIGNED,
            from: user,
            to: roleEntity,
          }),
        );
      });
    },
  );

  await jobState.iterateEntities(
    {
      _type: Entities.USER_GROUP._type,
    },
    async (group) => {
      await apiClient.iterateRolesByGroup(group._key, async (role) => {
        let roleEntity = await jobState.findEntity(
          Entities.ROLE._type + ':' + role.label + ':' + role.assignmentType,
        );
        if (!roleEntity) {
          roleEntity = await jobState.addEntity(
            createIntegrationEntity({
              entityData: {
                source: role,
                assign: {
                  _key:
                    Entities.ROLE._type +
                    ':' +
                    role.label +
                    ':' +
                    role.assignmentType,
                  _type: Entities.ROLE._type,
                  _class: Entities.ROLE._class,
                  id: role.id,
                  description: role.description,
                  name: role.label,
                  displayName: role.label,
                  roleType: role.type,
                  status: role.status, //example: 'ACTIVE' or 'INACTIVE'
                  created: parseTimePropertyValue(role.created)!,
                  createdOn: parseTimePropertyValue(role.created)!,
                  lastUpdated: parseTimePropertyValue(role.lastUpdated)!,
                  lastUpdatedOn: parseTimePropertyValue(role.lastUpdated)!,
                },
              },
            }),
          );
        }

        await jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.ASSIGNED,
            from: group,
            to: roleEntity,
          }),
        );
      });
    },
  );
}

export const roleSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.ROLES,
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
