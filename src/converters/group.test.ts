import { Group } from '@okta/okta-sdk-nodejs';
import {
  OktaIntegrationConfig,
  StandardizedOktaUser,
  StandardizedOktaUserGroup,
} from '../types';
import { createGroupUserRelationship, createUserGroupEntity } from './group';

const config: OktaIntegrationConfig = {
  oktaApiKey: '',
  oktaOrgUrl: '',
};

describe('creating group entity', () => {
  test('with APP_GROUP type', () => {
    const group: Group = {
      id: 'id',
      created: new Date('2019-04-22T21:43:53.000Z'),
      lastUpdated: new Date('2019-04-22T21:43:53.000Z'),
      lastMembershipUpdated: new Date('2019-04-22T21:43:53.000Z'),
      type: 'APP_GROUP',
      profile: {
        name: 'name',
        description: 'description',
      },
    };
    expect(createUserGroupEntity(config, group)).toEqual({
      _class: ['UserGroup'],
      _key: 'id',
      _rawData: [
        {
          name: 'default',
          rawData: {
            created: new Date('2019-04-22T21:43:53.000Z'),
            id: 'id',
            lastMembershipUpdated: new Date('2019-04-22T21:43:53.000Z'),
            lastUpdated: new Date('2019-04-22T21:43:53.000Z'),
            profile: {
              description: 'description',
              name: 'name',
            },
            type: 'APP_GROUP',
          },
        },
      ],
      _type: 'okta_app_user_group',
      created: 1555969433000,
      createdOn: 1555969433000,
      displayName: 'name',
      id: 'id',
      lastMembershipUpdated: 1555969433000,
      lastMembershipUpdatedOn: 1555969433000,
      lastUpdated: 1555969433000,
      lastUpdatedOn: 1555969433000,
      description: 'description',
      name: 'name',
      type: 'APP_GROUP',
      webLink: '/admin/group/id',
    });
  });

  test('without APP_GROUP type', () => {
    const group: Group = {
      id: 'id',
      created: new Date('2019-04-22T21:43:53.000Z'),
      lastUpdated: new Date('2019-04-22T21:43:53.000Z'),
      lastMembershipUpdated: new Date('2019-04-22T21:43:53.000Z'),
      type: 'OKTA_GROUP',
      profile: {
        name: 'name',
        description: 'description',
      },
    };
    expect(createUserGroupEntity(config, group)).toEqual({
      _class: ['UserGroup'],
      _key: 'id',
      _rawData: [
        {
          name: 'default',
          rawData: {
            created: new Date('2019-04-22T21:43:53.000Z'),
            id: 'id',
            lastMembershipUpdated: new Date('2019-04-22T21:43:53.000Z'),
            lastUpdated: new Date('2019-04-22T21:43:53.000Z'),
            profile: {
              description: 'description',
              name: 'name',
            },
            type: 'OKTA_GROUP',
          },
        },
      ],
      _type: 'okta_user_group',
      created: 1555969433000,
      createdOn: 1555969433000,
      displayName: 'name',
      id: 'id',
      lastMembershipUpdated: 1555969433000,
      lastMembershipUpdatedOn: 1555969433000,
      lastUpdated: 1555969433000,
      lastUpdatedOn: 1555969433000,
      description: 'description',
      name: 'name',
      type: 'OKTA_GROUP',
      webLink: '/admin/group/id',
    });
  });
});

describe('creating group entity differently', () => {
  test('with APP_GROUP type', () => {
    const group: StandardizedOktaUserGroup = {
      _class: ['UserGroup'],
      _key: 'id',
      _rawData: [
        {
          name: 'default',
          rawData: {
            created: '2019-04-22T21:43:53.000Z',
            id: 'id',
            lastMembershipUpdated: '2019-04-22T21:43:53.000Z',
            lastUpdated: '2019-04-22T21:43:53.000Z',
            profile: {
              description: 'description',
              name: 'name',
            },
            type: 'APP_GROUP',
          },
        },
      ],
      _type: 'okta_app_user_group',
      created: 1555969433000,
      createdOn: 1555969433000,
      displayName: 'name',
      id: 'id',
      lastMembershipUpdated: 1555969433000,
      lastMembershipUpdatedOn: 1555969433000,
      lastUpdated: 1555969433000,
      lastUpdatedOn: 1555969433000,
      description: 'description',
      name: 'name',
      type: 'APP_GROUP',
      webLink: '/admin/group/id',
    };
    const user: StandardizedOktaUser = {
      _class: 'User',
      _key: 'id',
      _rawData: [
        {
          name: 'default',
          rawData: {
            activated: '2019-04-22T21:43:53.000Z',
            created: '2019-04-22T21:43:53.000Z',
            credentials: {
              emails: [
                {
                  status: 'VERIFIED',
                  type: 'type',
                  value: 'value',
                },
                {
                  status: 'UNVERIFIED',
                  type: 'type',
                  value: 'value',
                },
              ],
              integration: {
                name: 'name',
                type: 'type',
              },
              password: 'password',
              recovery_question: {
                question: 'question',
              },
            },
            id: 'id',
            lastLogin: '2019-04-22T21:43:53.000Z',
            lastUpdated: '2019-04-22T21:43:53.000Z',
            passwordChanged: '2019-04-22T21:43:53.000Z',
            profile: {
              bitbucketUsername: 'bitbucketUsername',
              displayName: 'displayName',
              email: 'email',
              employeeNumber: 'employeeNumber',
              employeeType: 'employeeType',
              firstName: 'firstName',
              generic: true,
              githubUsername: 'githubUsername',
              lastName: 'lastName',
              login: 'login',
              manager: 'manager',
              managerId: 'managerId',
              mobilePhone: 'mobilePhone',
              secondEmail: 'secondEmail',
              tenant: ['tenant'],
              userType: 'userType',
            },
            status: 'status',
            statusChanged: '2019-04-22T21:43:53.000Z',
          },
        },
      ],
      _type: 'okta_user',
      activated: 1555969433000,
      activatedOn: 1555969433000,
      active: false,
      bitbucketUsername: 'bitbucketUsername',
      created: 1555969433000,
      createdOn: 1555969433000,
      displayName: 'login',
      email: 'email',
      employeeType: 'employeeType',
      firstName: 'firstName',
      generic: true,
      githubUsername: 'githubUsername',
      id: 'id',
      lastLogin: 1555969433000,
      lastLoginOn: 1555969433000,
      lastName: 'lastName',
      lastUpdated: 1555969433000,
      lastUpdatedOn: 1555969433000,
      login: 'login',
      manager: 'manager',
      managerId: 'managerId',
      mobilePhone: 'mobilePhone',
      name: 'firstName lastName',
      passwordChanged: 1555969433000,
      passwordChangedOn: 1555969433000,
      secondEmail: 'secondEmail',
      status: 'status',
      statusChanged: 1555969433000,
      statusChangedOn: 1555969433000,
      tenant: ['tenant'],
      unverifiedEmails: ['value'],
      userType: 'userType',
      username: 'login',
      verifiedEmails: ['value'],
      webLink: '/admin/user/profile/view/id',
    };
    expect(createGroupUserRelationship(group, user)).toEqual({
      _class: 'HAS',
      _fromEntityKey: 'id',
      _key: 'id|has_user|id',
      _toEntityKey: 'id',
      _type: 'okta_group_has_user',
      displayName: 'HAS',
      groupId: 'id',
      userId: 'id',
    });
  });
});
