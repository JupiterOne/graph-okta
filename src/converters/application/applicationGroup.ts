import {
  Relationship,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';
import { OktaApplicationGroup } from '../../okta/types';
import { StandardizedOktaApplication } from '../../types';
import { Relationships } from '../../steps/constants';
import { convertAWSRolesToRelationships, getRole, getRoles } from './utils';

export function createApplicationGroupRelationships(
  application: StandardizedOktaApplication,
  group: OktaApplicationGroup,
  onInvalidRoleFormat: (invalidRole: any) => void,
): Relationship[] {
  const relationships: Relationship[] = [];

  const relationship: Relationship = createDirectRelationship({
    _class: Relationships.GROUP_ASSIGNED_APPLICATION._class,
    fromKey: group.id,
    // Actually okta_user_group or okta_app_user_group.
    // See `createUserGroupEntity`.
    fromType: 'okta_group',
    toKey: application._key,
    toType: application._type,
    properties: {
      // Override generated values for _key, _type to maintain
      // values before migration to new SDK
      _key: `${group.id}|assigned|${application._key}`,
      _type: Relationships.GROUP_ASSIGNED_APPLICATION._type,

      applicationId: application.id,
      groupId: group.id,
      // Array property not supported on the edge in Neptune
      roles: getRoles(group),
      role: getRole(group),
    },
  });

  if (application.awsAccountId) {
    relationships.push(
      ...convertAWSRolesToRelationships(
        application,
        group,
        Relationships.USER_GROUP_ASSIGNED_AWS_IAM_ROLE._type,
        onInvalidRoleFormat,
      ),
    );
  }

  relationships.push(relationship);

  return relationships;
}
