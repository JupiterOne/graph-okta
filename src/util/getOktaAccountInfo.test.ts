import { OktaIntegrationConfig } from '../types';
import getOktaAccountInfo from './getOktaAccountInfo';

test('should find domain in Okta organization URL', () => {
  const config: OktaIntegrationConfig = {
    oktaApiKey: 'dummy',
    oktaOrgUrl: 'https://lifeomic.okta.com/',
  };

  expect(
    getOktaAccountInfo({
      name: 'test',
      config,
    }),
  ).toEqual({
    name: 'lifeomic',
    preview: false,
  });
});

test('should find domain in Okta preview URL', () => {
  const config: OktaIntegrationConfig = {
    oktaApiKey: 'dummy',
    oktaOrgUrl: 'https://dev-589921.oktapreview.com/',
  };

  expect(
    getOktaAccountInfo({
      name: 'test',
      config,
    }),
  ).toEqual({
    name: 'dev-589921',
    preview: true,
  });
});

test('should return null if URL does not match pattern', () => {
  const config: OktaIntegrationConfig = {
    oktaApiKey: 'dummy',
    oktaOrgUrl: 'https://blah.blahblah.com/',
  };

  expect(
    getOktaAccountInfo({
      // Account name will come from `IntegrationInstance` name since
      // the `oktaOrgUrl` does not match expected pattern.
      name: 'Fake Integration',
      config,
    }),
  ).toEqual({
    name: 'Fake Integration',
    preview: false,
  });
});
