import * as url from 'url';

import {
  createDirectRelationship,
  createIntegrationEntity,
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
import { Entities, Relationships } from '../steps/constants';
import { OktaIntegrationConfig, StandardizedOktaUserGroup } from '../types';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';
import { Group } from '@okta/okta-sdk-nodejs';

export function createUserGroupEntity(
  config: OktaIntegrationConfig,
  data: Group,
): StandardizedOktaUserGroup | null {
  if (!data.id) {
    return null;
  }

  const {
    id,
    created,
    lastUpdated,
    lastMembershipUpdated,
    objectClass,
    type,
    profile,
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
        _key: id,
        _type: entityType,
        _class: 'UserGroup',
        id,
        webLink,
        displayName: profile?.name ?? id,
        created: parseTimePropertyValue(created)!,
        createdOn: parseTimePropertyValue(created)!,
        lastUpdated: parseTimePropertyValue(lastUpdated)!,
        lastUpdatedOn: parseTimePropertyValue(lastUpdated)!,
        lastMembershipUpdated: parseTimePropertyValue(lastMembershipUpdated)!,
        lastMembershipUpdatedOn: parseTimePropertyValue(lastMembershipUpdated)!,
        objectClass,
        type,
        name: profile?.name,
        description: profile?.description ? profile.description : undefined,
      },
    },
  }) as StandardizedOktaUserGroup;
}

export function createGroupUserRelationship(
  groupKey: string,
  userKey: string,
): Relationship {
  return createDirectRelationship({
    _class: RelationshipClass.HAS,
    fromType: Entities.USER_GROUP._type,
    fromKey: groupKey,
    toType: Entities.USER._type,
    toKey: userKey,
    properties: {
      _key: `${groupKey}|has_user|${userKey}`,
      _type: Relationships.USER_GROUP_HAS_USER._type,
      userId: userKey,
      groupId: groupKey,
    },
  });
}
