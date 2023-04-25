import { OktaResource } from '.';

export interface OktaFactor extends OktaResource {
  factorType: string;
  provider: string;
  vendorName?: string;
  device?: string;
  status: string;
  created: string;
  lastUpdated: string;
  lastVerified: string;
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
