import {
  createAccountApplicationRelationship,
  createAccountEntity,
  createAccountGroupRelationship,
} from './account';

describe('Converter: Account', () => {
  describe('createAccountEntity()', () => {
    describe('given an account', () => {
      it('should convert it to an entity', () => {
        const result = createAccountEntity(
          {
            oktaApiKey: 'url',
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
            oktaApiKey: 'url',
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

  describe('createAccountApplicationRelationship()', () => {
    describe('given an account and an application', () => {
      it('should create a direct relationship', () => {
        const result = createAccountApplicationRelationship(
          {
            name: 'some-name',
            webLink: 'some-link',
            accountId: '1',
            _class: 'Account',
            _key: 'okta_account_dummy-api-key',
            _type: 'okta_account',
          },
          {
            isMultiInstanceApp: false,
            isSAMLApp: false,
            id: '1',
            name: 'some-name',
            shortName: 'sn',
            label: 'label',
            status: 'ACTIVE',
            active: true,
            lastUpdated: new Date('12/12/2023').toISOString(),
            created: new Date('12/12/2023').toISOString(),
            signOnMode: 'TRUE',
            _class: 'Account',
            _key: 'some-key',
            _type: 'okta_account',
          },
        );

        expect(result).toEqual({
          _class: 'HAS',
          _fromEntityKey: 'okta_account_dummy-api-key',
          _key: 'okta_account_dummy-api-key|has|some-key',
          _toEntityKey: 'some-key',
          _type: 'okta_account_has_account',
          accountUrl: 'some-link',
          applicationId: '1',
          applicationName: 'some-name',
          displayName: 'HAS',
        });
      });
    });
  });

  describe('createAccountGroupRelationship()', () => {
    describe('given an account and a group', () => {
      it('should create a relationship', () => {
        const result = createAccountGroupRelationship(
          {
            name: 'some-name',
            webLink: 'some-link',
            accountId: '1',
            _class: 'Account',
            _key: 'okta_account_dummy-api-key',
            _type: 'okta_account',
          },
          {
            id: '1',
            created: new Date('12/12/2023').getTime(),
            createdOn: new Date('12/12/2023').getTime(),
            lastUpdated: new Date('12/12/2023').getTime(),
            lastUpdatedOn: new Date('12/12/2023').getTime(),
            lastMembershipUpdated: new Date('12/12/2023').getTime(),
            lastMembershipUpdatedOn: new Date('12/12/2023').getTime(),
            type: 'type',
            name: 'account',
            _class: 'Account',
            _key: 'okta_account_dummy-api-key',
            _type: 'okta_account',
          },
        );

        expect(result).toEqual({
          _class: 'HAS',
          _fromEntityKey: 'okta_account_dummy-api-key',
          _key: 'okta_account_dummy-api-key|has|okta_account_dummy-api-key',
          _toEntityKey: 'okta_account_dummy-api-key',
          _type: 'okta_account_has_group',
          accountUrl: 'some-link',
          displayName: 'HAS',
          groupId: '1',
        });
      });
    });
  });
});
