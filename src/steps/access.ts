import * as url from 'url';

import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  parseTimePropertyValue,
  IntegrationMissingKeyError,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { DATA_ACCOUNT_ENTITY } from './account';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';
import { convertCredentialEmails } from '../util/convertCredentialEmails';

export const USER_GROUP_ENTITY_TYPE = 'okta_user_group';
export const APP_USER_GROUP_ENTITY_TYPE = 'okta_app_user_group';
export const MFA_DEVICE_ENTITY_TYPE = 'mfa_device';

export async function fetchUsers({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateUsers(async (user) => {
    delete user.credentials; //no PII for you
    const webLink = url.resolve(
      getOktaAccountAdminUrl(instance.config),
      `/admin/user/profile/view/${user.id}`,
    );
    const emailProperties = convertCredentialEmails(user.credentials);
    const profile = user.profile;
    const userEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: user,
          assign: {
            _key: user.id,
            _type: 'okta_user',
            _class: 'User',
            name: `${profile.firstName} ${profile.lastName}`,
            displayName: profile.login,
            webLink: webLink,
            id: user.id,
            username: user.profile.login.split('@')[0],
            email: user.profile.email.toLowerCase(),
            verifiedEmails: emailProperties?.verifiedEmails,
            unverifiedEmails: emailProperties?.unverifiedEmails,
            status: user.status,
            active: user.status === 'ACTIVE',
            created: parseTimePropertyValue(user.created)!,
            createdOn: parseTimePropertyValue(user.created)!,
            activated: parseTimePropertyValue(user.activated)!,
            activatedOn: parseTimePropertyValue(user.activated)!,
            statusChanged: parseTimePropertyValue(user.statusChanged)!,
            statusChangedOn: parseTimePropertyValue(user.statusChanged),
            lastLogin: parseTimePropertyValue(user.lastLogin),
            lastLoginOn: parseTimePropertyValue(user.lastLogin),
            lastUpdated: parseTimePropertyValue(user.lastUpdated)!,
            lastUpdatedOn: parseTimePropertyValue(user.lastUpdated)!,
            passwordChanged: parseTimePropertyValue(user.passwordChanged),
            passwordChangedOn: parseTimePropertyValue(user.passwordChanged),
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: userEntity,
      }),
    );

    //assign this user to their groups
    await apiClient.iterateGroupsForUser(user, async (group) => {
      const groupEntity = await jobState.findEntity(group.id);

      if (!groupEntity) {
        throw new IntegrationMissingKeyError(
          `Expected group with key to exist (key=${group.id})`,
        );
      }

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: groupEntity,
          to: userEntity,
        }),
      );
    });

    //discover any Multi Factor Authentication devices assigned to this user
    await apiClient.iterateFactorsForUser(user, async (factor) => {
      const factorEntity = await jobState.addEntity(
        createIntegrationEntity({
          entityData: {
            source: factor,
            assign: {
              _key: factor.id,
              _type: MFA_DEVICE_ENTITY_TYPE,
              _class: ['Key', 'AccessKey'],
              displayName: `${factor.provider} ${factor.factorType}`,
              id: factor.id,
              factorType: factor.factorType,
              provider: factor.provider,
              vendorName: factor.vendorName,
              device: factor.device,
              deviceType: factor.deviceType,
              status: factor.status,
              created: factor.created,
              lastUpdated: factor.lastUpdated,
              active: factor.status === 'ACTIVE',
            },
          },
        }),
      );

      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.ASSIGNED,
          from: userEntity,
          to: factorEntity,
        }),
      );
    });
  });
}

export async function fetchGroups({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateGroups(async (group) => {
    const webLink = url.resolve(
      getOktaAccountAdminUrl(instance.config),
      `/admin/group/${group.id}`,
    );
    const entityType =
      group.type === 'APP_GROUP'
        ? APP_USER_GROUP_ENTITY_TYPE
        : USER_GROUP_ENTITY_TYPE;

    const groupEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: group,
          assign: {
            _key: group.id,
            _type: entityType,
            _class: 'UserGroup',
            id: group.id,
            webLink: webLink,
            name: group.profile.name,
            displayName: group.profile.name,
            created: parseTimePropertyValue(group.created)!,
            createdOn: parseTimePropertyValue(group.created)!,
            lastUpdated: parseTimePropertyValue(group.lastUpdated)!,
            lastUpdatedOn: parseTimePropertyValue(group.lastUpdated)!,
            lastMembershipUpdated: parseTimePropertyValue(
              group.lastMembershipUpdated,
            )!,
            lastMembershipUpdatedOn: parseTimePropertyValue(
              group.lastMembershipUpdated,
            )!,
            objectClass: group.objectClass,
            type: group.type,
            description: group.profile.description,
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: groupEntity,
      }),
    );
  });
}

export const accessSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-users',
    name: 'Fetch Users',
    entities: [
      {
        resourceName: 'Okta User',
        _type: 'okta_user',
        _class: 'User',
      },
      {
        resourceName: 'Okta Factor Device',
        _type: MFA_DEVICE_ENTITY_TYPE,
        _class: 'Key',
      },
    ],
    relationships: [
      {
        _type: 'okta_account_has_user',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: 'okta_user',
      },
      {
        _type: 'okta_user_group_has_user',
        _class: RelationshipClass.HAS,
        sourceType: USER_GROUP_ENTITY_TYPE,
        targetType: 'okta_user',
      },
      {
        _type: 'okta_app_user_group_has_user',
        _class: RelationshipClass.HAS,
        sourceType: APP_USER_GROUP_ENTITY_TYPE,
        targetType: 'okta_user',
      },
      {
        _type: 'okta_user_assigned_mfa_device',
        _class: RelationshipClass.ASSIGNED,
        sourceType: 'okta_user',
        targetType: MFA_DEVICE_ENTITY_TYPE,
      },
    ],
    dependsOn: ['fetch-groups'],
    executionHandler: fetchUsers,
  },
  {
    id: 'fetch-groups',
    name: 'Fetch Groups',
    entities: [
      {
        resourceName: 'Okta UserGroup',
        _type: USER_GROUP_ENTITY_TYPE,
        _class: 'UserGroup',
      },
      {
        resourceName: 'Okta App UserGroup',
        _type: APP_USER_GROUP_ENTITY_TYPE,
        _class: 'UserGroup',
      },
    ],
    relationships: [
      {
        _type: 'okta_account_has_user_group',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: USER_GROUP_ENTITY_TYPE,
      },
      {
        _type: 'okta_account_has_app_user_group',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: APP_USER_GROUP_ENTITY_TYPE,
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchGroups,
  },
];
