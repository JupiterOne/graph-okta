import {
  createIntegrationEntity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';

import { Entities } from '../steps/constants';
import { StandardizedOktaDevice } from '../types';
import { OktaDevice } from '../okta/types';

export function createDeviceEntity(
  data: OktaDevice,
): StandardizedOktaDevice | null {
  if (!data.id || !data.resourceId) {
    return null;
  }

  const id = data.id ?? data.resourceId;
  return createIntegrationEntity({
    entityData: {
      source: data,
      assign: {
        _key: id,
        _type: Entities.DEVICE._type,
        _class: Entities.DEVICE._class,
        displayName:
          data.resourceDisplayName?.value ?? data.profile?.displayName,
        name: data.resourceDisplayName?.value ?? data.profile?.displayName,
        id,
        deviceId: id,
        deviceStatus: data.status?.toLowerCase(),
        createdOn: parseTimePropertyValue(data.created),
        updatedOn: parseTimePropertyValue(data.lastUpdated),
        lastSeenOn: parseTimePropertyValue(data.lastUpdated),
        category: data.resourceType,
        model: data.profile?.model,
        make: data.profile?.manufacturer,
        platform: data.profile?.platform?.toLowerCase(),
        osName: data.profile?.platform?.toLowerCase(),
        osVersion: data.profile?.osVersion,
        serial: data.profile?.serialNumber,
        registered: data.profile?.registered,
        status: undefined,
      },
    },
  }) as StandardizedOktaDevice;
}
