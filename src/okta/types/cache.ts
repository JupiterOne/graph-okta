import { OktaFactor, OktaUser, OktaUserGroup } from ".";

export interface OktaUserCacheData {
  user: OktaUser;
  factors: OktaFactor[];
  userGroups: OktaUserGroup[];
}

export interface OktaUserCacheEntry {
  key: string;
  data?: OktaUserCacheData;
}

export interface OktaCacheState {
  fetchCompleted: boolean;
}
