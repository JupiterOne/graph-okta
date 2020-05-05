import nock from "nock";
import uuid from "uuid/v4";

import {
  createTestIntegrationExecutionContext,
  IntegrationInstanceAuthenticationError,
} from "@jupiterone/jupiter-managed-integration-sdk";

import invocationValidator from "./invocationValidator";
import { OktaIntegrationConfig } from "./types";

beforeAll(() => {
  nock.back.fixtures = `${__dirname}/../test/fixtures/`;
  process.env.CI ? nock.back.setMode("lockdown") : nock.back.setMode("record");
});

afterAll(() => {
  nock.restore();
});

test("should throw if okta configuration is not found", async () => {
  const accountId = uuid();
  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    `Okta configuration not found (accountId=${accountId})`,
  );
});

test("should throw if oktaOrgUrl missing", async () => {
  const accountId = uuid();
  const config: Partial<OktaIntegrationConfig> = {
    oktaApiKey: uuid(),
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    `Invalid Okta org URL provided (oktaOrgUrl=undefined, accountId=${accountId})`,
  );
});

test("should throw if oktaApiKey missing", async () => {
  const accountId = uuid();
  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl: "https://abc.okta.com",
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    `Missing oktaApiKey in configuration (accountId=${accountId})`,
  );
});

test("should throw if invalid okta.com oktaOrgUrl provided", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://abc.hiokta.com";

  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl,
    oktaApiKey: uuid(),
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    `Invalid Okta org URL provided (oktaOrgUrl=${oktaOrgUrl}, accountId=${accountId})`,
  );
});

test("should throw if invalid oktapreview.com oktaOrgUrl provided", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://abc.hioktapreview.com";

  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl,
    oktaApiKey: uuid(),
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    `Invalid Okta org URL provided (oktaOrgUrl=${oktaOrgUrl}, accountId=${accountId})`,
  );
});

test("oktaOrgUrl vanity url not found (404)", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://abc.okta.com:443";

  const { nockDone } = await nock.back("vanity-url-not-found.json", {
    before: (def) => (def.scope = oktaOrgUrl),
  });

  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl,
    oktaApiKey: uuid(),
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    `Invalid Okta org URL provided (code=404, oktaOrgUrl=${oktaOrgUrl}, accountId=${accountId})`,
  );

  nockDone();
});

test("unauthorized account", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://dev-589921.oktapreview.com";

  const { nockDone } = await nock.back("unauthorized.json", {
    before: (def) => (def.scope = oktaOrgUrl),
  });

  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl,
    oktaApiKey: uuid(),
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).rejects.toThrow(
    IntegrationInstanceAuthenticationError,
  );

  nockDone();
});

test("valid oktapreview.com account", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://dev-589921.oktapreview.com";

  const { nockDone } = await nock.back("valid-oktapreview.json", {
    before: (def) => (def.scope = oktaOrgUrl),
  });

  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl,
    oktaApiKey: "replace-me-to-update-recording",
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).resolves.not.toThrow();

  nockDone();
});

test("valid okta.com account", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://dev-589921.okta.com";

  const { nockDone } = await nock.back("valid-okta.json", {
    before: (def) => (def.scope = oktaOrgUrl),
  });

  const config: Partial<OktaIntegrationConfig> = {
    oktaOrgUrl,
    oktaApiKey: "this-test-copied-valid-oktapreview-and-modified-it",
  };

  const executionContext = createTestIntegrationExecutionContext({
    instance: {
      accountId,
      config,
    } as any,
  });

  await expect(invocationValidator(executionContext)).resolves.not.toThrow();

  nockDone();
});
