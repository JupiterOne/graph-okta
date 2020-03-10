import { EntityFromIntegration } from "@jupiterone/jupiter-managed-integration-sdk";

export interface StandardizedOktaAccount extends EntityFromIntegration {
  name: string;
  accountId: string;
  webLink: string;
}

export interface StandardizedOktaService extends EntityFromIntegration {
  name: string;
  category: string;
  function: string;
  controlDomain: string;
}

export interface StandardizedOktaUser extends EntityFromIntegration {
  id: string;
  name: string;
  displayName?: string;
  status: string;
  active: boolean;
  created: number;
  activated: number;
  statusChanged?: number;
  lastLogin?: number;
  lastUpdated: number;
  passwordChanged?: number;
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
}

export interface StandardizedOktaUserGroup extends EntityFromIntegration {
  id: string;
  displayName?: string;
  created: number;
  lastUpdated: number;
  lastMembershipUpdated: number;
  objectClass?: string[];
  type: string;
  name: string;
  description: string;
}

export interface StandardizedOktaApplication extends EntityFromIntegration {
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

export interface StandardizedOktaFactor extends EntityFromIntegration {
  active: boolean;
  id: string;
  factorType: string;
  provider: string;
  vendorName?: string;
  device?: string;
  deviceType?: string;
  status: string;
  created: string;
  lastUpdated: string;
}
