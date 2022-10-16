import {
  OktaApplication,
  OktaApplicationGroup,
  OktaApplicationUser,
} from './applications';
import { OktaFactor } from './devices';
import { OktaUserGroup } from './groups';
import { OktaUser } from './users';
import { OktaRule } from './rules';
import { OktaRole } from './roles';
import { OktaLogEvent } from './logs';
import { OrgOktaSupportSettingsObj } from './support';
import { RequestExecutorWithEarlyRateLimiting } from '../createOktaClient';

export interface OktaCollection<T> {
  /**
   * The unprocessed items of the collection, reduced by one during the
   * iteration of `each`. When this reaches `length === 0`, another page will be
   * fetched. The `each(cb)` should return `false` to avoid fetching another
   * page.
   */
  currentItems: T[];

  /**
   * The initial URI of the resource collection, or the `next` rel link provided
   * in the response, which may be `undefined`. After the first request, if this
   * is `undefined`, it means there is are no more pages to fetch.
   */
  nextUri?: string;

  each: (cb: (item: T) => void) => Promise<void>;
}

export interface OktaQueryParams {
  q?: string;
  after?: string;
  limit?: string;
  filter?: string;
  format?: string;
  search?: string;
  since?: string;
  expand?: string;
}

/**
 * Provides a TypeScript definition for the `@okta/okta-sdk-nodejs` client
 * object. These functions are generated in the client.
 *
 * See https://github.com/okta/okta-sdk-nodejs/blob/master/src/generated-client.js.
 */
export interface OktaClient {
  requestExecutor: RequestExecutorWithEarlyRateLimiting;
  orgUrl: string;
  token: string;
  cacheStore: any;
  close: () => void;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/groups/#list-groups
  listGroups: () => OktaCollection<OktaUserGroup>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/groups/#list-group-members
  listGroupUsers: (
    groupId: string,
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaUser>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/users.html#list-users
  listUsers: (queryParameters?: OktaQueryParams) => OktaCollection<OktaUser>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/users/#get-member-groups
  listUserGroups: (
    userId: string,
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaUserGroup>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-applications
  listApplications: (
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaApplication>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-users-assigned-to-application
  listApplicationUsers: (
    appId: string,
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaApplicationUser>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-groups-assigned-to-application
  listApplicationGroupAssignments: (
    appId: string,
  ) => OktaCollection<OktaApplicationGroup>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/factors/#list-enrolled-factors
  listFactors: (
    userId: string,
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaFactor>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/groups/#list-group-rules
  listGroupRules: (
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaRule>;

  // [API Endpoint]: https://developer.okta.com/docs/reference/api/org/#okta-support-operations
  getOrgOktaSupportSettings: () => Promise<OrgOktaSupportSettingsObj>;

  // [API Endpoint]: https://developer.okta.com/docs/reference/api/roles/#list-roles-2
  listAssignedRolesForUser: (
    userId: string,
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaRole>;

  // [API Endpoint]: https://developer.okta.com/docs/reference/api/roles/#list-roles-assigned-to-a-group
  listGroupAssignedRoles: (
    groupId: string,
    queryParameters?: OktaQueryParams,
  ) => OktaCollection<OktaRole>;

  // [API Endpoint]: https://developer.okta.com/docs/reference/api/system-log/#get-started
  getLogs: (queryParameters?: OktaQueryParams) => OktaCollection<OktaLogEvent>;
}
