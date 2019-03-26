import * as url from "url";
import {
  FlattenedOktaUser,
  FlattenedOktaUserGroup,
  MappedRelationship,
  OktaApplication,
  OktaExecutionContext,
  OktaFactor,
  OktaUser,
  OktaUserGroup,
  StandardizedOktaAccount,
  StandardizedOktaAccountApplicationRelationship,
  StandardizedOktaAccountGroupRelationship,
  StandardizedOktaApplication,
  StandardizedOktaApplicationGroupRelationship,
  StandardizedOktaApplicationUserRelationship,
  StandardizedOktaFactor,
  StandardizedOktaUser,
  StandardizedOktaUserFactorRelationship,
  StandardizedOktaUserGroup,
  StandardizedOktaUserGroupRelationship,
} from "./types";

import {
  RelationshipDirection,
  RelationshipFromIntegration,
} from "@jupiterone/jupiter-managed-integration-sdk";

import * as constants from "./constants";
import buildAppShortName from "./util/buildAppShortName";
import getOktaAccountAdminUrl from "./util/getOktaAccountAdminUrl";
import getOktaAccountInfo from "./util/getOktaAccountInfo";
import {
  getAccountName,
  getVendorName,
  isMultiInstanceApp,
} from "./util/knownVendors";

/**
 * Okta returns back nested objects in API calls. Due to the nature of using a
 * Graph database, we need to flatten these objects, so that all properties are
 * at the top level.
 */
export function flattenUser(user: OktaUser): FlattenedOktaUser {
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
  } = user;

  const {
    firstName,
    lastName,
    mobilePhone,
    secondEmail,
    login,
    tenant,
    email,
    userType,
    employeeType,
    generic,
    manager,
    managerId,
    bitbucketUsername,
    githubUsername,
  } = profile;

  const flattenedUser: FlattenedOktaUser = {
    displayName: login,
    name: `${firstName} ${lastName}`,
    username: login.split("@")[0],
    id,
    status,
    active: status === "ACTIVE",
    created,
    activated,
    statusChanged,
    lastLogin,
    lastUpdated,
    passwordChanged,
    firstName,
    lastName,
    mobilePhone,
    secondEmail,
    login,
    tenant,
    email,
    userType,
    employeeType,
    generic,
    manager,
    managerId,
    bitbucketUsername,
    githubUsername,
  };

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

    flattenedUser.verifiedEmails = verifiedEmails;
    flattenedUser.unverifiedEmails = unverifiedEmails;
  }

  return flattenedUser;
}

/**
 * Okta returns back nested objects in API calls. Due to the nature of using a
 * Graph database, we need to flatten these objects, so that all properties are
 * at the top level.
 */
export function flattenUserGroup(group: OktaUserGroup) {
  const {
    id,
    created,
    lastUpdated,
    lastMembershipUpdated,
    objectClass,
    type,
    profile,
  } = group;

  const { name: profileName, description: profileDescription } = profile;

  const flattenedGroup: FlattenedOktaUserGroup = {
    id,
    displayName: profileName,
    created,
    lastUpdated,
    lastMembershipUpdated,
    objectClass,
    type,
    profileName,
    profileDescription,
  };

  return flattenedGroup;
}

export function convertOktaUser(
  context: OktaExecutionContext,
  oktaUser: OktaUser,
): StandardizedOktaUser {
  const webLink = url.resolve(
    getOktaAccountAdminUrl(context.instance.config),
    `/admin/user/profile/view/${oktaUser.id}`,
  );
  const flattenedUser = flattenUser(oktaUser);
  const entity: StandardizedOktaUser = {
    _key: flattenedUser.id,
    _type: constants.ENTITY_TYPE_USER,
    _class: "User",
    _rawData: [
      {
        name: "default",
        rawData: oktaUser,
      },
    ],
    webLink,
    ...flattenedUser,
  };

  return entity;
}

export function convertOktaUserGroup(
  context: OktaExecutionContext,
  oktaUserGroup: OktaUserGroup,
): StandardizedOktaUserGroup {
  const webLink = url.resolve(
    getOktaAccountAdminUrl(context.instance.config),
    `/admin/group/${oktaUserGroup.id}`,
  );
  const flattenedUserGroup = flattenUserGroup(oktaUserGroup);

  // see https://developer.okta.com/docs/api/resources/groups#group-type
  const entityType =
      flattenedUserGroup.type === "APP_GROUP"
        ? constants.ENTITY_TYPE_APP_USER_GROUP
        : constants.ENTITY_TYPE_USER_GROUP /* applies to `OKTA_GROUP` and `BUILT_IN` */;

  const entity = {
    _key: oktaUserGroup.id,
    _type: entityType,
    _class: "UserGroup",
    _rawData: [
      {
        name: "default",
        rawData: oktaUserGroup,
      },
    ],
    webLink,
    ...flattenedUserGroup,
  };

  return entity;
}

