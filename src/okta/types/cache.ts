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
  fetchCompleted: boolean;
}
