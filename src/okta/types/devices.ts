import { UserFactor } from '@okta/okta-sdk-nodejs';

export interface OktaFactor extends UserFactor {
  vendorName?: string;
  device?: string;
  lastVerified?: string;
  profile?: OktaFactorProfile;
}

interface OktaFactorProfile {
  authenticatorName?: string; // // e.g. MacBook Touch ID, YubiKey 5 FIPS, etc.
  platform?: string;
  name?: string;
  credentialId?: string;
  version?: string;
  deviceType: string;
}
