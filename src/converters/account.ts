import {
  createDirectRelationship,
  Relationship,
  RelationshipClass,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';

import { OktaAccountInfo, OrgOktaSupportSettingsObj } from '../okta/types';
import { Entities, Relationships } from '../steps/constants';
import {
  OktaIntegrationConfig,
  StandardizedOktaAccount,
  StandardizedOktaApplication,
  StandardizedOktaUserGroup,
} from '../types';

export function createAccountEntity(
  config: OktaIntegrationConfig,
  data: OktaAccountInfo,
  supportData?: OrgOktaSupportSettingsObj,
): StandardizedOktaAccount {
  let displayName = data.name;
  if (data.preview) {
    displayName += ' (preview)';
  }

  const accountId = config.oktaOrgUrl.replace(/^https?:\/\//, '');
  let supportEnabled: boolean | null = null;
  let supportExpires: number | undefined = undefined;
  if (supportData) {
    if (supportData.support === 'ENABLED') {
      supportEnabled = true;
    } else {
      supportEnabled = false;
    }
    supportExpires = parseTimePropertyValue(supportData.expiration);
  }
  return {
    _type: Entities.ACCOUNT._type,
    _key: `okta_account_${accountId}`,
    _class: Entities.ACCOUNT._class,
    name: data.name,
    displayName,
    accountId,
    supportEnabled: supportEnabled,
    supportExpiresOn: supportExpires,
    webLink: config.oktaOrgUrl,
  };
}

export function createAccountApplicationRelationship(
  account: StandardizedOktaAccount,
  application: StandardizedOktaApplication,
): Relationship {
  return createDirectRelationship({
    _class: RelationshipClass.HAS,
    from: account,
    to: application,
    properties: {
      accountUrl: account.webLink,
      applicationId: application.id,
      applicationName: application.name,
    },
  });
}

export function createAccountGroupRelationship(
  account: StandardizedOktaAccount,
  group: StandardizedOktaUserGroup,
): Relationship {
  return createDirectRelationship({
    _class: RelationshipClass.HAS,
    from: account,
    to: group,
    properties: {
      _type: Relationships.ACCOUNT_HAS_USER_GROUP._type,
      accountUrl: account.webLink,
      groupId: group.id,
    },
  });
}
