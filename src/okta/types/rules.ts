import { OktaResource } from '.';

export interface OktaRule extends OktaResource {
  type: string; //example: "group_rule" or "policy_rule"
  status: string; //example: "ACTIVE" or "INACTIVE"
  name: string;
  created: string;
  lastUpdated?: string;
  conditions: object;
  actions: object;
}
