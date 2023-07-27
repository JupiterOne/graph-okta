/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-empty-function */
import {
  IntegrationLogger,
  IntegrationProviderAuthenticationError,
  IntegrationProviderAuthorizationError,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from './config';
export type ResourceIteratee<T> = (each: T) => Promise<void> | void;
import createOktaClient from './okta/createOktaClient';
import {
  AppUser,
  Application,
  ApplicationGroupAssignment,
  Client,
  Group,
  GroupRule,
  LogEvent,
  OrgOktaSupportSettingsObj,
  Role,
  User,
  UserFactor,
} from '@okta/okta-sdk-nodejs';

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
  oktaClient: Client;
  logger: IntegrationLogger;
  constructor(readonly config: IntegrationConfig, logger: IntegrationLogger) {
    this.oktaClient = createOktaClient(logger, config);
    this.logger = logger;
  }

  public async verifyAuthentication(): Promise<void> {
    // the most light-weight request possible to validate credentials

    try {
      //note that if you don't hit the .each, it doesn't actually attempt it
      const users = await this.oktaClient.userApi.listUsers({ limit: 1 });
      await users.each(() => false);
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
  public async iterateUsers(iteratee: ResourceIteratee<User>): Promise<void> {
    try {
      const users = await this.oktaClient.userApi.listUsers();
      await users.each(iteratee);

      const deprovisionedUsers = await this.oktaClient.userApi.listUsers({
        filter: 'status eq "DEPROVISIONED"',
      });
      await deprovisionedUsers.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      }
    }
  }

  /**
   * Iterates each group resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateGroups(iteratee: ResourceIteratee<Group>): Promise<void> {
    try {
      const groups = await this.oktaClient.groupApi.listGroups();
      await groups.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      }
    }
  }

  /**
   * Iterates each user resource assigned to a given group.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateUsersForGroup(
    groupId: string,
    iteratee: ResourceIteratee<User>,
  ): Promise<void> {
    try {
      const groups = await this.oktaClient.groupApi.listGroupUsers({
        groupId,
        // The number of users returned for the given group defaults to 1000
        // according to the Okta API docs:
        //
        // https://developer.okta.com/docs/reference/api/groups/#list-group-members
        limit: 10000,
      });

      await groups.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else if (err.status === 404) {
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
  public async iterateDevicesForUser(
    userId: string,
    iteratee: ResourceIteratee<UserFactor>,
  ): Promise<void> {
    try {
      // Okta API does not currently allow a limit to be specified on the list
      // factors API.
      //
      // See: https://developer.okta.com/docs/reference/api/factors/#list-enrolled-factors
      const factors = await this.oktaClient.userFactorApi.listFactors({
        userId,
      });
      await factors.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else if (err.status === 404) {
        //ignore it. It's probably a user that got deleted between steps
      } else {
        throw err;
      }
    }
  }

  /**
   * Iterates each application resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateApplications(
    iteratee: ResourceIteratee<Application>,
  ): Promise<void> {
    try {
      const applications =
        await this.oktaClient.applicationApi.listApplications({
          // Maximum is 200, default is 20 if not specified:
          //
          // See: https://developer.okta.com/docs/reference/api/apps/#list-applications
          limit: 200,
        });

      await applications.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else {
        throw err;
      }
    }
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
      const applicationGroups =
        await this.oktaClient.applicationApi.listApplicationGroupAssignments({
          appId,
          // Maximum is 200, default is 20 if not specified:
          //
          // See: https://developer.okta.com/docs/reference/api/apps/#list-groups-assigned-to-application
          limit: 200,
        });

      await applicationGroups.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else if (err.status === 404) {
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
    iteratee: ResourceIteratee<AppUser>,
  ): Promise<void> {
    try {
      const appUsers =
        await this.oktaClient.applicationApi.listApplicationUsers({
          appId,
          // Maximum is 500, default is 50 if not specified:
          //
          // See: https://developer.okta.com/docs/reference/api/apps/#list-users-assigned-to-application
          limit: 500,
        });

      await appUsers.each(iteratee);
    } catch (err) {
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else if (err.status === 404) {
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
      const groupRules = await this.oktaClient.groupApi.listGroupRules();
      await groupRules.each(iteratee);
    } catch (err) {
      //per https://developer.okta.com/docs/reference/error-codes/
      if (/\/api\/v1\/groups\/rules/.test(err.url) && err.status === 400) {
        this.logger.info(
          'Rules not enabled for this account. Skipping processing of Okta Rules.',
        );
      } else if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else {
        throw err;
      }
    }
  }

  public async getSupportInfo(): Promise<OrgOktaSupportSettingsObj> {
    return await this.oktaClient.orgSettingApi.getOrgOktaSupportSettings();
  }

  public async iterateRolesByUser(
    userId: string,
    iteratee: ResourceIteratee<Role>,
  ): Promise<void> {
    try {
      const userRoles =
        await this.oktaClient.roleAssignmentApi.listAssignedRolesForUser({
          userId,
        });

      await userRoles.each(iteratee);
    } catch (err) {
      //per https://developer.okta.com/docs/reference/error-codes/
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else {
        throw err;
      }
    }
  }

  public async iterateRolesByGroup(
    groupId: string,
    iteratee: ResourceIteratee<Role>,
  ): Promise<void> {
    try {
      const roles =
        await this.oktaClient.roleAssignmentApi.listGroupAssignedRoles({
          groupId,
        });

      await roles.each(iteratee);
    } catch (err) {
      //per https://developer.okta.com/docs/reference/error-codes/
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else {
        throw err;
      }
    }
  }

  public async iterateAppCreatedLogs(
    iteratee: ResourceIteratee<LogEvent>,
  ): Promise<void> {
    try {
      // Use filter to only find instances of a newly created application.
      // We must specify 'since' to a time far in the past, otherwise we
      // will only get the last 7 days of data.  Okta only saves the last
      // 90 days, so this is not us limiting what we're able to get.
      const daysAgo = Date.now() - NINETY_DAYS_AGO;
      const startDate = new Date(daysAgo);
      const events = await this.oktaClient.systemLogApi.listLogEvents({
        filter:
          'eventType eq "application.lifecycle.update" and debugContext.debugData.requestUri ew "_new_"',
        since: startDate,
      });
      await events.each(iteratee);
    } catch (err) {
      //per https://developer.okta.com/docs/reference/error-codes/
      if (err.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          cause: err,
          endpoint: err.url,
          status: err.status,
          statusText: err.errorSummary,
        });
      } else {
        throw err;
      }
    }
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
