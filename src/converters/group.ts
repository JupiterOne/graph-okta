import * as url from "url";

import { OktaUserGroup } from "../okta/types";
import {
  OktaIntegrationConfig,
  StandardizedOktaUser,
  StandardizedOktaUserGroup,
  StandardizedOktaUserGroupRelationship,
} from "../types";
import getOktaAccountAdminUrl from "../util/getOktaAccountAdminUrl";

/**
 * The entity type for Okta user groups having `type: 'OKTA_GROUP'` or
 * `type: 'BUILT_IN'`.
 *
 * See https://developer.okta.com/docs/api/resources/groups#group-type
 */
export const USER_GROUP_ENTITY_TYPE = "okta_user_group";
export const APP_USER_GROUP_ENTITY_TYPE = "okta_app_user_group";

export const GROUP_USER_RELATIONSHIP_TYPE = "okta_group_has_user";

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
    type === "APP_GROUP" ? APP_USER_GROUP_ENTITY_TYPE : USER_GROUP_ENTITY_TYPE;

  const entity = {
    _key: data.id,
    _type: entityType,
    _class: "UserGroup",
    _rawData: [
      {
        name: "default",
        rawData: data,
      },
    ],
    id,
    webLink,
    displayName: profileName,
    created,
    lastUpdated,
    lastMembershipUpdated,
    objectClass,
    type,
    profileName,
    profileDescription,
  };

  return entity;
}

export function createGroupUserRelationship(
  group: StandardizedOktaUserGroup,
  user: StandardizedOktaUser,
): StandardizedOktaUserGroupRelationship {
  return {
    _key: `${group._key}|has_user|${user._key}`,
    _type: GROUP_USER_RELATIONSHIP_TYPE,
    _class: "HAS",
    _fromEntityKey: group._key,
    _toEntityKey: user._key,
    displayName: "HAS",
    userId: user.id,
    groupId: group.id,
  };
}
