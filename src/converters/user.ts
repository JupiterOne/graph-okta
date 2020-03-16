import { convertProperties } from "@jupiterone/jupiter-managed-integration-sdk";

import * as url from "url";

import { OktaUser, OktaUserCredentials } from "../okta/types";
import {
  OktaIntegrationConfig,
  StandardizedOktaFactor,
  StandardizedOktaUser,
  StandardizedOktaUserFactorRelationship,
} from "../types";
import getOktaAccountAdminUrl from "../util/getOktaAccountAdminUrl";
import getTime from "../util/getTime";

export const USER_ENTITY_TYPE = "okta_user";
export const USER_MFA_DEVICE_RELATIONSHIP_TYPE = "okta_user_assigned_factor";

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

  const emailProperties = convertCredentialEmails(credentials);
  const entity: StandardizedOktaUser = {
    ...convertProperties(profile),
    ...emailProperties,
    _key: id,
    _type: USER_ENTITY_TYPE,
    _class: "User",
    _rawData: [{ name: "default", rawData: data }],
    id,
    webLink,
    displayName: profile.login,
    name: `${profile.firstName} ${profile.lastName}`,
    username: profile.login.split("@")[0],
    email: profile.email.toLowerCase(),
    status,
    active: status === "ACTIVE",
    created: getTime(created)!,
    activated: getTime(activated)!,
    statusChanged: getTime(statusChanged),
    lastLogin: getTime(lastLogin),
    lastUpdated: getTime(lastUpdated)!,
    passwordChanged: getTime(passwordChanged),
  };

  return entity;
}

export function createUserMfaDeviceRelationship(
  user: StandardizedOktaUser,
  device: StandardizedOktaFactor,
): StandardizedOktaUserFactorRelationship {
  return {
    _key: `${user._key}|assigned|${device._key}`,
    _type: USER_MFA_DEVICE_RELATIONSHIP_TYPE,
    _class: "ASSIGNED",
    _fromEntityKey: user._key,
    _toEntityKey: device._key,
    displayName: "ASSIGNED",
    userId: user.id,
    factorId: device.id,
  };
}

function convertCredentialEmails(credentials?: OktaUserCredentials) {
  if (credentials && credentials.emails) {
    const verifiedEmails = [];
    const unverifiedEmails = [];

    for (const e of credentials.emails) {
      const emailVal = e.value;

      if (e.status === "VERIFIED") {
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
