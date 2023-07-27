import {
  MappedRelationship,
  RelationshipDirection,
} from '@jupiterone/integration-sdk-core';

import { OktaApplicationGroup, OktaApplicationUser } from '../../okta/types';
import { StandardizedOktaApplication } from '../../types';

export function getRoles(group: OktaApplicationGroup): string | undefined {
  return group.profile && group.profile.samlRoles
    ? JSON.stringify(group.profile.samlRoles)
    : undefined;
}

export function getRole(group: OktaApplicationGroup): string | undefined {
  return stringifyIfArray(group.profile ? group.profile.role : undefined);
}

export function convertAWSRolesToRelationships(
  application: StandardizedOktaApplication,
  oktaPrincipal: OktaApplicationUser | OktaApplicationGroup,
  relationshipType: string,
  onInvalidRoleFormat: (invalidRole: any) => void,
): MappedRelationship[] {
  const relationships: MappedRelationship[] = [];
  if (application.awsAccountId && oktaPrincipal.profile) {
    const profile = oktaPrincipal.profile;
    for (const role of profile.samlRoles || [profile.role]) {
      if (Array.isArray(role)) {
        onInvalidRoleFormat(role);
        continue;
      }

      const relationship = mapAWSRoleAssignment({
        sourceKey: oktaPrincipal.id,
        role,
        relationshipType,
        awsAccountId: application.awsAccountId,
      });
      if (relationship) {
        relationships.push(relationship);
      }
    }
  }
  return relationships;
}

/**
 * When an Okta application represents access to an AWS Account (the application
 * has an `awsAccountId`), the application user or group profile may define a
 * `role` or `samlRoles` property that identifies one or more AWS IAM roles that
 * may be assumed by the user or group. The roles are parsed to create mapped
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
export function mapAWSRoleAssignment({
  sourceKey,
  role,
  relationshipType,
  awsAccountId,
}: {
  sourceKey: string;
  role: string;
  relationshipType: string;
  awsAccountId: string;
}): MappedRelationship | undefined {
  const regex = /\[?([a-zA-Z0-9_-]+)\]? -- ([a-zA-Z0-9_-]+)/;
  const match = role && regex.exec(role);

  if (match) {
    const awsAccountName = match[1];
    const roleName = match[2];
    return {
      _key: `${sourceKey}|assigned|${awsAccountName}|${roleName}`,
      _type: relationshipType,
      _class: 'ASSIGNED',
      _mapping: {
        sourceEntityKey: sourceKey,
        relationshipDirection: RelationshipDirection.REVERSE,
        targetFilterKeys: [['_type', 'roleName', 'tag.AccountName']],
        targetEntity: {
          _class: 'AccessRole',
          _type: 'aws_iam_role',
          roleName,
          name: roleName,
          displayName: roleName,
          'tag.AccountName': awsAccountName,
        },
        skipTargetCreation: true,
      },
      displayName: 'ASSIGNED',
    };
  } else if (role) {
    const roleArn = `arn:aws:iam::${awsAccountId}:role/${role}`;
    return {
      _key: `${sourceKey}|assigned|${roleArn}`,
      _type: relationshipType,
      _class: 'ASSIGNED',
      _mapping: {
        sourceEntityKey: sourceKey,
        relationshipDirection: RelationshipDirection.REVERSE,
        targetFilterKeys: [['_type', '_key']],
        targetEntity: {
          _class: 'AccessRole',
          _type: 'aws_iam_role',
          _key: roleArn,
          roleName: role,
          name: role,
          displayName: role,
        },
        skipTargetCreation: true,
      },
      displayName: 'ASSIGNED',
    };
  }
}

function stringifyIfArray<T>(v: T) {
  return Array.isArray(v) ? JSON.stringify(v) : v;
}
