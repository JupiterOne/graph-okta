export interface OktaUserGroupProfile {
  name: string;
  description: string;
  role?: string;
  samlRoles?: string[];
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
