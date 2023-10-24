import { User, UserCredentials, UserProfile } from '@okta/okta-sdk-nodejs';

export type OktaPasswordCredential = string;

export interface OktaEmailCredential {
  value: string;
  // TODO: Change these to Enums when the Okta documentation
  // actually lists the values...
  status: string;
  type: string;
}

export interface OktaUser extends User {
  credentials?: OktaUserCredentials;
  profile?: OktaUserProfile;
}

export interface OktaUserProfile extends UserProfile {
  hireDate?: string;
  terminationDate?: string;
}

export interface OktaUserCredentials extends UserCredentials {
  emails?: OktaEmailCredential[];
}
