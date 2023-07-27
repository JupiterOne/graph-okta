import {
  createApplicationEntity,
  getDisplayName,
  getEnvSpecificProps,
  getName,
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
});
