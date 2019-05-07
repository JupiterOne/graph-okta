export interface OktaUserGroupProfile {
  name: string;
  description: string;
}

export interface OktaUserGroup {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  objectClass: string[];
  type: string;
  profile: OktaUserGroupProfile;
  _links?: any;
}
