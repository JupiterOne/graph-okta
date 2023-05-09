import { shouldThrottleNextRequest } from './createOktaClient';

describe('shouldThrottleNextRequest', () => {
  test('should throttle if > 50% of limit has been consumed', () => {
    expect(
      shouldThrottleNextRequest({
        rateLimitLimit: 100,
        rateLimitRemaining: 49,
      }),
    ).toBe(true);
  });

  test('should not throttle if < 50% of the limit has been consumed', () => {
    expect(
      shouldThrottleNextRequest({
        rateLimitLimit: 100,
        rateLimitRemaining: 51,
      }),
    ).toBe(false);
  });

  test('should not throttle if `rate-limit-limit` is undefined', () => {
    expect(
      shouldThrottleNextRequest({
        rateLimitLimit: undefined,
        rateLimitRemaining: 100 - 45,
      }),
    ).toBe(false);
  });

  test('should not throttle if `rate-limit-remaining` is undefined', () => {
    expect(
      shouldThrottleNextRequest({
        rateLimitLimit: 100,
        rateLimitRemaining: undefined,
      }),
    ).toBe(false);
  });
});