export function convertOktaUserGroupRelationship(
  user: StandardizedOktaUser,
  group: StandardizedOktaUserGroup,
) {
  const relationship: StandardizedOktaUserGroupRelationship = {
    _key: `${group._key}|has_user|${user._key}`,
    _type: constants.RELATIONSHIP_TYPE_GROUP_USER,
    _class: "HAS",
    _fromEntityKey: group._key,
    _toEntityKey: user._key,
    displayName: "HAS",
    userId: user.id,
    groupId: group.id,
  };

  return relationship;
}

export function convertOktaAccountGroupRelationship(
  account: StandardizedOktaAccount,
  group: StandardizedOktaUserGroup,
) {
  const relationship: StandardizedOktaAccountGroupRelationship = {
    _key: `${account._key}|has|${group._key}`,
    _type: constants.RELATIONSHIP_TYPE_ACCOUNT_GROUP,
    _class: "HAS",
    _fromEntityKey: account._key,
    _toEntityKey: group._key,
    displayName: "HAS",
    accountUrl: account.webLink,
    groupId: group.id,
  };

  return relationship;
}

export function convertOktaApplication(
  context: OktaExecutionContext,
  app: OktaApplication,
): StandardizedOktaApplication {
  const webLink = url.resolve(
    getOktaAccountAdminUrl(context.instance.config),
    `/admin/app/${app.name}/instance/${app.id}`,
  );

  const oktaAccountInfo = getOktaAccountInfo(context.instance);
  const appShortName = buildAppShortName(oktaAccountInfo, app.name);

  const entity: StandardizedOktaApplication = {
    _key: app.id,
    _type: constants.ENTITY_TYPE_APPLICATION,
    _class: "Application",
    displayName: app.label || app.name || app.id,
    id: app.id,
    name: app.name || app.label,
    shortName: appShortName,
    label: app.label,
    status: app.status,
    active: app.status === "ACTIVE",
    lastUpdated: app.lastUpdated,
    created: app.created,
    features: app.features,
    signOnMode: app.signOnMode,
    appVendorName: getVendorName(appShortName),
    appAccountType: getAccountName(appShortName),
    isMultiInstanceApp: isMultiInstanceApp(appShortName),
    isSAMLApp: app.signOnMode.startsWith("SAML"),
    webLink,
  };

  const settings = app.settings;
  const appSettings = settings.app;
  if (appSettings.awsEnvironmentType === "aws.amazon") {
    if (appSettings.identityProviderArn) {
      const awsAccountIdMatch = /^arn:aws:iam::([0-9]+):/.exec(
        appSettings.identityProviderArn,
      );
      if (awsAccountIdMatch) {
        entity.awsAccountId = awsAccountIdMatch[1];
        entity.appAccountId = awsAccountIdMatch[1];
      }
    }

    entity.awsIdentityProviderArn = appSettings.identityProviderArn;
    entity.awsEnvironmentType = appSettings.awsEnvironmentType;
    entity.awsGroupFilter = appSettings.groupFilter;
    entity.awsRoleValuePattern = appSettings.roleValuePattern;
    entity.awsJoinAllRoles = appSettings.joinAllRoles;
    entity.awsSessionDuration = appSettings.sessionDuration;
  } else if (appSettings.githubOrg) {
    entity.githubOrg = appSettings.githubOrg;
    entity.appAccountId = appSettings.githubOrg;
  } else if (appSettings.domain) {
    // Google Cloud Platform and G Suite apps use `domain` as the account identifier
    entity.appDomain = appSettings.domain;
    entity.appAccountId = appSettings.domain;
  }
  return entity;
}

export function convertOktaAccountApplicationRelationship(
  account: StandardizedOktaAccount,
  application: StandardizedOktaApplication,
) {
  const relationship: StandardizedOktaAccountApplicationRelationship = {
    _key: `${account._key}|has|${application._key}`,
    _type: constants.RELATIONSHIP_TYPE_ACCOUNT_APPLICATION,
    _class: "HAS",
    _fromEntityKey: account._key,
    _toEntityKey: application._key,
    displayName: "HAS",
    accountUrl: account.webLink,
    applicationId: application.id,
    applicationName: application.name,
  };

  return relationship;
}

export function convertOktaApplicationUserRelationship(
  application: StandardizedOktaApplication,
  user: OktaUser,
) {
  const relationships: RelationshipFromIntegration[] = [];
  const userKey = user.id;
  const relationship: StandardizedOktaApplicationUserRelationship = {
    _key: `${userKey}|assigned|${application._key}`,
    _type: constants.RELATIONSHIP_TYPE_APPLICATION_USER,
    _class: "ASSIGNED",
    _fromEntityKey: userKey,
    _toEntityKey: application._key,
    displayName: "ASSIGNED",
    applicationId: application.id,
    userId: user.id,
    userEmail: user.profile.email,
  };

  if (application.awsAccountId) {
    // Array property not supported on the edge in Neptune
    relationship.roles = JSON.stringify(user.profile.samlRoles);
    relationship.role = user.profile.role;

    if (user.profile.samlRoles) {
      for (const samlRole of user.profile.samlRoles) {
        relationships.push(
          mapAWSRoleAssignment(userKey, samlRole, application.awsAccountId),
        );
      }
    } else if (user.profile.role) {
      relationships.push(
        mapAWSRoleAssignment(
          userKey,
          user.profile.role,
          application.awsAccountId,
        ),
      );
    }
  }

  relationships.push(relationship);

  return relationships;
}

