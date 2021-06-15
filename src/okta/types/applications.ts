import { OktaResource } from '.';

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
  help?: OktaApplicationLink | OktaApplicationLink[];
  metadata?: OktaApplicationLink | OktaApplicationLink[];
  appLinks?: OktaApplicationLink | OktaApplicationLink[];
  groups?: OktaApplicationLink | OktaApplicationLink[];
  logo?: OktaApplicationLink | OktaApplicationLink[];
  users?: OktaApplicationLink | OktaApplicationLink[];
  deactivate?: OktaApplicationLink | OktaApplicationLink[];
}

export interface OktaApplication extends OktaResource {
  name: string;
  label: string;
  status: string;
  lastUpdated: string;
  created: string;
  signOnMode: string;
  credentials?: any;
  accessibility?: any;
  visibility?: any;
  features?: string[];
  settings?: OktaApplicationSettings;
  _links?: OktaApplicationLinks;
}

export interface OktaApplicationUser extends OktaResource {
  externalId?: string;
  created: string;
  lastUpdated: string;
  scope: string;
  status: string;
  statusChanged?: string;
  passwordChanged?: string;
  syncState: string;
  lastSync?: string;
  credentials?: OktaApplicationUserCredentials;
  profile: OktaApplicationUserProfile;
  _embedded?: any;
  _links?: any;
}

export interface OktaApplicationUserCredentials {
  userName?: string;
  password?: { value?: string };
}

/**
 * From [Okta][1]:
 *
 * > Application User profiles are app-specific but may be customized by the
 * > Profile Editor in the administrator UI. SSO apps typically don't support a
 * > user profile while apps with user provisioning features have an
 * > app-specific profiles with optional and/or required properties. Any profile
 * > properties visible in the administrator UI for an application assignment
 * > can also be assigned via the API. Some properties are reference properties
 * > and imported from the target application and only allow specific values to
 * > be configured.
 *
 * [1]:
 * https://developer.okta.com/docs/api/resources/apps/#application-user-credentials-object
 */
export interface OktaApplicationUserProfile {
  email?: string;
  role?: string;
  samlRoles?: string[];
}

export interface OktaApplicationGroup extends OktaResource {
  lastUpdated: string;
  priority?: number;
  profile?: any;
  _links?: any;
  _embedded?: any;
}
