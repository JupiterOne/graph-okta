import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { setupOktaRecording } from '../../test/setup/recording';
import { IntegrationConfig } from '../config';
import { fetchUsers } from './users';
import { fetchGroups } from './groups';
import { fetchDevices } from './devices';
import { fetchApplications } from './applications';
import { fetchAccountDetails } from './account';
import { fetchRules } from './rules';
import { integrationConfig } from '../../test/config';
import { createAPIClient } from '../client';

jest.setTimeout(1000 * 60 * 1);
let recording: Recording;
afterEach(async () => {
  await recording.stop();
});

test('should collect data', async () => {
  recording = setupOktaRecording({
    directory: __dirname,
    name: 'steps', //redaction of headers is in setupOktaRecording
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });

  // Simulates dependency graph execution.
  // See https://github.com/JupiterOne/sdk/issues/262.
  await fetchAccountDetails(context);
  await fetchUsers(context);
  await fetchGroups(context);
  await fetchDevices(context);
  await fetchApplications(context);
  await fetchRules(context);

  // Review snapshot, failure is a regression
  expect({
    numCollectedEntities: context.jobState.collectedEntities.length,
    numCollectedRelationships: context.jobState.collectedRelationships.length,
    collectedEntities: context.jobState.collectedEntities,
    collectedRelationships: context.jobState.collectedRelationships,
    encounteredTypes: context.jobState.encounteredTypes,
  }).toMatchSnapshot();

  const accounts = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Account'),
  );
  expect(accounts.length).toBeGreaterThan(0);
  expect(accounts).toMatchGraphObjectSchema({
    _class: ['Account'],
    schema: {
      properties: {
        _type: { const: 'okta_account' },
        name: { type: 'string' },
        webLink: {
          type: 'string',
          format: 'url',
        },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['webLink'],
    },
  });

  const users = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('User'),
  );
  expect(users.length).toBeGreaterThan(0);
  expect(users).toMatchGraphObjectSchema({
    _class: ['User'],
    schema: {
      properties: {
        _type: { const: 'okta_user' },
        name: { type: 'string' },
        email: { type: 'string' },
        webLink: {
          type: 'string',
          format: 'url',
        },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['webLink', 'email'],
    },
  });

  const userGroups = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('UserGroup'),
  );
  expect(userGroups.length).toBeGreaterThan(0);
  expect(userGroups).toMatchGraphObjectSchema({
    _class: ['UserGroup'],
    schema: {
      properties: {
        _type: { const: 'okta_user_group' },
        name: { type: 'string' },
        webLink: {
          type: 'string',
          format: 'url',
        },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['webLink'],
    },
  });

  const apps = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Application'),
  );
  expect(apps.length).toBeGreaterThan(0);
  expect(apps).toMatchGraphObjectSchema({
    _class: ['Application'],
    schema: {
      properties: {
        _type: { const: 'okta_application' },
        name: { type: 'string' },
        webLink: {
          type: 'string',
          format: 'url',
        },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['webLink'],
    },
  });

  const rules = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Configuration'),
  );
  expect(rules.length).toBeGreaterThan(0);
  expect(rules).toMatchGraphObjectSchema({
    _class: ['Configuration'],
    schema: {
      properties: {
        _type: { const: 'okta_rule' },
        name: { type: 'string' },
        ruleType: { type: 'string' },
        status: { type: 'string' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['name', 'ruleType', 'status'],
    },
  });
});

test('call for devices on a fake user', async () => {
  recording = setupOktaRecording({
    directory: __dirname,
    name: 'callfakeuser',
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });

  const apiClient = createAPIClient(context.instance.config, context.logger);
  //call a fake user to test failure
  //the 404 error should be suppressed
  expect(
    await apiClient.iterateDevicesForUser('thisisafakekey', () => {
      jest.fn;
    }),
  ).toReturn;
});
