import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  IntegrationMissingKeyError,
  RelationshipDirection,
  createMappedRelationship,
} from '@jupiterone/integration-sdk-core';
import * as url from 'url';
import * as lodash from 'lodash';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { DATA_ACCOUNT_ENTITY } from './account';
import { USER_GROUP_ENTITY_TYPE } from './access';

import buildAppShortName from '../util/buildAppShortName';
import getOktaAccountInfo from '../util/getOktaAccountInfo';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';
import {
  getAccountName,
  getVendorName,
  isMultiInstanceApp,
} from '../util/knownVendors';

import { OktaIntegrationConfig } from '../types';

export const APPLICATION_ENTITY_TYPE = 'okta_application';
export const GROUP_IAM_ROLE_RELATIONSHIP_TYPE =
  'okta_user_group_assigned_aws_iam_role';
export const USER_IAM_ROLE_RELATIONSHIP_TYPE =
  'okta_user_assigned_aws_iam_role';

export async function fetchApplications({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateApplications(async (app) => {
    delete app.credentials; //some OAuth config options stored here
    const webLink = url.resolve(
      getOktaAccountAdminUrl(instance.config as OktaIntegrationConfig),
      `/admin/app/${app.name}/instance/${app.id}`,
    );

    let imageUrl;
    let loginUrl;

    if (app._links?.logo) {
      imageUrl = lodash.flatten([app._links.logo])[0].href;
    }

    if (app._links?.appLinks) {
      const links = lodash.flatten([app._links.appLinks]);
      const link = links.find((l) => l.name === 'login') || links[0];
      loginUrl = link && link.href;
    }

    const oktaAccountInfo = getOktaAccountInfo(instance);
    const appShortName = buildAppShortName(oktaAccountInfo, app.name);

    const assignData = {
      _key: app.id,
      _type: APPLICATION_ENTITY_TYPE,
      _class: 'Application',
      id: app.id,
      displayName: app.label || app.name || app.id,
      name: app.name || app.label,
      shortName: appShortName,
      label: app.label,
      status: app.status,
      active: app.status === 'ACTIVE',
      lastUpdated: app.lastUpdated,
      created: app.created,
      features: app.features,
      signOnMode: app.signOnMode,
      appVendorName: getVendorName(appShortName),
      appAccountType: getAccountName(appShortName),
      isMultiInstanceApp: isMultiInstanceApp(appShortName),
      isSAMLApp: !!app.signOnMode && app.signOnMode.startsWith('SAML'),
      webLink,
      imageUrl,
      loginUrl,
    };

    const appSettings = app.settings?.app;
    if (appSettings) {
      if (appSettings.awsEnvironmentType === 'aws.amazon') {
        if (appSettings.identityProviderArn) {
          const awsAccountIdMatch = /^arn:aws:iam::([0-9]+):/.exec(
            appSettings.identityProviderArn,
          );
          if (awsAccountIdMatch) {
            assignData['awsAccountId'] = awsAccountIdMatch[1];
            assignData['appAccountId'] = awsAccountIdMatch[1];
          }
        }

        assignData['awsIdentityProviderArn'] = appSettings.identityProviderArn;
        assignData['awsEnvironmentType'] = appSettings.awsEnvironmentType;
        assignData['awsGroupFilter'] = appSettings.groupFilter;
        assignData['awsRoleValuePattern'] = appSettings.roleValuePattern;
        assignData['awsJoinAllRoles'] = appSettings.joinAllRoles;
        assignData['awsSessionDuration'] = appSettings.sessionDuration;
      } else if (appSettings.githubOrg) {
        assignData['githubOrg'] = appSettings.githubOrg;
        assignData['appAccountId'] = appSettings.githubOrg;
      } else if (appSettings.domain) {
        // Google Cloud Platform and G Suite apps use `domain` as the account identifier
        assignData['appDomain'] = appSettings.domain;
        assignData['appAccountId'] = appSettings.domain;
      }
    }

    const appEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: app,
          assign: { ...assignData },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: appEntity,
      }),
    );

    //get the groups that are assigned to this app
    await apiClient.iterateGroupsForApp(app, async (group) => {
      const groupEntity = await jobState.findEntity(group.id);

      if (!groupEntity) {
        throw new IntegrationMissingKeyError(
          `Expected group with key to exist (key=${group.id})`,
        );
      }

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.ASSIGNED,
          from: groupEntity,
          to: appEntity,
        }),
      );

      //if this appEntity points to an AWS IAM resource,
      //also add global mappings for this group to that resource
      if (assignData['awsAccountId']) {
        if (group.profile) {
          const profile = group.profile;
          for (const role of profile.samlRoles || [profile.role]) {
            const relationship = mapAWSRoleAssignment({
              sourceKey: group.id,
              role,
              relationshipType: GROUP_IAM_ROLE_RELATIONSHIP_TYPE,
              awsAccountId: assignData['awsAccountId'],
            });
            if (relationship) {
              await jobState.addRelationship(relationship);
            }
          }
        }
      }
    });

    //get the individual users that are assigned to this app (ie. not assigned as part of group)
    await apiClient.iterateUsersForApp(app, async (user) => {
      const userEntity = await jobState.findEntity(user.id);

      if (!userEntity) {
        throw new IntegrationMissingKeyError(
          `Expected user with key to exist (key=${user.id})`,
        );
      }

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.ASSIGNED,
          from: userEntity,
          to: appEntity,
        }),
      );

      //if this appEntity points to an AWS IAM resource,
      //also add global mappings for this user to that resource
      if (assignData['awsAccountId']) {
        if (user.profile) {
          const profile = user.profile;
          for (const role of profile.samlRoles || [profile.role]) {
            const relationship = mapAWSRoleAssignment({
              sourceKey: user.id,
              role: role || '',
              relationshipType: USER_IAM_ROLE_RELATIONSHIP_TYPE,
              awsAccountId: assignData['awsAccountId'],
            });
            if (relationship) {
              await jobState.addRelationship(relationship);
            }
          }
        }
      }
    });
  });
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
 * @param sourceKey the `_key` of the user or group which has access to the
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
}) {
  const regex = /\[?([a-zA-Z0-9_-]+)\]? -- ([a-zA-Z0-9_-]+)/;
  const match = role && regex.exec(role);

  if (match) {
    const awsAccountName = match[1];
    const roleName = match[2];
    return createMappedRelationship({
      _key: `${sourceKey}|assigned|${awsAccountName}|${roleName}`,
      _type: relationshipType,
      _class: RelationshipClass.ASSIGNED,
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
    });
  } else if (role) {
    const roleArn = `arn:aws:iam::${awsAccountId}:role/${role}`;
    return createMappedRelationship({
      _key: `${sourceKey}|assigned|${roleArn}`,
      _type: relationshipType,
      _class: RelationshipClass.ASSIGNED,
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
    });
  }
}

export const applicationSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-applications',
    name: 'Fetch Applications',
    entities: [
      {
        resourceName: 'Okta Application',
        _type: APPLICATION_ENTITY_TYPE,
        _class: 'Application',
      },
    ],
    relationships: [
      {
        _type: 'okta_account_has_application',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: 'okta_user_group_assigned_application',
        _class: RelationshipClass.ASSIGNED,
        sourceType: USER_GROUP_ENTITY_TYPE,
        targetType: APPLICATION_ENTITY_TYPE,
      },
      {
        _type: 'okta_user_assigned_application',
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_user',
        targetType: APPLICATION_ENTITY_TYPE,
      },
    ],
    dependsOn: ['fetch-users'],
    executionHandler: fetchApplications,
  },
];
