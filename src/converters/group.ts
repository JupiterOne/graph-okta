import * as url from 'url';

import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  parseTimePropertyValue,
  Relationship,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

/**
 * The entity type for Okta user groups having `type: 'OKTA_GROUP'` or
 * `type: 'BUILT_IN'`.
 *
 * See https://developer.okta.com/docs/api/resources/groups#group-type
 */
import { OktaUserGroup } from '../okta/types';
import { Entities, Relationships } from '../steps/constants';
import { OktaIntegrationConfig, StandardizedOktaUserGroup } from '../types';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';

export function createUserGroupEntity(
  config: OktaIntegrationConfig,
  data: OktaUserGroup,
): StandardizedOktaUserGroup {
  const {
    id,
    created,
    lastUpdated,
    lastMembershipUpdated,
    objectClass,
    type,
    profile: { name: profileName, description: profileDescription },
  } = data;

  const webLink = url.resolve(
    getOktaAccountAdminUrl(config),
    `/admin/group/${data.id}`,
  );

  const entityType =
    type === 'APP_GROUP'
      ? Entities.APP_USER_GROUP._type
      : Entities.USER_GROUP._type;

  return createIntegrationEntity({
    entityData: {
      source: data,
      assign: {
        _key: data.id,
        _type: entityType,
        _class: 'UserGroup',
        id,
        webLink,
        displayName: profileName,
        created: parseTimePropertyValue(created)!,
        createdOn: parseTimePropertyValue(created)!,
        lastUpdated: parseTimePropertyValue(lastUpdated)!,
        lastUpdatedOn: parseTimePropertyValue(lastUpdated)!,
        lastMembershipUpdated: parseTimePropertyValue(lastMembershipUpdated)!,
        lastMembershipUpdatedOn: parseTimePropertyValue(lastMembershipUpdated)!,
        objectClass,
        type,
        name: profileName,
        description: profileDescription ? profileDescription : undefined,
      },
    },
  }) as StandardizedOktaUserGroup;
}

export function createGroupUserRelationship(
  group: Entity,
  user: Entity,
): Relationship {
  return createDirectRelationship({
    _class: RelationshipClass.HAS,
    from: group,
    to: user,
    properties: {
      _key: `${group._key}|has_user|${user._key}`,
      _type: Relationships.USER_GROUP_HAS_USER._type,
      userId: user.id as string,
      groupId: group.id as string,
    },
  });
}
