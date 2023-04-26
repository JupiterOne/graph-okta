import {
  createIntegrationEntity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';

import { Entities } from '../steps/constants';
import { StandardizedOktaFactor } from '../types';
import { UserFactor } from '@okta/okta-sdk-nodejs';

interface _UserFactor extends UserFactor {
  vendorName?: string;
  device?: string;
  deviceType?: string;
  lastVerified?: string;
  profile?: {
    authenticatorName?: string;
  };
}

export function createMFADeviceEntity(
  data: _UserFactor,
): StandardizedOktaFactor {
  const entityProperties: StandardizedOktaFactor = {
    _key: data.id,
    _type: Entities.MFA_DEVICE._type,
    _class: Entities.MFA_DEVICE._class,
    displayName: `${data.provider} ${data.factorType}`,
    name: `${data.provider} ${data.factorType}`,
    id: data.id,
    factorType: data.factorType,
    provider: data.provider,
    vendorName: data.vendorName,
    device: data.device,
    deviceType: data.deviceType,
    status: data.status.toLowerCase(),
    created: data.created,
    lastUpdated: data.lastUpdated,
    lastVerifiedOn: parseTimePropertyValue(data.lastVerified),
    active: data.status === 'ACTIVE',
    authenticatorName: data.profile?.authenticatorName,
  };

  return createIntegrationEntity({
    entityData: {
      source: data,
      assign: entityProperties,
    },
  }) as StandardizedOktaFactor;
}
