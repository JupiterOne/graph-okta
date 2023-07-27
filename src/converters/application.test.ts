import {
  convertAWSRolesToRelationships,
  createApplicationEntity,
  createApplicationGroupRelationships,
  createApplicationUserRelationships,
  getDisplayName,
  getEnvSpecificProps,
  getName,
  getRole,
  getRoles,
  mapAWSRoleAssignment,
} from './application';

describe('Converter: Application', () => {
  describe('getDisplayName()', () => {
    describe('given an application with a label', () => {
      it('should use return it as display name', () => {
        const result = getDisplayName({
          name: 'some-name',
          label: 'some-label',
          status: '',
          lastUpdated: '',
          created: '',
          signOnMode: '',
          id: '',
        });

        expect(result).toEqual('some-label');
      });
    });

    describe('given an application with no label but a name', () => {
      it('should use return the name as display name', () => {
        const result = getDisplayName({
          name: 'some-name',
          label: '',
          status: '',
          lastUpdated: '',
          created: '',
          signOnMode: '',
          id: '',
        });

        expect(result).toEqual('some-name');
      });
    });

    describe('given an application with no label, no label but an id', () => {
      it('should use return the id as display name', () => {
        const result = getDisplayName({
          name: '',
          label: '',
          status: '',
          lastUpdated: '',
          created: '',
          signOnMode: '',
          id: '1',
        });

        expect(result).toEqual('1');
      });
    });
  });

  describe('getName()', () => {
    describe('given an application with no name but label', () => {
      it('should return the label as name', () => {
        const result = getName({
          name: '',
          label: 'some-label',
          status: '',
          lastUpdated: '',
          created: '',
          signOnMode: '',
          id: '',
        });

        expect(result).toEqual('some-label');
      });
    });
  });

  describe('getEnvSpecificProps()', () => {
    describe('given a github-org okta application', () => {
      it('should add the corresponding properties', () => {
        const result = getEnvSpecificProps({
          name: 'some_name',
          label: 'some_label',
          status: 'some_status',
          lastUpdated: new Date('12/12/2023').toISOString(),
          created: new Date('12/12/2023').toISOString(),
          signOnMode: 'ACTIVE',
          settings: {
            app: {
              githubOrg: 'jupiterone',
            },
            notifications: [],
            signOn: true,
          },
          id: '1',
        });

        expect(result).toEqual({
          appAccountId: 'jupiterone',
          githubOrg: 'jupiterone',
        });
      });
    });

    describe('given a google cloud platform okta application', () => {
      it('should add the corresponding properties', () => {
        const result = getEnvSpecificProps({
          name: 'some_name',
          label: 'some_label',
          status: 'some_status',
          lastUpdated: new Date('12/12/2023').toISOString(),
          created: new Date('12/12/2023').toISOString(),
          signOnMode: 'ACTIVE',
          settings: {
            app: {
              domain: 'jupiterone',
            },
            notifications: [],
            signOn: true,
          },
          id: '1',
        });

        expect(result).toEqual({
          appAccountId: 'jupiterone',
          appDomain: 'jupiterone',
        });
      });
    });

    describe('given no app config', () => {
      it('should return an empty object', () => {
        const result = getEnvSpecificProps({
          name: 'some_name',
          label: 'some_label',
          status: 'some_status',
          lastUpdated: new Date('12/12/2023').toISOString(),
          created: new Date('12/12/2023').toISOString(),
          signOnMode: 'ACTIVE',
          settings: {
            app: {},
            notifications: [],
            signOn: true,
          },
          id: '1',
        });

        expect(result).toEqual({});
      });
    });
  });

  describe('createApplicationEntity()', () => {
    describe('given an okta application', () => {
      it('should create an application entity', () => {
        const result = createApplicationEntity(
          {
            id: '1',
            name: 'application_name',
            config: { oktaOrgUrl: 'https://subdomain.okta.com' },
          },
          {
            name: 'some_name',
            label: 'some_label',
            status: 'some_status',
            lastUpdated: new Date('12/12/2023').toISOString(),
            created: new Date('12/12/2023').toISOString(),
            signOnMode: 'ACTIVE',
            settings: {
              app: {
                awsEnvironmentType: 'aws.amazon',
                identityProviderArn: 'arn:aws:iam::123:/',
              },
              notifications: [],
              signOn: true,
            },
            id: '1',
            _links: {
              appLinks: [{ href: 'https://app-link.okta.com' }],
              logo: [{ href: 'https://subdomain.okta.com/logo.jpg' }],
            },
          },
        );

        expect(result).toEqual({
          _class: ['Application'],
          _key: '1',
          _rawData: [
            {
              name: 'default',
              rawData: {
                created: '2023-12-12T06:00:00.000Z',
                id: '1',
                label: 'some_label',
                lastUpdated: '2023-12-12T06:00:00.000Z',
                name: 'some_name',
                settings: {
                  app: {
                    awsEnvironmentType: 'aws.amazon',
                    identityProviderArn: 'arn:aws:iam::123:/',
                  },
                  notifications: [],
                  signOn: true,
                },
                signOnMode: 'ACTIVE',
                status: 'some_status',
                _links: {
                  appLinks: [{ href: 'https://app-link.okta.com' }],
                  logo: [{ href: 'https://subdomain.okta.com/logo.jpg' }],
                },
              },
            },
          ],
          _type: 'okta_application',
          active: false,
          appAccountId: '123',
          appAccountType: 'some_name_account',
          appVendorName: 'Some Name',
          awsAccountId: '123',
          awsEnvironmentType: 'aws.amazon',
          awsGroupFilter: undefined,
          awsIdentityProviderArn: 'arn:aws:iam::123:/',
          awsJoinAllRoles: undefined,
          awsRoleValuePattern: undefined,
          awsSessionDuration: undefined,
          created: '2023-12-12T06:00:00.000Z',
          createdOn: undefined,
          displayName: 'some_label',
          features: undefined,
          id: '1',
          imageUrl: 'https://subdomain.okta.com/logo.jpg',
          isMultiInstanceApp: false,
          isSAMLApp: false,
          label: 'some_label',
          lastUpdated: '2023-12-12T06:00:00.000Z',
          loginUrl: 'https://app-link.okta.com',
          name: 'some_name',
          shortName: 'some_name',
          signOnMode: 'ACTIVE',
          status: 'some_status',
          webLink:
            'https://subdomain-admin.okta.com/admin/app/some_name/instance/1',
        });
      });
    });
  });

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
