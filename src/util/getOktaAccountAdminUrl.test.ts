import { OktaIntegrationConfig } from '../types';
import getOktaAccountAdminUrl from './getOktaAccountAdminUrl';

test('should return admin URL give an Okta organization URL', () => {
  const config: OktaIntegrationConfig = {
    oktaApiKey: 'dummy',
    oktaOrgUrl: 'https://lifeomic.okta.com/',
  };

  expect(getOktaAccountAdminUrl(config)).toBe(
    'https://lifeomic-admin.okta.com/',
  );
});

test('should find domain in Okta preview URL', () => {
  const config: OktaIntegrationConfig = {
    oktaApiKey: 'dummy',
    oktaOrgUrl: 'https://dev-589921.oktapreview.com/',
  };

  expect(getOktaAccountAdminUrl(config)).toBe(
    'https://dev-589921-admin.oktapreview.com/',
  );
});
