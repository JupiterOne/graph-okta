import {
  Relationship,
  RelationshipClass,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';
import { OktaApplicationUser } from '../../okta/types';
import { StandardizedOktaApplication } from '../../types';
import { Entities, Relationships } from '../../steps/constants';
import { convertAWSRolesToRelationships, getRoles } from './utils';

function stringifyIfArray<T>(v: T) {
  return Array.isArray(v) ? JSON.stringify(v) : v;
}

export function createApplicationUserRelationships(
  application: StandardizedOktaApplication,
  user: OktaApplicationUser,
  onInvalidRoleFormat: (invalidRole: any) => void,
): Relationship[] {
  const relationships: Relationship[] = [];

  const relationship: Relationship = createDirectRelationship({
    _class: RelationshipClass.ASSIGNED,
    fromKey: user.id,
    fromType: Entities.USER._type,
    toKey: application._key,
    toType: Entities.APPLICATION._type,
    properties: {
      applicationId: application.id,
      userId: user.id,
      userEmail: user.profile.email,
      // Array property not supported on the edge in Neptune
      roles: getRoles(user),
      role: stringifyIfArray(user.profile.role),
    },
  });

  if (application.awsAccountId) {
    relationships.push(
      ...convertAWSRolesToRelationships(
        application,
        user,
        Relationships.USER_ASSIGNED_AWS_IAM_ROLE._type,
        onInvalidRoleFormat,
      ),
    );
  }

  relationships.push(relationship);

  return relationships;
}
