import { StandardizedOktaAccount, StandardizedOktaService } from '../types';

import { SERVICE_ENTITY_TYPE, SERVICE_ENTITY_CLASS } from '../okta/constants';

export function createSSOServiceEntity(
  account: StandardizedOktaAccount,
): StandardizedOktaService {
  return {
    _type: SERVICE_ENTITY_TYPE,
    _key: `okta:sso:${account.name}`,
    _class: SERVICE_ENTITY_CLASS,
    name: 'SSO',
    displayName: 'Okta SSO',
    category: ['security'],
    function: 'SSO',
    controlDomain: 'identity-access',
  };
}

export function createMFAServiceEntity(
  account: StandardizedOktaAccount,
): StandardizedOktaService {
  return {
    _type: SERVICE_ENTITY_TYPE,
    _key: `okta:mfa:${account.name}`,
    _class: SERVICE_ENTITY_CLASS,
    name: 'MFA',
    displayName: 'Okta MFA',
    category: ['security'],
    function: 'MFA',
    controlDomain: 'identity-access',
  };
}
