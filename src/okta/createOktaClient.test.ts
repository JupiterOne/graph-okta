/* eslint-disable @typescript-eslint/no-empty-function */

import { setupOktaRecording, Recording } from '../../test/setup/recording';
import { createMockIntegrationLogger } from '@jupiterone/integration-sdk-testing';
import createOktaClient from './createOktaClient';
import { OktaIntegrationConfig } from '../types';

const config: OktaIntegrationConfig = {
  oktaApiKey: process.env.OKTA_API_KEY || 'fake-api-key',
  oktaOrgUrl: 'https://dev-857255-admin.okta.com/',
};

const logger = createMockIntegrationLogger();

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

test('should log when minimum x-rate-limit-remaining header reached', async () => {
  recording = setupOktaRecording({
    directory: __dirname,
    name: 'minimumRateLimitRemaining',
    options: {
      recordFailedRequests: true,
    },
  });

  // this particular endpoint has a limit of 600 API requests. We throttle after 1 call.
  const minimumRateLimitRemaining = 599;
  const loggerInfoSpy = jest.spyOn(logger, 'info');
  const oktaClient = createOktaClient(logger, config, {
    minimumRateLimitRemaining,
  });

  // call response.each in order to execute API request
  await oktaClient.listUsers().each(jest.fn());

  expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
  expect(loggerInfoSpy).toHaveBeenCalledWith(
    {
      minimumRateLimitRemaining,
      requestAfter: expect.any(Number),
      url: 'https://dev-857255-admin.okta.com/api/v1/users',
    },
    'Minimum `x-rate-limit-remaining` header reached. Temporarily throttling requests',
  );
});

test('should delay next request after hitting minimumRateLimitRemaining', async () => {
  recording = setupOktaRecording({
    directory: __dirname,
    name: 'delayNextApiRequest',
  });

  // this particular endpoint has a limit of 600 API requests. We throttle after 1 call.
  const minimumRateLimitRemaining = 599;
  const oktaClient = createOktaClient(logger, config, {
    minimumRateLimitRemaining,
  });

  // call response.each in order to execute API request one time
  await oktaClient.listUsers().each(jest.fn());

  // show that requestAfter was set by the above API call. It should not be undefined.
  // requestAfter is expected to be set during any API call by the 'x-rate-limit-reset' header
  expect(oktaClient.requestExecutor.requestAfter).toEqual(expect.any(Number));
  const requestAfter = oktaClient.requestExecutor.requestAfter!;

  // mock Date.now() to return 1 second earlier than `requestAfter`,
  // so that requestAfter is > Date.now()
  // that's what getThrottleActivated should be checking
  const delayMs = 1000;
  jest.spyOn(Date, 'now').mockReturnValueOnce(requestAfter - delayMs);
  expect(oktaClient.requestExecutor.getThrottleActivated()).toBe(true);

  // now manually update the requestAfter time to 1 second after real-time now, and call the API again
  // it should return after a 1 second delay
  const realTimeBeforeCall = Date.now();
  oktaClient.requestExecutor.delayRequests(delayMs); //sets requestAfter to now + delayms
  await oktaClient.listUsers().each(jest.fn());
  const realTimeAfterCall = Date.now();
  // this proves that if requestAfter > Date.now(), the API call is delayed by the difference
  expect(realTimeAfterCall - realTimeBeforeCall).toBeGreaterThanOrEqual(
    delayMs,
  );
});
