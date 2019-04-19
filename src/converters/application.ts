import * as url from "url";

import {
  IntegrationInstance,
  IntegrationRelationship,
  MappedRelationshipFromIntegration,
  RelationshipDirection,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { OktaApplication } from "../okta/types";
import {
  StandardizedOktaApplication,
  StandardizedOktaApplicationGroupRelationship,
  StandardizedOktaApplicationUserRelationship,
  StandardizedOktaUser,
  StandardizedOktaUserGroup,
} from "../types";
import buildAppShortName from "../util/buildAppShortName";
import getOktaAccountAdminUrl from "../util/getOktaAccountAdminUrl";
import getOktaAccountInfo from "../util/getOktaAccountInfo";
import {
  getAccountName,
  getVendorName,
  isMultiInstanceApp,
} from "../util/knownVendors";

export const APPLICATION_ENTITY_TYPE = "okta_application";
export const APPLICATION_USER_RELATIONSHIP_TYPE =
  "okta_user_assigned_application";
export const USER_IAM_ROLE_RELATIONSHIP_TYPE =
  "okta_user_assigned_aws_iam_role";

export const APPLICATION_GROUP_RELATIONSHIP_TYPE =
  "okta_group_assigned_application";

export function createApplicationEntity(
  instance: IntegrationInstance,
  data: OktaApplication,
): StandardizedOktaApplication {
  const webLink = url.resolve(
    getOktaAccountAdminUrl(instance.config),
    `/admin/app/${data.name}/instance/${data.id}`,
  );

  const oktaAccountInfo = getOktaAccountInfo(instance);
  const appShortName = buildAppShortName(oktaAccountInfo, data.name);

  const entity: StandardizedOktaApplication = {
    _key: data.id,
    _type: APPLICATION_ENTITY_TYPE,
    _class: "Application",
    displayName: data.label || data.name || data.id,
    id: data.id,
    name: data.name || data.label,
    shortName: appShortName,
    label: data.label,
    status: data.status,
    active: data.status === "ACTIVE",
    lastUpdated: data.lastUpdated,
    created: data.created,
    features: data.features,
    signOnMode: data.signOnMode,
    appVendorName: getVendorName(appShortName),
    appAccountType: getAccountName(appShortName),
    isMultiInstanceApp: isMultiInstanceApp(appShortName),
    isSAMLApp: !!data.signOnMode && data.signOnMode.startsWith("SAML"),
    webLink,
  };

  const settings = data.settings;
  const appSettings = settings.app;
  if (appSettings) {
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
  }

  return entity;
}

export function createApplicationGroupRelationship(
  application: StandardizedOktaApplication,
  group: StandardizedOktaUserGroup,
): StandardizedOktaApplicationGroupRelationship {
  const relationship: StandardizedOktaApplicationGroupRelationship = {
    _key: `${group._key}|assigned|${application._key}`,
    _type: APPLICATION_GROUP_RELATIONSHIP_TYPE,
    _class: "ASSIGNED",
    _fromEntityKey: group._key,
    _toEntityKey: application._key,
    displayName: "ASSIGNED",
    applicationId: application.id,
    groupId: group.id,
  };

  if (application.awsAccountId) {
    // Array property not supported on the edge in Neptune
    relationship.roles = JSON.stringify(group.samlRoles);
    relationship.role = group.role;
  }

  return relationship;
}

export function createApplicationUserRelationships(
  application: StandardizedOktaApplication,
  user: StandardizedOktaUser,
) {
  const relationships: IntegrationRelationship[] = [];

  const relationship: StandardizedOktaApplicationUserRelationship = {
    _key: `${user._key}|assigned|${application._key}`,
    _type: APPLICATION_USER_RELATIONSHIP_TYPE,
    _class: "ASSIGNED",
    _fromEntityKey: user._key,
    _toEntityKey: application._key,
    displayName: "ASSIGNED",
    applicationId: application.id,
    userId: user.id,
    userEmail: user.email,
  };

  if (application.awsAccountId) {
    // Array property not supported on the edge in Neptune
    relationship.roles = JSON.stringify(user.samlRoles);
    relationship.role = user.role;

    if (user.samlRoles) {
      for (const samlRole of user.samlRoles) {
        relationships.push(
          mapAWSRoleAssignment(user._key, samlRole, application.awsAccountId),
        );
      }
    } else if (user.role) {
      relationships.push(
        mapAWSRoleAssignment(user._key, user.role, application.awsAccountId),
      );
    }
  }

  relationships.push(relationship);

  return relationships;
}

/**
 * When Okta provides a user access to an AWS account (an application with
 * `awsAccountId`), the user `samlRoles` or `role` identifies an AWS IAM role
 * that may be assumed by the user. The roles are parsed to create mapped
 * relationships to the AWS IAM roles. The relationship is not created unless
 * the role is already in the graph.
 *
 * See
 * https://saml-doc.okta.com/SAML_Docs/How-to-Configure-SAML-2.0-for-Amazon-Web-Service#scenarioB,
 * bullet point #11.
 *
 * - The primary SAML roles are listed directly
 * - The secondary SAML roles are listed as `Account Name - Role Name` or
 *   `[Account Alias] - Role Name`
 *
 * @param sourceKey the `_key` of the user which has access to the
 * `awsAccountId`
 * @param role the AWS IAM role identifier provided by Okta
 * @param awsAccountId the application `awsAccountId`
 */
function mapAWSRoleAssignment(
  sourceKey: string,
  role: string,
  awsAccountId: string,
): MappedRelationshipFromIntegration {
  const regex = /\[?([a-zA-Z0-9_-]+)\]? -- ([a-zA-Z0-9_-]+)/;
  const match = regex.exec(role);
  if (match) {
    const awsAccountName = match[1];
    const roleName = match[2];
    return {
      _key: `${sourceKey}|assigned|${awsAccountName}|${roleName}`,
      _type: USER_IAM_ROLE_RELATIONSHIP_TYPE,
      _class: "ASSIGNED",
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
