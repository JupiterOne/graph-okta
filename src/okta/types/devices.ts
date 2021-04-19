import { OktaResource } from '.';

export interface OktaFactor extends OktaResource {
  factorType: string;
  provider: string;
  vendorName?: string;
  device?: string;
  deviceType?: string;
  status: string;
  created: string;
  lastUpdated: string;
}
