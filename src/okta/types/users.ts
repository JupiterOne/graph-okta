import { OktaResource } from '.';

export type OktaPasswordCredential = string;

export interface OktaEmailCredential {
  value: string;
  // TODO: Change these to Enums when the Okta documentation
  // actually lists the values...
  status: string;
  type: string;
}

export interface OktaRecoveryQuestionCredential {
  question: string;
}

export interface OktaAuthenticationIntegration {
  type: string;
  name: string;
}

export interface OktaUser extends OktaResource {
  status: string;
  created: string;
  activated: string;
  statusChanged?: string;
  lastLogin?: string;
  lastUpdated: string;
  passwordChanged?: string;
  profile: OktaUserProfile;
  credentials?: OktaUserCredentials;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _links?: any;
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
}

export interface OktaUserCredentials {
  password: OktaPasswordCredential;
  recovery_question: OktaRecoveryQuestionCredential;
  integration: OktaAuthenticationIntegration;
  emails: OktaEmailCredential[];
}
