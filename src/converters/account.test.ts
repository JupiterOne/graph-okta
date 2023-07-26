import { createAccountEntity } from './account';

describe('Converter: Account', () => {
  describe('createAccountEntity()', () => {
    describe('given an account', () => {
      it('should convert it to an entity', () => {
        const result = createAccountEntity(
          {
            oktaApiKey: process.env.OKTA_ORG_URL,
            oktaOrgUrl: 'dummy-api-key',
          },
          { name: 'some-name', preview: false },
          { expiration: new Date('12/12/2023'), support: 'DISABLED' },
        );

        expect(result).toEqual({
          _class: ['Account'],
          _key: 'okta_account_dummy-api-key',
          _type: 'okta_account',
          accountId: 'dummy-api-key',
          displayName: 'some-name',
          name: 'some-name',
          supportEnabled: false,
          supportExpiresOn: 1702360800000,
          webLink: 'dummy-api-key',
        });
      });
    });

    describe('given an account on preview mode', () => {
      it('should convert it to an entity', () => {
        const result = createAccountEntity(
          {
            oktaApiKey: process.env.OKTA_ORG_URL,
            oktaOrgUrl: 'dummy-api-key',
          },
          { name: 'some-name', preview: true },
          { expiration: new Date('12/12/2023'), support: 'DISABLED' },
        );

        expect(result).toEqual({
          _class: ['Account'],
          _key: 'okta_account_dummy-api-key',
          _type: 'okta_account',
          accountId: 'dummy-api-key',
          displayName: 'some-name (preview)',
          name: 'some-name',
          supportEnabled: false,
          supportExpiresOn: 1702360800000,
          webLink: 'dummy-api-key',
        });
      });
    });
  });
});
