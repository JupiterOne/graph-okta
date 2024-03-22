import {
  IntegrationLogger,
  IntegrationStep,
  IntegrationStepExecutionContext,
  Relationship,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  createAccountApplicationRelationship,
  createApplicationEntity,
  createApplicationGroupRelationships,
  createApplicationUserRelationships,
} from '../converters';
import { accountFlagged } from '../okta/createOktaClient';
import { StandardizedOktaAccount, StandardizedOktaApplication } from '../types';
import { StepAnnouncer } from '../util/runningTimer';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  IngestionSources,
  Relationships,
  Steps,
} from './constants';

export async function fetchApplications({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  let stepAnnouncer;
  if (accountFlagged) {
    stepAnnouncer = new StepAnnouncer(Steps.APPLICATIONS, logger);
  }

  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as StandardizedOktaAccount;

  try {
    await apiClient.iterateApplications(async (app) => {
      const appEntity = createApplicationEntity(
        instance,
        app,
      ) as StandardizedOktaApplication;
      if (!appEntity) {
        return;
      }

      await jobState.addEntity(appEntity);
      await jobState.addRelationship(
        createAccountApplicationRelationship(accountEntity, appEntity),
      );

      const appId = app.id as string;

      //get the groups that are assigned to this app
      await apiClient.iterateGroupsForApp(appId, async (group) => {
        if (!group.id) {
          return;
        }

        if (jobState.hasKey(group.id)) {
          const relationships = createApplicationGroupRelationships(
            appEntity,
            group,
            createOnInvalidRoleFormatFunction(logger, {
              appId,
              groupId: group.id,
            }),
          );

          /**
           * Multiple relationships for the same group can be encountered if the
           * app has specific profiles associated.
           * *
           * For example, the AWS Account Federation app has a profile that
           * specifies "role". The same group could be assigned multiple roles,
           * such as `Developer` and `DeveloperExternal`.
           *
           *  {
           *    id: '00gc3frhdodo90K6Q4x7',
           *    lastUpdated: '2023-04-07T19:19:30.000Z',
           *    priority: 0,
           *    profile: { role: 'Developer' },
           *  }
           *  {
           *    id: '00gc3frhdodo90K6Q4x7',
           *    lastUpdated: '2023-04-07T19:19:30.000Z',
           *    priority: 1,
           *    profile: { role: 'DeveloperExternal' },
           *  }
           */
          for (const r of relationships) {
            if (r._key && !jobState.hasKey(r._key)) {
              await jobState.addRelationship(r);
            }
          }
        } else {
          logger.warn(
            { appId: app.id, appName: app.name, groupId: group.id },
            '[SKIP] Group not found in job state, could not build relationship to application',
          );
        }
      });

      //get the individual users that are assigned to this app (ie. not assigned as part of group)
      await apiClient.iterateUsersForApp(appId, async (user) => {
        if (!user.id) {
          return;
        }

        if (jobState.hasKey(user.id)) {
          const relationships: Relationship[] =
            createApplicationUserRelationships(
              appEntity,
              user,
              createOnInvalidRoleFormatFunction(logger, {
                appId,
                userId: user.id,
              }),
            );
          //these relationships include both USER_ASSIGNED_APPLICATION and USER_ASSIGNED_AWS_IAM_ROLE
          //USER_ASSIGNED_APPLICATION will be unique to this user and app pair
          //however, multiple apps for that user can use AWS and have the same IAM Role assigned
          //therefore, the USER_ASSIGNED_AWS_IAM_ROLE relationship may have been specified in a previous app for this user
          for (const rel of relationships) {
            if (!jobState.hasKey(rel._key)) {
              await jobState.addRelationship(rel);
            }
          }
        } else {
          logger.warn(
            { appId: app.id, appName: app.name, userId: user.id },
            '[SKIP] User not found in job state, could not build relationship to application',
          );
        }
      });
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch applications');
  }

  if (accountFlagged) {
    stepAnnouncer.finish();
  }
}

function createOnInvalidRoleFormatFunction(
  logger: IntegrationLogger,
  loggedData: any,
) {
  return (invalidRole: any) => {
    logger.info(
      {
        ...loggedData,
        typeInvalidRole: typeof invalidRole,
        invalidRoleLen: Array.isArray(invalidRole)
          ? invalidRole.length
          : undefined,
      },
      'Found invalid role',
    );
  };
}

export const applicationSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.APPLICATIONS,
    ingestionSourceId: IngestionSources.APPLICATIONS,
    name: 'Fetch Applications',
    entities: [Entities.APPLICATION],
    relationships: [
      Relationships.ACCOUNT_HAS_APPLICATION,
      Relationships.GROUP_ASSIGNED_APPLICATION,
      Relationships.USER_ASSIGNED_APPLICATION,
      Relationships.USER_ASSIGNED_AWS_IAM_ROLE,
      Relationships.USER_GROUP_ASSIGNED_AWS_IAM_ROLE,
    ],
    dependsOn: [Steps.GROUPS],
    executionHandler: fetchApplications,
  },
];
