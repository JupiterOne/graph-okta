import * as url from 'url';

import { OktaUserGroup } from '../okta/types';
import { OktaIntegrationConfig, StandardizedOktaUserGroup } from '../types';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';
import getTime from '../util/getTime';

/**
 * The entity type for Okta user groups having `type: 'OKTA_GROUP'` or
 * `type: 'BUILT_IN'`.
 *
 * See https://developer.okta.com/docs/api/resources/groups#group-type
 */
import {
  USER_GROUP_ENTITY_TYPE,
  APP_USER_GROUP_ENTITY_TYPE,
} from '../okta/constants';

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
    type === 'APP_GROUP' ? APP_USER_GROUP_ENTITY_TYPE : USER_GROUP_ENTITY_TYPE;

  const entity: StandardizedOktaUserGroup = {
    _key: data.id,
    _type: entityType,
    _class: 'UserGroup',
    _rawData: [{ name: profileName, rawData: data }],
    id,
    webLink,
    displayName: profileName,
    created: getTime(created)!,
    createdOn: getTime(created)!,
    lastUpdated: getTime(lastUpdated)!,
    lastUpdatedOn: getTime(lastUpdated)!,
    lastMembershipUpdated: getTime(lastMembershipUpdated)!,
    lastMembershipUpdatedOn: getTime(lastMembershipUpdated)!,
    objectClass,
    type,
    name: profileName,
    description: profileDescription ? profileDescription : undefined,
  };

  return entity;
}
