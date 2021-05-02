import * as url from 'url';

import {
  convertProperties,
  createIntegrationEntity,
} from '@jupiterone/integration-sdk-core';

import { USER_ENTITY_TYPE } from '../okta/constants';
import { OktaUser, OktaUserCredentials } from '../okta/types';
import { OktaIntegrationConfig, StandardizedOktaUser } from '../types';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';
import getTime from '../util/getTime';

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
        created: getTime(created)!,
        createdOn: getTime(created)!,
        activated: getTime(activated)!,
        activatedOn: getTime(activated)!,
        statusChanged: getTime(statusChanged),
        statusChangedOn: getTime(statusChanged),
        lastLogin: getTime(lastLogin),
        lastLoginOn: getTime(lastLogin),
        lastUpdated: getTime(lastUpdated)!,
        lastUpdatedOn: getTime(lastUpdated)!,
        passwordChanged: getTime(passwordChanged),
        passwordChangedOn: getTime(passwordChanged),
      },
    },
  }) as StandardizedOktaUser;
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
