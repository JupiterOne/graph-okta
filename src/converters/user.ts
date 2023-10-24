import * as url from 'url';

import {
  convertProperties,
  createIntegrationEntity,
  parseTimePropertyValue,
  Relationship,
} from '@jupiterone/integration-sdk-core';

import { OktaUser, OktaUserCredentials } from '../okta/types';
import { Entities, Relationships } from '../steps/constants';
import {
  OktaIntegrationConfig,
  StandardizedOktaFactor,
  StandardizedOktaUser,
} from '../types';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';

export function createUserEntity(
  config: OktaIntegrationConfig,
  data: OktaUser,
): StandardizedOktaUser | null {
  if (!data.id) {
    return null;
  }

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
      source: {},
      assign: {
        ...convertProperties(profile),
        ...convertCredentialEmails(credentials),
        _key: id,
        _class: Entities.USER._class,
        _type: Entities.USER._type,
        id,
        webLink,
        displayName: profile?.login,
        name: `${profile?.firstName} ${profile?.lastName}`,
        username: profile?.login?.split('@')[0],
        email: profile?.email?.toLowerCase(),
        status: status?.toLowerCase(),
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
        memberOfGroupId: undefined,
        hiredOn: parseTimePropertyValue(profile?.hireDate),
        terminatedOn: parseTimePropertyValue(profile?.terminationDate),
        countryCode: profile?.countryCode,
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
    _type: Relationships.USER_ASSIGNED_MFA_DEVICE._type,
    _class: Relationships.USER_ASSIGNED_MFA_DEVICE._class,
    _fromEntityKey: user._key,
    _toEntityKey: device._key,
    displayName: Relationships.USER_ASSIGNED_MFA_DEVICE._class,
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
