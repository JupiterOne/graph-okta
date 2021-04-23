import { OktaFactor } from '../okta/types';
import { StandardizedOktaFactor } from '../types';

import { MFA_DEVICE_ENTITY_TYPE } from '../okta/constants';

export function createMFADeviceEntity(
  data: OktaFactor,
): StandardizedOktaFactor {
  const entity: StandardizedOktaFactor = {
    _key: data.id,
    _type: MFA_DEVICE_ENTITY_TYPE,
    _class: ['Key', 'AccessKey'],
    _rawData: [{ name: 'default', rawData: data }],
    displayName: `${data.provider} ${data.factorType}`,
    id: data.id,
    factorType: data.factorType,
    provider: data.provider,
    vendorName: data.vendorName,
    device: data.device,
    deviceType: data.deviceType,
    status: data.status,
    created: data.created,
    lastUpdated: data.lastUpdated,
    active: data.status === 'ACTIVE',
  };

  return entity;
}
