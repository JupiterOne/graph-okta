export interface OktaUserGroupProfile {
  name: string;
  description: string;
}

export interface OktaUserGroup {
  id: string;
  created: Date;
  lastUpdated: Date;
  lastMembershipUpdated: Date;
  objectClass: string[];
  type: string;
  profile: OktaUserGroupProfile;
  _links?: any;
}
