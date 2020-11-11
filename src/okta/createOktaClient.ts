/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { IntegrationLogger } from "@jupiterone/jupiter-managed-integration-sdk";
import { OktaClient } from "./types";

const okta = require("@okta/okta-sdk-nodejs");
const MemoryStore = require("@okta/okta-sdk-nodejs/src/memory-store");

// Keep retrying until the Lambda times out
const OKTA_MAX_RETRIES = 0;
const OKTA_REQUEST_TIMEOUT = 0;

export default function createOktaClient(
  logger: IntegrationLogger,
  orgUrl: string,
  token: string,
): OktaClient {
  const defaultRequestExecutor = new okta.DefaultRequestExecutor({
    maxRetries: OKTA_MAX_RETRIES,
    requestTimeout: OKTA_REQUEST_TIMEOUT,
  });

  defaultRequestExecutor.on(
    "backoff",
    (request: any, response: any, requestId: any, delayMs: any) => {
      logger.info(
        {
          delayMs,
          requestId,
          url: request.url,
        },
        "Okta client backoff",
      );
    },
  );

  defaultRequestExecutor.on("resume", (request: any, requestId: any) => {
    logger.info(
      {
        requestId,
        url: request.url,
      },
      "Okta client resuming",
    );
  });

  defaultRequestExecutor.on("request", (request: any) => {
    logger.trace(
      {
        request,
      },
      "Okta client initiated request",
    );
  });

  defaultRequestExecutor.on("response", (response: any) => {
    logger.trace(
      {
        response,
      },
      "Okta client received response",
    );
  });

  return new okta.Client({
    orgUrl,
    token,
    requestExecutor: defaultRequestExecutor,
    // is this necessary? We're not re-calling the same APIs.
    cacheStore: new MemoryStore({
      keyLimit: 100000,
      expirationPoll: null,
    }),
  }) as OktaClient;
}
