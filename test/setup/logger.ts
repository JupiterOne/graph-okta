import { IntegrationLogger } from '@jupiterone/jupiter-managed-integration-sdk';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export function createMockIntegrationLogger(
  overrides?: Partial<IntegrationLogger>,
): IntegrationLogger {
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createMockIntegrationLogger(),
    ...overrides,
  };
}
