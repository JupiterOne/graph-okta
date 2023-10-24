import { Device, UserCredentials, UserProfile } from '@okta/okta-sdk-nodejs';

export interface OktaDevice extends Device {
  _embedded?: {
    users?: EmbeddedUser[];
  };
}
interface EmbeddedUser {
  created?: string;
  managementStatus?: 'MANAGED' | 'NOT_MANAGED';
  screenLockType?: 'NONE' | 'PASSCODE' | 'BIOMETRIC';
  user?: {
    activated?: string;
    created?: string;
    credentials?: UserCredentials;
    id?: string;
    lastLogin?: string;
    lastUpdated?: string;
    passwordChanged?: string;
    profile?: UserProfile;
    status?:
      | 'ACTIVE'
      | 'DEPROVISIONED'
      | 'LOCKED_OUT'
      | 'PASSWORD_EXPIRED'
      | 'PROVISIONED'
      | 'RECOVERY'
      | 'STAGED'
      | 'SUSPENDED';
    statusChanged?: string;
    transitioningToStatus?: 'ACTIVE' | 'DEPROVISIONED' | 'PROVISIONED';
    type?: {
      id?: string;
    };
    _embedded?: {
      [key: string]: any;
    };
    _links?: {
      [key: string]: any;
    };
  };
}
