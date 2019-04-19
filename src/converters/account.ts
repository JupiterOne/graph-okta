import { OktaAccountInfo } from "../okta/types";
import {
  OktaIntegrationConfig,
  StandardizedOktaAccount,
  StandardizedOktaAccountApplicationRelationship,
  StandardizedOktaAccountGroupRelationship,
  StandardizedOktaApplication,
  StandardizedOktaUserGroup,
} from "../types";

export const ACCOUNT_ENTITY_TYPE = "okta_account";
export const ACCOUNT_ENTITY_CLASS = "Account";

export const ACCOUNT_APPLICATION_RELATIONSHIP_TYPE =
  "okta_account_has_application";
export const ACCOUNT_GROUP_RELATIONSHIP_TYPE = "okta_account_has_group";

export function createAccountEntity(
  config: OktaIntegrationConfig,
  data: OktaAccountInfo,
): StandardizedOktaAccount {
  let displayName = data.name;
  if (data.preview) {
    displayName += " (preview)";
  }

  return {
    _type: ACCOUNT_ENTITY_TYPE,
    _key: config.oktaOrgUrl,
    _class: "Account",
    name: data.name,
    displayName,
    webLink: config.oktaOrgUrl,
  };
}

export function createAccountApplicationRelationship(
  account: StandardizedOktaAccount,
  application: StandardizedOktaApplication,
): StandardizedOktaAccountApplicationRelationship {
  return {
    _key: `${account._key}|has|${application._key}`,
    _type: ACCOUNT_APPLICATION_RELATIONSHIP_TYPE,
    _class: "HAS",
    _fromEntityKey: account._key,
    _toEntityKey: application._key,
    displayName: "HAS",
    accountUrl: account.webLink,
    applicationId: application.id,
    applicationName: application.name,
  };
}

export function createAccountGroupRelationship(
  account: StandardizedOktaAccount,
  group: StandardizedOktaUserGroup,
): StandardizedOktaAccountGroupRelationship {
  return {
    _key: `${account._key}|has|${group._key}`,
    _type: ACCOUNT_GROUP_RELATIONSHIP_TYPE,
    _class: "HAS",
    _fromEntityKey: account._key,
    _toEntityKey: group._key,
    displayName: "HAS",
    accountUrl: account.webLink,
    groupId: group.id,
  };
}
