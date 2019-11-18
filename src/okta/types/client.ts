import {
  OktaApplication,
  OktaApplicationGroup,
  OktaApplicationUser,
} from "./applications";
import { OktaFactor } from "./devices";
import { OktaUserGroup } from "./groups";
import { OktaUser } from "./users";

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

  each: (cb: (item: T) => void) => any;
}

export interface OktaQueryParams {
  q?: string;
  after?: string;
  limit?: string;
  filter?: string;
  format?: string;
  search?: string;
  expand?: string;
}

/**
 * Provides a TypeScript definition for the `@okta/okta-sdk-nodejs` client
 * object. These functions are generated in the client.
 *
 * See https://github.com/okta/okta-sdk-nodejs/blob/master/src/generated-client.js.
 */
export interface OktaClient {
  orgUrl: string;
  token: string;
  cacheStore: any;
  close: () => void;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/groups/#list-groups
  listGroups: () => Promise<OktaCollection<OktaUserGroup>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/users.html#list-users
  listUsers: (
    queryParameters?: OktaQueryParams,
  ) => Promise<OktaCollection<OktaUser>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/users/#get-member-groups
  listUserGroups: (userId: string) => Promise<OktaCollection<OktaUserGroup>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-applications
  listApplications: (
    queryParameters?: OktaQueryParams,
  ) => Promise<OktaCollection<OktaApplication>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-users-assigned-to-application
  listApplicationUsers: (
    appId: string,
    queryParameters?: OktaQueryParams,
  ) => Promise<OktaCollection<OktaApplicationUser>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-groups-assigned-to-application
  listApplicationGroupAssignments: (
    appId: string,
  ) => Promise<OktaCollection<OktaApplicationGroup>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/factors/#list-enrolled-factors
  listFactors: (userId: string) => Promise<OktaCollection<OktaFactor>>;
}
