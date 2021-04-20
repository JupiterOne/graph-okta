import { OktaResource } from '.';

export interface OktaRuleConditions {
  people?: object;
  expression?: object;
}

export interface OktaRule extends OktaResource {
  type: string; //example: "group_rule" or "policy_rule"
  status: string; //example: "ACTIVE" or "INACTIVE"
  name: string;
  created: string;
  lastUpdated?: string;
  conditions: OktaRuleConditions;
  actions: object;
  _links?: any;
}
