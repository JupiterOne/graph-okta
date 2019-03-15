import { createTestIntegrationExecutionContext } from "@jupiterone/jupiter-managed-integration-sdk";
import uuid from "uuid/v4";
import invocationValidator from "./invocationValidator";
import { OktaIntegrationConfig } from "./types";

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

test("should not throw if valid okta config provided and okta.com oktaOrgUrl used", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://abc.okta.com";

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

  await expect(invocationValidator(executionContext)).resolves.not.toThrow();
});

test("should not throw if valid okta config provided and oktapreview.com oktaOrgUrl used", async () => {
  const accountId = uuid();
  const oktaOrgUrl = "https://abc.oktapreview.com";

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

  await expect(invocationValidator(executionContext)).resolves.not.toThrow();
});
