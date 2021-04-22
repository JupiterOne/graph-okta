import * as url from 'url';

import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { DATA_ACCOUNT_ENTITY } from '../okta/constants';
import getOktaAccountAdminUrl from '../util/getOktaAccountAdminUrl';
import { convertCredentialEmails } from '../util/convertCredentialEmails';

export async function fetchUsers({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateUsers(async (user) => {
    const webLink = url.resolve(
      getOktaAccountAdminUrl(instance.config),
      `/admin/user/profile/view/${user.id}`,
    );
    const emailProperties = convertCredentialEmails(user.credentials);
    delete user.credentials; //no PII for you in raw objects
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
  });
}

export const userSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-users',
    name: 'Fetch Users',
    entities: [
      {
        resourceName: 'Okta User',
        _type: 'okta_user',
        _class: 'User',
      },
    ],
    relationships: [
      {
        _type: 'okta_account_has_user',
        _class: RelationshipClass.HAS,
        sourceType: 'okta_account',
        targetType: 'okta_user',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchUsers,
  },
];
