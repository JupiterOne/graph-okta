import { StandardizedOktaAccount, StandardizedOktaService } from "../types";

export const SERVICE_ENTITY_TYPE = "okta_service";
export const SERVICE_ENTITY_CLASS = ["Service", "Control"];

export const ACCOUNT_SERVICE_RELATIONSHIP_TYPE = "okta_account_has_service";

export function createSSOServiceEntity(
  account: StandardizedOktaAccount,
): StandardizedOktaService {
  return {
    _type: SERVICE_ENTITY_TYPE,
    _key: `okta:sso:${account.name}`,
    _class: SERVICE_ENTITY_CLASS,
    name: "SSO",
    displayName: "Okta SSO",
    category: "security",
    function: "SSO",
    controlDomain: "identity-access",
  };
}

export function createMFAServiceEntity(
  account: StandardizedOktaAccount,
): StandardizedOktaService {
  return {
    _type: SERVICE_ENTITY_TYPE,
    _key: `okta:mfa:${account.name}`,
    _class: SERVICE_ENTITY_CLASS,
    name: "MFA",
    displayName: "Okta MFA",
    category: "security",
    function: "MFA",
    controlDomain: "identity-access",
  };
}
