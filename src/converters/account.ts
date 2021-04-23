import { OktaAccountInfo } from '../okta/types';
import { OktaIntegrationConfig, StandardizedOktaAccount } from '../types';

import { ACCOUNT_ENTITY_TYPE } from '../okta/constants';

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
