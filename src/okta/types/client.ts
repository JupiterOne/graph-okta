import {
  OktaApplication,
  OktaApplicationGroup,
  OktaApplicationUser,
} from "./applications";
import { OktaFactor } from "./devices";
import { OktaUserGroup } from "./groups";
import { OktaUser } from "./users";

export interface OktaCollection<T> {
  each: (cb: (item: T) => void) => any;
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
  listUsers: () => Promise<OktaCollection<OktaUser>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/users/#get-member-groups
  listUserGroups: (userId: string) => Promise<OktaCollection<OktaUserGroup>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-applications
  listApplications: () => Promise<OktaCollection<OktaApplication>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-users-assigned-to-application
  listApplicationUsers: (
    appId: string,
  ) => Promise<OktaCollection<OktaApplicationUser>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/apps/#list-groups-assigned-to-application
  listApplicationGroupAssignments: (
    appId: string,
  ) => Promise<OktaCollection<OktaApplicationGroup>>;

  // [API Endpoint]: https://developer.okta.com/docs/api/resources/factors/#list-enrolled-factors
  listFactors: (userId: string) => Promise<OktaCollection<OktaFactor>>;
}
