import { OktaFactor } from '../okta/types';
import {
  OktaIntegrationConfig,
  StandardizedOktaUser,
  StandardizedOktaUserGroup,
} from '../types';
import { createMFADeviceEntity } from './device';

const config: OktaIntegrationConfig = {
  oktaApiKey: '',
  oktaOrgUrl: '',
};

describe('creating device entity', () => {
  test('with profile info', () => {
    const device: OktaFactor = {
      id: 'id',
      created: '2019-04-22T21:43:53.000Z',
      lastUpdated: '2019-04-22T21:43:53.000Z',
      profile: {
        name: 'Pixel 2',
        platform: 'ANDROID',
        version: '28',
        deviceType: 'SmartPhone_Android',
        credentialId: 'user',
      },
      factorType: 'push',
      provider: 'OKTA',
      status: 'ACTIVE',
      lastVerified: '2019-04-22T21:43:53.000Z',
    };
    expect(createMFADeviceEntity(device)).toMatchObject({
      _class: ['Key', 'AccessKey'],
      _key: 'id',
      _type: 'mfa_device',
      created: '2019-04-22T21:43:53.000Z',
      name: 'OKTA push',
      provider: 'OKTA',
      status: 'active',
      id: 'id',
      lastUpdated: '2019-04-22T21:43:53.000Z',
      credentialId: 'user',
      deviceType: 'SmartPhone_Android',
      profileName: 'Pixel 2',
      platform: 'ANDROID',
    });
  });
});
