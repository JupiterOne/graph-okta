import { AppUser, Application, ApplicationLinks } from '@okta/okta-sdk-nodejs';

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

export interface OktaApplicationLinks extends ApplicationLinks {
  help?: OktaApplicationLink | OktaApplicationLink[];
  appLinks?: OktaApplicationLink | OktaApplicationLink[];
}

export interface OktaApplication extends Application {
  name?: string;
  credentials?: any;
  settings?: OktaApplicationSettings;
  _links?: OktaApplicationLinks;
}

export interface OktaApplicationUser extends AppUser {
  profile?: OktaApplicationUserProfile;
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
