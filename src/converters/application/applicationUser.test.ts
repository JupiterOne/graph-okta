import { createApplicationUserRelationships } from './applicationUser';

describe('createApplicationUserRelationships()', () => {
  describe('given an application and a user', () => {
    it('should convert it into an user-application relationship', () => {
      const result = createApplicationUserRelationships(
        {
          isMultiInstanceApp: false,
          isSAMLApp: false,
          id: '1',
          name: 'some-name',
          shortName: 'sn',
          label: 'some-label',
          status: 'ACTIVE',
          active: true,
          lastUpdated: new Date('12/12/2023').toISOString(),
          created: new Date('12/12/2023').toISOString(),
          signOnMode: 'SAML',
          _class: 'okta_class',
          _key: 'okta_group',
          _type: 'group',
          awsAccountId: '1',
        },
        {
          lastUpdated: new Date('12/12/2023').toISOString(),
          created: new Date('12/12/2023').toISOString(),
          scope: 'scope',
          status: 'ACTIVE',
          syncState: 'SYNCED',
          profile: {
            email: 'email@email.com',
            role: 'developer',
            samlRoles: [],
          },
          id: '1',
        },
        () => {
          // @noop
        },
      );

      expect(result).toEqual([
        {
          _class: 'ASSIGNED',
          _fromEntityKey: '1',
          _key: '1|assigned|okta_group',
          _toEntityKey: 'okta_group',
          _type: 'okta_user_assigned_application',
          applicationId: '1',
          displayName: 'ASSIGNED',
          role: 'developer',
          roles: '[]',
          userEmail: 'email@email.com',
          userId: '1',
        },
      ]);
    });
  });
});
