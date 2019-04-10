import {
  EntityFromIntegration,
  GraphClient,
  IntegrationExecutionContext,
  IntegrationInvocationEvent,
  JobsClient,
  PersisterClient,
  RelationshipFromIntegration,
  RelationshipMapping,
} from "@jupiterone/jupiter-managed-integration-sdk";

export interface OktaExecutionContext
  extends IntegrationExecutionContext<IntegrationInvocationEvent> {
  okta: OktaClient;
  jobs: JobsClient;
  graph: GraphClient;
  persister: PersisterClient;
}

export interface OktaIntegrationConfig {
  oktaApiKey: string;
  oktaOrgUrl: string;
}

export interface OktaCollection<T> {
  each: (cb: (item: T) => void) => any;
}

export interface ListApplicationsQueryParams {
  q?: string;
  after?: string;
  limit?: string;
  filter?: string;
  expand?: string;
  includeNonDeleted?: string;
}

export interface OktaClient {
  orgUrl: string;
  token: string;
  cacheStore: any;
  close: () => void;
  listUsers: () => Promise<OktaCollection<OktaUser>>;
  listUserGroups: (userId: string) => Promise<OktaCollection<OktaUserGroup>>;
  listApplications: () => Promise<OktaCollection<OktaApplication>>;
  listApplicationUsers: (appId: string) => Promise<OktaCollection<OktaUser>>;
  listApplicationGroupAssignments: (
    appId: string,
  ) => Promise<OktaCollection<OktaUserGroup>>;
  listFactors: (userId: string) => Promise<OktaCollection<OktaFactor>>;
}

export interface OktaAccountInfo {
  name: string;
  preview: boolean;
}

export interface OktaUserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  mobilePhone: string;
  secondEmail: string;
  login: string;
  tenant: string[];
  email: string;
  userType?: string;
  employeeType?: string;
  employeeNumber?: string;
  manager?: string;
  managerId?: string;
  generic?: boolean;
  role?: string;
  samlRoles?: string[];
  bitbucketUsername?: string;
  githubUsername?: string;
}

// tslint:disable-next-line:no-empty-interface
export interface OktaPasswordCredential {}

export interface OktaRecoveryQuestionCredential {
  question: string;
}

export interface OktaAuthenticationIntegration {
  type: string;
  name: string;
}

export interface OktaEmailCredential {
  value: string;
  // TODO: Change these to Enums when the Okta documentation
  // actually lists the values...
  status: string;
  type: string;
}

export interface OktaUserCredentials {
  password: OktaPasswordCredential;
  recovery_question: OktaRecoveryQuestionCredential;
  integration: OktaAuthenticationIntegration;
  emails: OktaEmailCredential[];
}

export interface OktaUser {
  id: string;
  status: string;
  created: Date;
  activated: Date;
  statusChanged: Date;
  lastLogin: Date;
  lastUpdated: Date;
  passwordChanged: Date;
  profile: OktaUserProfile;
  credentials: OktaUserCredentials;
  _links?: any;
}

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

export interface AppSettings {
  [key: string]: any;
}
export interface OktaApplicationSettings {
  app: AppSettings;
  notifications: any;
  signOn: any;
}

export interface OktaApplicationLink {
  href: string;
  type?: string;
  name?: string;
}
export interface OktaApplicationLinks {
  [key: string]: OktaApplicationLink | OktaApplicationLink[];
}

export interface OktaApplication {
  id: string;
  name: string;
  label: string;
  status: string;
  lastUpdated: string;
  created: string;
  signOnMode: string;
  accessibility: any;
  visibility: any;
  features: string[];
  settings: OktaApplicationSettings;
  links: OktaApplicationLinks;
}

export interface OktaFactor {
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

/**
 * Okta returns back nested objects in API calls. Due to the nature of using a
 * Graph database, we need to flatten these objects, so that all properties are
 * at the top level.
 */
export interface FlattenedOktaUser extends OktaUserProfile {
  id: string;
  name: string;
  displayName?: string;
  status: string;
  active: boolean;
  created: Date;
  activated: Date;
  statusChanged: Date;
  lastLogin: Date;
  lastUpdated: Date;
  passwordChanged: Date;
  username: string;
  verifiedEmails?: string[];
  unverifiedEmails?: string[];
}

export interface FlattenedOktaApplication {
  id: string;
  name: string;
  shortName: string;
  label: string;
  status: string;
  active: boolean;
  lastUpdated: string;
  created: string;
  features: string[];
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
}

export interface FlattenedOktaUserGroup {
  id: string;
  displayName?: string;
  created: Date;
  lastUpdated: Date;
  lastMembershipUpdated: Date;
  objectClass: string[];
  type: string;
  profileName: string;
  profileDescription: string;
}

export interface StandardizedOktaUser
  extends FlattenedOktaUser,
    EntityFromIntegration {}

export interface StandardizedOktaUserGroup
  extends FlattenedOktaUserGroup,
    EntityFromIntegration {}

export interface StandardizedOktaUserGroupRelationship
  extends RelationshipFromIntegration {
  userId: string;
  groupId: string;
}

export interface StandardizedOktaAccountApplicationRelationship
  extends RelationshipFromIntegration {
  accountUrl: string;
  applicationId: string;
  applicationName: string;
}

export interface StandardizedOktaAccount extends EntityFromIntegration {
  name: string;
  webLink: string;
}

export interface StandardizedOktaService extends EntityFromIntegration {
  name: string;
  category: string;
  function: string;
  controlDomain: string;
}

export interface StandardizedOktaAccountGroupRelationship
  extends RelationshipFromIntegration {
  accountUrl: string;
  groupId: string;
}

export interface StandardizedOktaApplication
  extends FlattenedOktaApplication,
    EntityFromIntegration {
  isMultiInstanceApp: boolean;
  isSAMLApp: boolean;
  appVendorName?: string;
  appAccountType?: string;
  appAccountId?: string;
}

export interface StandardizedOktaApplicationUserRelationship
  extends RelationshipFromIntegration {
  applicationId: string;
  userId: string;
  userEmail: string;
  roles?: string;
  role?: string;
}

export interface StandardizedOktaApplicationGroupRelationship
  extends RelationshipFromIntegration {
  applicationId: string;
  groupId: string;
  roles?: string;
  role?: string;
}

export interface StandardizedOktaFactor
  extends OktaFactor,
    EntityFromIntegration {
  active: boolean;
}

export interface StandardizedOktaUserFactorRelationship
  extends RelationshipFromIntegration {
  userId: string;
  factorId: string;
}

export interface MappedRelationship extends RelationshipFromIntegration {
  _mapping: RelationshipMapping;
}
