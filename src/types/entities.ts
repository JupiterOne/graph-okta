import { Entity } from '@jupiterone/integration-sdk-core';

export interface StandardizedOktaAccount extends Entity {
  name: string;
  accountId: string;
  webLink: string;
}

export interface StandardizedOktaService extends Entity {
  name: string;
  category: string[];
  function: string[];
  controlDomain: string;
}

export interface StandardizedOktaUser extends Entity {
  id: string;
  name: string;
  displayName?: string;
  status: string;
  active: boolean;
  created: number;
  createdOn: number;
  activated: number;
  activatedOn: number;
  statusChanged?: number;
  statusChangedOn?: number;
  lastLogin?: number;
  lastLoginOn?: number;
  lastUpdated: number;
  lastUpdatedOn: number;
  passwordChanged?: number;
  passwordChangedOn?: number;
  username: string;
  firstName: string;
  lastName: string;
  mobilePhone: string;
  secondEmail: string;
  login: string;
  tenant: string[];
  email: string;
  location?: string;
  title?: string;
  userType?: string;
  employeeType?: string;
  employeeNumber?: string;
  manager?: string;
  managerId?: string;
  generic?: boolean;
  bitbucketUsername?: string;
  githubUsername?: string;
  verifiedEmails?: string[];
  unverifiedEmails?: string[];
  countryCode?: string;
}

export interface StandardizedOktaUserGroup extends Entity {
  id: string;
  displayName?: string;
  created: number;
  createdOn: number;
  lastUpdated: number;
  lastUpdatedOn: number;
  lastMembershipUpdated: number;
  lastMembershipUpdatedOn: number;
  objectClass?: string[];
  type: string;
  name: string;
  description?: string;
}

export interface StandardizedOktaApplication extends Entity {
  isMultiInstanceApp: boolean;
  isSAMLApp: boolean;
  appVendorName?: string;
  appAccountType?: string | string[];
  appAccountId?: string;
  id: string;
  name: string;
  shortName: string;
  label: string;
  status: string;
  active: boolean;
  lastUpdated: string;
  created: string;
  features?: string[];
  signOnMode: string;
  awsIdentityProviderArn?: string;
  awsAccountId?: string;
  awsEnvironmentType?: string;
  awsGroupFilter?: string;
  awsRoleValuePattern?: string;
  awsJoinAllRoles?: boolean;
  awsSessionDuration?: number;
  githubOrg?: string;
  appDomain?: string;
  imageUrl?: string;
  loginUrl?: string;
}

export interface StandardizedOktaFactor extends Entity {
  active: boolean;
  id: string;
  type?: string | null;
  factorType: string;
  provider: string;
  vendorName?: string;
  device?: string;
  deviceType?: string;
  status: string;
  created: string;
  lastUpdated: string;
  lastVerifiedOn?: number;
  authenticatorName?: string;
}
