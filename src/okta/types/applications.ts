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
