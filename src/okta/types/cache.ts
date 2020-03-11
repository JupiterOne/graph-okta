import { OktaApplication, OktaFactor, OktaUser, OktaUserGroup } from ".";
import { OktaApplicationGroup, OktaApplicationUser } from "./applications";

export interface OktaUserCacheData {
  user: OktaUser;
  factors: OktaFactor[];
  userGroups: OktaUserGroup[];
}

export interface OktaUserCacheEntry {
  key: string;
  data?: OktaUserCacheData;
}

export interface OktaApplicationCacheData {
  application: OktaApplication;
  applicationGroups: OktaApplicationGroup[];
}

export interface OktaApplicationCacheEntry {
  key: string;
  data?: OktaApplicationCacheData;
}

export interface OktaApplicationUserCacheData {
  applicationId: string;
  applicationUser: OktaApplicationUser;
}

export interface OktaApplicationUserCacheEntry {
  key: string;
  data?: OktaApplicationUserCacheData;
}

export interface OktaCacheState {
  /**
   * Number of resources seen from resource API.
   */
  seen: number;

  /**
   * Number of keys reported by `cache.putEntries()`.
   */
  putEntriesKeys: number;

  fetchCompleted: boolean;

  encounteredAuthorizationError?: boolean;
}