export function convertOktaApplicationGroupRelationship(
  application: StandardizedOktaApplication,
  group: OktaUserGroup,
) {
  const groupKey = group.id;
  const relationship: StandardizedOktaApplicationGroupRelationship = {
    _key: `${groupKey}|assigned|${application._key}`,
    _type: constants.RELATIONSHIP_TYPE_APPLICATION_GROUP,
    _class: "ASSIGNED",
    _fromEntityKey: groupKey,
    _toEntityKey: application._key,
    displayName: "ASSIGNED",
    applicationId: application.id,
    groupId: group.id,
  };

  if (application.awsAccountId) {
    // Array property not supported on the edge in Neptune
    relationship.roles = JSON.stringify(group.profile.samlRoles);
    relationship.role = group.profile.role;
  }

  return relationship;
}

export function convertOktaFactor(
  oktaFactor: OktaFactor,
): StandardizedOktaFactor {
  const entity: StandardizedOktaFactor = {
    _key: oktaFactor.id,
    _type: constants.ENTITY_TYPE_FACTOR,
    _class: ["Key", "AccessKey"],
    _rawData: [
      {
        name: "default",
        rawData: oktaFactor,
      },
    ],
    displayName: `${oktaFactor.provider} ${oktaFactor.factorType}`,
    id: oktaFactor.id,
    factorType: oktaFactor.factorType,
    provider: oktaFactor.provider,
    vendorName: oktaFactor.vendorName,
    device: oktaFactor.device,
    deviceType: oktaFactor.deviceType,
    status: oktaFactor.status,
    created: oktaFactor.created,
    lastUpdated: oktaFactor.lastUpdated,
    active: oktaFactor.status === "ACTIVE",
  };

  return entity;
}

export function convertOktaUserFactorRelationship(
  user: StandardizedOktaUser,
  factor: OktaFactor,
) {
  const relationship: StandardizedOktaUserFactorRelationship = {
    _key: `${user._key}|assigned|${factor.id}`,
    _type: constants.RELATIONSHIP_TYPE_USER_FACTOR,
    _class: "ASSIGNED",
    _fromEntityKey: user._key,
    _toEntityKey: factor.id,
    displayName: "ASSIGNED",
    userId: user._key,
    factorId: factor.id,
  };

  return relationship;
}

// See bullet point #11 in the following Okta documentation:
// https://saml-doc.okta.com/SAML_Docs/How-to-Configure-SAML-2.0-for-Amazon-Web-Service#scenarioB
//
// - The primary SAML roles are listed directly
// - The secondary SAML roles are listed as `Account Name - Role Name` or `[Account Alias] - Role Name`
//
// This function parses the role string based on the above patterns and creates
// a mapped relationship to the role (skips creation if the role is not already
// ingested or mapped).
function mapAWSRoleAssignment(
  sourceKey: string,
  role: string,
  awsAccountId: string,
): MappedRelationship {
  const regex = /\[?([a-zA-Z0-9_-]+)\]? -- ([a-zA-Z0-9_-]+)/;
  const match = regex.exec(role);
  if (match) {
    const awsAccountName = match[1];
    const roleName = match[2];
    return {
      _key: `${sourceKey}|assigned|${awsAccountName}|${roleName}`,
      _type: "okta_user_assigned_aws_iam_role",
      _class: "ASSIGNED",
      _fromEntityKey: sourceKey,
      _toEntityKey: `${awsAccountName}:${roleName}`,
      _mapping: {
        sourceEntityKey: sourceKey,
        relationshipDirection: RelationshipDirection.REVERSE,
        targetFilterKeys: [["_type", "roleName", "tag.AccountName"]],
        targetEntity: {
          _class: "AccessRole",
          _type: "aws_iam_role",
          roleName,
          name: roleName,
          displayName: roleName,
          "tag.AccountName": awsAccountName,
        },
        skipTargetCreation: true,
      },
      displayName: "ASSIGNED",
    };
  } else {
    const roleArn = `arn:aws:iam::${awsAccountId}:role/${role}`;
    return {
      _key: `${sourceKey}|assigned|${roleArn}`,
      _type: "okta_user_assigned_aws_iam_role",
      _class: "ASSIGNED",
      _fromEntityKey: sourceKey,
      _toEntityKey: roleArn,
      _mapping: {
        sourceEntityKey: sourceKey,
        relationshipDirection: RelationshipDirection.REVERSE,
        targetFilterKeys: [["_type", "_key"]],
        targetEntity: {
          _class: "AccessRole",
          _type: "aws_iam_role",
          _key: roleArn,
          roleName: role,
          name: role,
          displayName: role,
        },
        skipTargetCreation: true,
      },
      displayName: "ASSIGNED",
    };
  }
}
