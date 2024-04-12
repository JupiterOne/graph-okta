import { Group } from '@okta/okta-sdk-nodejs';
import { OktaIntegrationConfig } from '../types';
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
    expect(createGroupUserRelationship('group_id', 'id')).toEqual({
      _class: 'HAS',
      _fromEntityKey: 'group_id',
      _key: 'group_id|has_user|id',
      _toEntityKey: 'id',
      _type: 'okta_group_has_user',
      displayName: 'HAS',
      groupId: 'group_id',
      userId: 'id',
    });
  });
});
