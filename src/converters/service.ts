import { Entities } from '../steps/constants';
import { StandardizedOktaAccount, StandardizedOktaService } from '../types';

export function createSSOServiceEntity(
  account: StandardizedOktaAccount,
): StandardizedOktaService {
  return {
    _type: Entities.SERVICE._type,
    _key: `okta:sso:${account.name}`,
    _class: Entities.SERVICE._class,
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
    _type: Entities.SERVICE._type,
    _key: `okta:mfa:${account.name}`,
    _class: Entities.SERVICE._class,
    name: 'MFA',
    displayName: 'Okta MFA',
    category: ['security'],
    function: 'MFA',
    controlDomain: 'identity-access',
  };
}
