import { OktaUserGroup } from '../okta/types';
import { OktaIntegrationConfig } from '../types';
import { createUserGroupEntity } from './group';

const config: OktaIntegrationConfig = {
  oktaApiKey: '',
  oktaOrgUrl: '',
};

describe('creating group entity', () => {
  test('with APP_GROUP type', () => {
    const group: OktaUserGroup = {
      id: 'id',
      created: '2019-04-22T21:43:53.000Z',
      lastUpdated: '2019-04-22T21:43:53.000Z',
      lastMembershipUpdated: '2019-04-22T21:43:53.000Z',
      type: 'APP_GROUP',
      profile: {
        name: 'name',
        description: 'description',
      },
      _links: '_links',
    };
    expect(createUserGroupEntity(config, group)).toEqual({
      _class: 'UserGroup',
      _key: 'id',
      _rawData: [
        {
          name: 'name',
          rawData: {
            _links: '_links',
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
    });
  });

  test('without APP_GROUP type', () => {
    const group: OktaUserGroup = {
      id: 'id',
      created: '2019-04-22T21:43:53.000Z',
      lastUpdated: '2019-04-22T21:43:53.000Z',
      lastMembershipUpdated: '2019-04-22T21:43:53.000Z',
      type: 'just_type',
      profile: {
        name: 'name',
        description: 'description',
      },
      _links: '_links',
    };
    expect(createUserGroupEntity(config, group)).toEqual({
      _class: 'UserGroup',
      _key: 'id',
      _rawData: [
        {
          name: 'name',
          rawData: {
            _links: '_links',
            created: '2019-04-22T21:43:53.000Z',
            id: 'id',
            lastMembershipUpdated: '2019-04-22T21:43:53.000Z',
            lastUpdated: '2019-04-22T21:43:53.000Z',
            profile: {
              description: 'description',
              name: 'name',
            },
            type: 'just_type',
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
      type: 'just_type',
      webLink: '/admin/group/id',
    });
  });
});
