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
  applicationUsers: OktaApplicationUser[];
}

export interface OktaApplicationCacheEntry {
  key: string;
  data?: OktaApplicationCacheData;
}

export interface OktaCacheState {
  fetchCompleted: boolean;
}
