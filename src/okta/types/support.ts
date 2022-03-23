import { OktaResource } from '.';

export interface OrgOktaSupportSettingsObj extends OktaResource {
  support: string;
  expiration: string;
  _links: any;
}
