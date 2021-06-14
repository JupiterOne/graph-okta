import { createIntegrationEntity } from '@jupiterone/integration-sdk-core';

import { MFA_DEVICE_ENTITY_TYPE } from '../okta/constants';
import { OktaFactor } from '../okta/types';
import { StandardizedOktaFactor } from '../types';

export function createMFADeviceEntity(
  data: OktaFactor,
): StandardizedOktaFactor {
  const entityProperties: StandardizedOktaFactor = {
    _key: data.id,
    _type: MFA_DEVICE_ENTITY_TYPE,
    _class: ['Key', 'AccessKey'],
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
  return createIntegrationEntity({
    entityData: {
      source: data,
      assign: entityProperties,
    },
  }) as StandardizedOktaFactor;
}
