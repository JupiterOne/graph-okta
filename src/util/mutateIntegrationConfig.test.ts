import mutateIntegrationConfig from './mutateIntegrationConfig';

test('URL missing protocol', () => {
  expect(
    mutateIntegrationConfig({
      oktaOrgUrl: 'abc.mochiokta.com',
      oktaApiKey: 'api-key',
    }),
  ).toEqual({
    oktaOrgUrl: 'https://abc.mochiokta.com',
    oktaApiKey: 'api-key',
  });
});

test('URL with protocol', () => {
  expect(
    mutateIntegrationConfig({
      oktaOrgUrl: 'abc.mochiokta.com',
      oktaApiKey: 'api-key',
    }),
  ).toEqual({
    oktaOrgUrl: 'abc.mochiokta.com',
    oktaApiKey: 'api-key',
  });
});
