import {
  IntegrationLogger,
  IntegrationProviderAuthenticationError,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from './config';
export type ResourceIteratee<T> = (each: T) => Promise<void> | void;
import createOktaClient from './okta/createOktaClient';
import {
  ApplicationGroupAssignment,
  Group,
  GroupRule,
  LogEvent,
  OrgOktaSupportSettingsObj,
  Role,
} from '@okta/okta-sdk-nodejs';
import {
  OktaApplication,
  OktaApplicationUser,
  OktaClient,
  OktaDevice,
  OktaFactor,
  OktaUser,
} from './okta/types';
import { expandUsersMiddleware } from './okta/middlewares';

const NINETY_DAYS_AGO = 90 * 24 * 60 * 60 * 1000;

/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient {
  oktaClient: OktaClient;
  logger: IntegrationLogger;
  constructor(
    readonly config: IntegrationConfig,
    logger: IntegrationLogger,
  ) {
    this.oktaClient = createOktaClient(logger, config);
    this.logger = logger;
  }

  public async verifyAuthentication(): Promise<void> {
    // the most light-weight request possible to validate credentials

    try {
      //note that if you don't hit the .each, it doesn't actually attempt it
      const collection = await this.oktaClient.userApi.listUsers({ limit: 1 });
      await collection.each(() => false);
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: this.config.oktaOrgUrl + '/api/v1/users?limit=1',
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  /**
   * Iterates each user resource in the provider.
   * Then iterates each deprovisioned user resource.
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<OktaUser>,
  ): Promise<void> {
    const usersCollection = await this.oktaClient.userApi.listUsers();
    await usersCollection.each(iteratee);
    const deprovisionedUsersCollection =
      await this.oktaClient.userApi.listUsers({
        search: 'status eq "DEPROVISIONED"',
      });
    await deprovisionedUsersCollection.each(iteratee);
  }

  /**
   * Iterates each group resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateGroups(iteratee: ResourceIteratee<Group>): Promise<void> {
    const groupsCollection = await this.oktaClient.groupApi.listGroups({
      expand: 'stats',
    });
    await groupsCollection.each(iteratee);
  }

  /**
   * Iterates each user resource assigned to a given group.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateUsersForGroup(
    groupId: string,
    iteratee: ResourceIteratee<OktaUser>,
  ): Promise<void> {
    try {
      const groupUsersCollection =
        await this.oktaClient.groupApi.listGroupUsers({
          groupId,
          // The number of users returned for the given group defaults to 1000
          // according to the Okta API docs:
          //
          // https://developer.okta.com/docs/reference/api/groups/#list-group-members
          limit: 10000,
        });
      await groupUsersCollection.each(iteratee);
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably a group that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each Multi-Factor Authentication device assigned to a given user.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateFactorDevicesForUser(
    userId: string,
    iteratee: ResourceIteratee<OktaFactor>,
  ): Promise<void> {
    try {
      // Okta API does not currently allow a limit to be specified on the list
      // factors API.
      //
      // See: https://developer.okta.com/docs/reference/api/factors/#list-enrolled-factors
      const userFactorsCollection =
        await this.oktaClient.userFactorApi.listFactors({ userId });
      await userFactorsCollection.each(iteratee);
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably a user that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each device resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateDevices(
    iteratee: ResourceIteratee<OktaDevice>,
  ): Promise<void> {
    const devicesCollection = await this.oktaClient.deviceApi.listDevices(
      undefined,
      {
        ...this.oktaClient.configuration,
        middleware: [
          ...this.oktaClient.configuration.middleware,
          // adds `expand=user` query param to requests, okta-sdk-nodejs@7.0.1 doesn't support it.
          expandUsersMiddleware,
        ],
      },
    );
    await devicesCollection.each(iteratee);
  }

  /**
   * Iterates each application resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateApplications(
    iteratee: ResourceIteratee<OktaApplication>,
  ): Promise<void> {
    const applicationsCollection =
      await this.oktaClient.applicationApi.listApplications({
        // Maximum is 200, default is 20 if not specified:
        //
        // See: https://developer.okta.com/docs/reference/api/apps/#list-applications
        limit: 200,
      });
    await applicationsCollection.each(iteratee);
  }

  /**
   * Iterates each group assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateGroupsForApp(
    appId: string,
    iteratee: ResourceIteratee<ApplicationGroupAssignment>,
  ): Promise<void> {
    try {
      const appGroupAssignmentsCollection =
        await this.oktaClient.applicationApi.listApplicationGroupAssignments({
          appId,
          // Maximum is 200, default is 20 if not specified:
          //
          // See: https://developer.okta.com/docs/reference/api/apps/#list-groups-assigned-to-application
          limit: 200,
        });
      await appGroupAssignmentsCollection.each(iteratee);
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably an app that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each individual user assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsersForApp(
    appId: string,
    iteratee: ResourceIteratee<OktaApplicationUser>,
  ): Promise<void> {
    try {
      const appUsersCollection =
        await this.oktaClient.applicationApi.listApplicationUsers({
          appId,
          // Maximum is 500, default is 50 if not specified:
          //
          // See: https://developer.okta.com/docs/reference/api/apps/#list-users-assigned-to-application
          limit: 500,
        });
      await appUsersCollection.each(iteratee);
    } catch (err) {
      if (err.status === 404) {
        //ignore it. It's probably an app that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each rule resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateRules(
    iteratee: ResourceIteratee<GroupRule>,
  ): Promise<void> {
    try {
      const groupRulesCollection =
        await this.oktaClient.groupApi.listGroupRules();
      await groupRulesCollection.each(iteratee);
    } catch (err) {
      //per https://developer.okta.com/docs/reference/error-codes/
      if (/\/api\/v1\/groups\/rules/.test(err.url) && err.status === 400) {
        this.logger.info(
          'Rules not enabled for this account. Skipping processing of Okta Rules.',
        );
      } else {
        throw err;
      }
    }
  }

  public async getSupportInfo(): Promise<OrgOktaSupportSettingsObj> {
    return this.oktaClient.orgSettingApi.getOrgOktaSupportSettings();
  }

  public async iterateRolesByUser(
    userId: string,
    iteratee: ResourceIteratee<Role>,
  ): Promise<void> {
    const rolesCollection =
      await this.oktaClient.roleAssignmentApi.listAssignedRolesForUser({
        userId,
      });
    await rolesCollection.each(iteratee);
  }

  public async iterateRolesByGroup(
    groupId: string,
    iteratee: ResourceIteratee<Role>,
  ): Promise<void> {
    const rolesCollection =
      await this.oktaClient.roleAssignmentApi.listGroupAssignedRoles({
        groupId,
      });
    await rolesCollection.each(iteratee);
  }

  public async iterateAppCreatedLogs(
    iteratee: ResourceIteratee<LogEvent>,
  ): Promise<void> {
    // Use filter to only find instances of a newly created application.
    // We must specify 'since' to a time far in the past, otherwise we
    // will only get the last 7 days of data.  Okta only saves the last
    // 90 days, so this is not us limiting what we're able to get.
    const daysAgo = Date.now() - NINETY_DAYS_AGO;
    const startDate = new Date(daysAgo);
    const logEventsCollection =
      await this.oktaClient.systemLogApi.listLogEvents({
        filter:
          'eventType eq "application.lifecycle.update" and debugContext.debugData.requestUri ew "_new_"',
        since: startDate,
      });
    await logEventsCollection.each(iteratee);
  }
}

let client: APIClient | undefined;

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  if (!client) {
    client = new APIClient(config, logger);
  }
  return client;
}
