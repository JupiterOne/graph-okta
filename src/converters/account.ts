import {
  createDirectRelationship,
  Relationship,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import {
  ACCOUNT_ENTITY_TYPE,
  ACCOUNT_GROUP_RELATIONSHIP_TYPE,
} from '../okta/constants';
import { OktaAccountInfo } from '../okta/types';
import {
  OktaIntegrationConfig,
  StandardizedOktaAccount,
  StandardizedOktaApplication,
  StandardizedOktaUserGroup,
} from '../types';

export function createAccountEntity(
  config: OktaIntegrationConfig,
  data: OktaAccountInfo,
): StandardizedOktaAccount {
  let displayName = data.name;
  if (data.preview) {
    displayName += ' (preview)';
  }

  const accountId = config.oktaOrgUrl.replace(/^https?:\/\//, '');

  return {
    _type: ACCOUNT_ENTITY_TYPE,
    _key: `okta_account_${accountId}`,
    _class: 'Account',
    name: data.name,
    displayName,
    accountId,
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
      _type: ACCOUNT_GROUP_RELATIONSHIP_TYPE,
      accountUrl: account.webLink,
      groupId: group.id,
    },
  });
}
