import {
  convertAWSRolesToRelationships,
  getRole,
  getRoles,
  mapAWSRoleAssignment,
} from './utils';

describe('Application: utils', () => {
  describe('getRoles()', () => {
    describe('given a group with a set of saml roles', () => {
      it('should parse them', () => {
        const result = getRoles({
          lastUpdated: new Date('12/12/2023').toISOString(),
          id: '1',
          profile: {
            samlRoles: { 1: 1 },
          },
        });

        expect(result).toEqual('{"1":1}');
      });
    });

    describe('given a group with no saml roles', () => {
      it('should return undefined', () => {
        const result = getRoles({
          lastUpdated: new Date('12/12/2023').toISOString(),
          id: '1',
        });

        expect(result).toBeUndefined();
      });
    });
  });

  describe('getRole()', () => {
    describe('given a group without a profile role', () => {
      it('should return undefined', () => {
        const result = getRole({
          lastUpdated: new Date('12/12/2023').toISOString(),
          id: '1',
        });

        expect(result).toBe(undefined);
      });
    });

    describe('given a group with a profile role', () => {
      it('should return it', () => {
        const result = getRole({
          lastUpdated: new Date('12/12/2023').toISOString(),
          id: '1',
          profile: {
            role: 'developer',
          },
        });

        expect(result).toEqual('developer');
      });
    });
  });

  describe('convertAWSRolesToRelationships()', () => {
    describe('given something', () => {
      it('should do something', () => {
        const result = convertAWSRolesToRelationships(
          {
            isMultiInstanceApp: false,
            isSAMLApp: false,
            id: '1',
            name: 'some-name',
            shortName: 'sn',
            label: 'label',
            status: 'active',
            active: false,
            lastUpdated: new Date('12/12/2023').toISOString(),
            created: new Date('12/12/2023').toISOString(),
            signOnMode: 'SAML',
            awsAccountId: '1',
            _class: '',
            _key: '',
            _type: '',
          },
          {
            lastUpdated: new Date('12/12/2023').toISOString(),
            id: '1',
            profile: {
              samlRoles: [{ 1: 1 }, [{ 1: 1 }]],
              role: 'a -- a',
            },
          },
          'relationship',
          (role) => {
            expect(role).toEqual([{ '1': 1 }]);
          },
        );

        expect(result).toEqual([
          {
            _class: 'ASSIGNED',
            _key: '1|assigned|arn:aws:iam::1:role/[object Object]',
            _mapping: {
              relationshipDirection: 'REVERSE',
              skipTargetCreation: true,
              sourceEntityKey: '1',
              targetEntity: {
                _class: 'AccessRole',
                _key: 'arn:aws:iam::1:role/[object Object]',
                _type: 'aws_iam_role',
                displayName: {
                  '1': 1,
                },
                name: {
                  '1': 1,
                },
                roleName: {
                  '1': 1,
                },
              },
              targetFilterKeys: [['_type', '_key']],
            },
            _type: 'relationship',
            displayName: 'ASSIGNED',
          },
        ]);
      });
    });
  });

  describe('mapAWSRoleAssignment()', () => {
    describe('given a valid aws role', () => {
      it('should create a reverse mapping', () => {
        const result = mapAWSRoleAssignment({
          sourceKey: '',
          role: 'a -- a',
          relationshipType: '',
          awsAccountId: '',
        });

        expect(result).toEqual({
          _class: 'ASSIGNED',
          _key: '|assigned|a|a',
          _mapping: {
            relationshipDirection: 'REVERSE',
            skipTargetCreation: true,
            sourceEntityKey: '',
            targetEntity: {
              _class: 'AccessRole',
              _type: 'aws_iam_role',
              displayName: 'a',
              name: 'a',
              roleName: 'a',
              'tag.AccountName': 'a',
            },
            targetFilterKeys: [['_type', 'roleName', 'tag.AccountName']],
          },
          _type: '',
          displayName: 'ASSIGNED',
        });
      });
    });

    describe('given a non aws role', () => {
      it('should create a reverse relationship', () => {
        const result = mapAWSRoleAssignment({
          sourceKey: '',
          role: 'a --',
          relationshipType: '',
          awsAccountId: '',
        });

        expect(result).toEqual({
          _class: 'ASSIGNED',
          _key: '|assigned|arn:aws:iam:::role/a --',
          _mapping: {
            relationshipDirection: 'REVERSE',
            skipTargetCreation: true,
            sourceEntityKey: '',
            targetEntity: {
              _class: 'AccessRole',
              _key: 'arn:aws:iam:::role/a --',
              _type: 'aws_iam_role',
              displayName: 'a --',
              name: 'a --',
              roleName: 'a --',
            },
            targetFilterKeys: [['_type', '_key']],
          },
          _type: '',
          displayName: 'ASSIGNED',
        });
      });
    });
  });
});
