import { createApplicationGroupRelationships } from './applicationGroup';

describe('createApplicationGroupRelationships()', () => {
  describe('given an okta group', () => {
    it('should return a group instance', () => {
      const result = createApplicationGroupRelationships(
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
          lastUpdated: '',
          id: '',
        },
        () => {
          // @noop
        },
      );

      expect(result).toEqual([
        {
          _class: 'ASSIGNED',
          _fromEntityKey: '',
          _key: '|assigned|okta_group',
          _toEntityKey: 'okta_group',
          _type: 'okta_group_assigned_application',
          applicationId: '1',
          displayName: 'ASSIGNED',
          groupId: '',
          role: undefined,
          roles: undefined,
        },
      ]);
    });
  });
});
