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
 * object.
 */
export interface OktaClient {
  orgUrl: string;
  token: string;
  cacheStore: any;
  close: () => void;
  listGroups: () => Promise<OktaCollection<OktaUserGroup>>;
  listUsers: () => Promise<OktaCollection<OktaUser>>;
  listUserGroups: (userId: string) => Promise<OktaCollection<OktaUserGroup>>;
  listApplications: () => Promise<OktaCollection<OktaApplication>>;
  listApplicationUsers: (
    appId: string,
  ) => Promise<OktaCollection<OktaApplicationUser>>;
  listApplicationGroupAssignments: (
    appId: string,
  ) => Promise<OktaCollection<OktaApplicationGroup>>;
  listFactors: (userId: string) => Promise<OktaCollection<OktaFactor>>;
}
