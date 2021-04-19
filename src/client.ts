/* eslint-disable @typescript-eslint/no-empty-function */
import {
  IntegrationLogger,
  IntegrationProviderAuthenticationError,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from './config';
export type ResourceIteratee<T> = (each: T) => Promise<void> | void;
import createOktaClient from './okta/createOktaClient';
import {
  OktaClient,
  OktaFactor,
  OktaUser,
  OktaUserGroup,
  OktaApplication,
  OktaApplicationGroup,
  OktaApplicationUser,
} from './okta/types';

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
  usersList: OktaUser[];
  constructor(readonly config: IntegrationConfig, logger: IntegrationLogger) {
    this.oktaClient = createOktaClient(logger, config);
  }

  public async verifyAuthentication(): Promise<void> {
    // the most light-weight request possible to validate credentials
    try {
      //there is always at least the Everyone group
      //note that if you don't hit the .each, it doesn't actually attempt it
      await this.oktaClient.listGroups().each((e) => {});
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: this.config.oktaOrgUrl + 'api/v1/groups',
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
    await this.oktaClient.listUsers().each(iteratee);
    await this.oktaClient
      .listUsers({
        filter: 'status eq "DEPROVISIONED"',
      })
      .each(iteratee);
  }

  /**
   * Iterates each group resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateGroups(
    iteratee: ResourceIteratee<OktaUserGroup>,
  ): Promise<void> {
    await this.oktaClient.listGroups().each(iteratee);
  }

  /**
   * Iterates each group resource assigned to a given user.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateGroupsForUser(
    user: OktaUser,
    iteratee: ResourceIteratee<OktaUserGroup>,
  ): Promise<void> {
    await this.oktaClient.listUserGroups(user.id).each(iteratee);
  }

  /**
   * Iterates each Multi-Factor Authentication device assigned to a given user.
   *
   * @param iteratee receives each resource to produce relationships
   */
  public async iterateFactorsForUser(
    user: OktaUser,
    iteratee: ResourceIteratee<OktaFactor>,
  ): Promise<void> {
    if (user.status !== 'DEPROVISIONED') {
      //asking for factors for DEPROV users throws error
      await this.oktaClient.listFactors(user.id).each(iteratee);
    }
  }

  /**
   * Iterates each application resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateApplications(
    iteratee: ResourceIteratee<OktaApplication>,
  ): Promise<void> {
    await this.oktaClient.listApplications().each(iteratee);
  }

  /**
   * Iterates each group assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateGroupsForApp(
    app: OktaApplication,
    iteratee: ResourceIteratee<OktaApplicationGroup>,
  ): Promise<void> {
    await this.oktaClient
      .listApplicationGroupAssignments(app.id)
      .each(iteratee);
  }

  /**
   * Iterates each individual user assigned to a given application.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsersForApp(
    app: OktaApplication,
    iteratee: ResourceIteratee<OktaApplicationUser>,
  ): Promise<void> {
    await this.oktaClient.listApplicationUsers(app.id).each(iteratee);
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
