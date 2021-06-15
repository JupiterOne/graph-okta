import * as url from 'url';

import {
  convertProperties,
  createIntegrationEntity,
  parseTimePropertyValue,
  Relationship,
} from '@jupiterone/integration-sdk-core';

import {
  USER_ENTITY_TYPE,
  USER_MFA_DEVICE_RELATIONSHIP_TYPE,
} from '../okta/constants';
import { OktaUser, OktaUserCredentials } from '../okta/types';
import {
  OktaIntegrationConfig,
  StandardizedOktaFactor,
  StandardizedOktaUser,
} from '../types';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';

export function createUserEntity(
  config: OktaIntegrationConfig,
  data: OktaUser,
): StandardizedOktaUser {
  const {
    id,
    status,
    created,
    activated,
    statusChanged,
    lastLogin,
    lastUpdated,
    passwordChanged,
    profile,
    credentials,
  } = data;

  const webLink = url.resolve(
    getOktaAccountAdminUrl(config),
    `/admin/user/profile/view/${data.id}`,
  );

  const source = {
    ...data,
  };
  delete source.credentials;

  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        ...convertProperties(profile),
        ...convertCredentialEmails(credentials),
        _key: id,
        _class: 'User',
        _type: USER_ENTITY_TYPE,
        id,
        webLink,
        displayName: profile.login,
        name: `${profile.firstName} ${profile.lastName}`,
        username: profile.login.split('@')[0],
        email: profile.email.toLowerCase(),
        status,
        active: status === 'ACTIVE',
        created: parseTimePropertyValue(created)!,
        createdOn: parseTimePropertyValue(created)!,
        activated: parseTimePropertyValue(activated)!,
        activatedOn: parseTimePropertyValue(activated)!,
        statusChanged: parseTimePropertyValue(statusChanged),
        statusChangedOn: parseTimePropertyValue(statusChanged),
        lastLogin: parseTimePropertyValue(lastLogin),
        lastLoginOn: parseTimePropertyValue(lastLogin),
        lastUpdated: parseTimePropertyValue(lastUpdated)!,
        lastUpdatedOn: parseTimePropertyValue(lastUpdated)!,
        passwordChanged: parseTimePropertyValue(passwordChanged),
        passwordChangedOn: parseTimePropertyValue(passwordChanged),
      },
    },
  }) as StandardizedOktaUser;
}

export function createUserMfaDeviceRelationship(
  user: StandardizedOktaUser,
  device: StandardizedOktaFactor,
): Relationship {
  return {
    _key: `${user._key}|assigned|${device._key}`,
    _type: USER_MFA_DEVICE_RELATIONSHIP_TYPE,
    _class: 'ASSIGNED',
    _fromEntityKey: user._key,
    _toEntityKey: device._key,
    displayName: 'ASSIGNED',
    userId: user.id,
    factorId: device.id,
  };
}

function convertCredentialEmails(credentials?: OktaUserCredentials) {
  if (credentials && credentials.emails) {
    const verifiedEmails: string[] = [];
    const unverifiedEmails: string[] = [];

    for (const e of credentials.emails) {
      const emailVal = e.value;

      if (e.status === 'VERIFIED') {
        verifiedEmails.push(emailVal);
      } else {
        unverifiedEmails.push(emailVal);
      }
    }

    return {
      verifiedEmails,
      unverifiedEmails,
    };
  }
}
