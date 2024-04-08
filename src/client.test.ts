import {
  IntegrationLogger,
  IntegrationProviderAPIError,
  // IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';
import { APIClient } from './client';
import { IntegrationConfig } from './config';

describe('APIClient', () => {
  const config = {
    oktaOrgUrl: 'https://example.okta.com',
    oktaApiKey: 'api-key',
  } as IntegrationConfig;
  const logger = { warn: jest.fn() } as unknown as IntegrationLogger;

  afterEach(() => {
    jest.clearAllMocks();
  });

  function getEntities(start: number, quantity: number) {
    return Array.from({ length: quantity }, (_, i) => ({
      id: `entity${i + start}`,
    }));
  }

  describe('iterateGroups', () => {
    it('should successfully iterate over groups using mocked retryableRequest', async () => {
      const bodyResponses = [
        getEntities(1, 6),
        getEntities(7, 6),
        getEntities(13, 6),
      ];

      const client = new APIClient(config, logger);

      const mockRetryableRequest = jest.spyOn(
        client as any,
        'retryableRequest',
      );

      let call = 0;
      mockRetryableRequest.mockImplementation(() => {
        call++;
        return Promise.resolve({
          headers: {
            get: () =>
              `<https://example.okta.com/api/v1/groups?limit=6&expand=stats>; rel="self"${call < 3 ? `, <https://example.okta.com/api/v1/groups?after=entity${call * 6}&limit=6&expand=stats>; rel="next"` : ''}`,
          },
          json: () => Promise.resolve(bodyResponses[call - 1]),
        });
      });

      const iterateeMock = jest.fn();
      await client.iterateGroups(iterateeMock, 6);

      expect(mockRetryableRequest).toHaveBeenCalledTimes(3);
      expect(mockRetryableRequest).toHaveBeenNthCalledWith(
        1,
        '/api/v1/groups?limit=6&expand=stats',
      );
      expect(mockRetryableRequest).toHaveBeenNthCalledWith(
        2,
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6&expand=stats',
      );
      expect(mockRetryableRequest).toHaveBeenNthCalledWith(
        3,
        'https://example.okta.com/api/v1/groups?after=entity12&limit=6&expand=stats',
      );

      expect(iterateeMock).toHaveBeenCalledTimes(18);
      for (let i = 1; i <= 18; i++) {
        expect(iterateeMock).toHaveBeenNthCalledWith(i, { id: `entity${i}` });
      }
    });

    it('should reduce limit and continue paginating if an error is thrown', async () => {
      const bodyResponses = [
        // First call
        getEntities(1, 6),
        // Second call fails (should reduce limit to 3)
        [],
        // Third call fails (should reduce limit to 1)
        [],
        // The next 6 responses return 1 entity (limit is 1)
        [{ id: 'entity7' }],
        [{ id: 'entity8' }],
        [{ id: 'entity9' }],
        [{ id: 'entity10' }],
        [{ id: 'entity11' }],
        [{ id: 'entity12' }],
        // Tenth call returns 6 entities (limit goes back to 6)
        getEntities(13, 6),
      ];
      const errorResponse = new IntegrationProviderAPIError({
        endpoint: '',
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new APIClient(config, logger);

      const mockRetryableRequest = jest.spyOn(
        client as any,
        'retryableRequest',
      );

      let call = 0;
      mockRetryableRequest.mockImplementation(() => {
        call++;
        if (call === 2 || call === 3) {
          return Promise.reject(errorResponse);
        }
        const body = bodyResponses[call - 1];
        return Promise.resolve({
          headers: {
            get: () =>
              `<https://example.okta.com/api/v1/groups?limit=${body.length}&expand=stats>; rel="self"${call < 10 ? `, <https://example.okta.com/api/v1/groups?after=${body[body.length - 1].id}&limit=${body.length}&expand=stats>; rel="next"` : ''}`,
          },
          json: () => Promise.resolve(body),
        });
      });

      const iterateeMock = jest.fn();
      await client.iterateGroups(iterateeMock, 6);

      expect(mockRetryableRequest).toHaveBeenCalledTimes(10);
      const expectedUrlCalls = [
        '/api/v1/groups?limit=6&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=3&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity7&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity8&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity9&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity10&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity11&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity12&limit=6&expand=stats',
      ];
      for (let i = 1; i <= 10; i++) {
        expect(mockRetryableRequest).toHaveBeenNthCalledWith(
          i,
          expectedUrlCalls[i - 1],
        );
      }

      expect(iterateeMock).toHaveBeenCalledTimes(18);
      for (let i = 1; i <= 18; i++) {
        expect(iterateeMock).toHaveBeenNthCalledWith(i, { id: `entity${i}` });
      }
    });

    it('should continue without "expand=stats" after limit cannot be reduced', async () => {
      const bodyResponses = [
        // First call
        getEntities(1, 6),
        // Second call fails (should reduce limit to 3)
        [],
        // Third call fails (should reduce limit to 1)
        [],
        // Fourth call fails (leave limit at 1 and should continue without "expand=stats" query param)
        [],
        // Sixth call returns 6 entities (without expand and limit goes back to 6)
        getEntities(7, 6),
        // Tenth call returns 6 entities (puts back the expand query param)
        getEntities(13, 6),
      ];
      const errorResponse = new IntegrationProviderAPIError({
        endpoint: '',
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new APIClient(config, logger);

      const mockRetryableRequest = jest.spyOn(
        client as any,
        'retryableRequest',
      );

      let call = 0;
      mockRetryableRequest.mockImplementation(() => {
        call++;
        if ([2, 3, 4].includes(call)) {
          return Promise.reject(errorResponse);
        }
        const body = bodyResponses[call - 1];
        const selfLink = `<https://example.okta.com/api/v1/groups?limit=${body.length}${call === 6 ? '' : '&expand=stats'}>; rel="self"`;
        const nextLink = `<https://example.okta.com/api/v1/groups?after=${body[body.length - 1].id}&limit=${body.length}${call === 6 ? '' : '&expand=stats'}>; rel="next"`;
        return Promise.resolve({
          headers: {
            get: () => `${selfLink}${call < 6 ? `, ${nextLink}` : ''}`,
          },
          json: () => Promise.resolve(body),
        });
      });

      const iterateeMock = jest.fn();
      await client.iterateGroups(iterateeMock, 6);

      expect(mockRetryableRequest).toHaveBeenCalledTimes(6);
      const expectedUrlCalls = [
        '/api/v1/groups?limit=6&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=3&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=1&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6',
        'https://example.okta.com/api/v1/groups?after=entity12&limit=6&expand=stats',
      ];
      for (let i = 1; i <= 6; i++) {
        expect(mockRetryableRequest).toHaveBeenNthCalledWith(
          i,
          expectedUrlCalls[i - 1],
        );
      }

      expect(iterateeMock).toHaveBeenCalledTimes(18);
      for (let i = 1; i <= 18; i++) {
        expect(iterateeMock).toHaveBeenNthCalledWith(i, { id: `entity${i}` });
      }
    });

    it('should also retry requests with lower limit if it fails without expand=stats', async () => {
      const bodyResponses = [
        // First call
        getEntities(1, 6),
        // Second call fails (should reduce limit to 3)
        [],
        // Third call fails (should reduce limit to 1)
        [],
        // Fourth call fails (leave limit at 1 and should continue without "expand=stats" query param)
        [],
        // Fifth call fails (without expand and limit goes back to 6)
        [],
        // Sixth call returns 3 entities (without expand and limit should be 3)
        getEntities(7, 3),
        // Seventh call returns 3 entities (without expand and limit should be 3)
        getEntities(10, 3),
        // Eighth call returns 6 entities (puts back the expand query param and limit goes back to 6)
        getEntities(13, 6),
      ];
      const errorResponse = new IntegrationProviderAPIError({
        endpoint: '',
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new APIClient(config, logger);

      const mockRetryableRequest = jest.spyOn(
        client as any,
        'retryableRequest',
      );

      let call = 0;
      mockRetryableRequest.mockImplementation(() => {
        call++;
        if ([2, 3, 4, 5].includes(call)) {
          return Promise.reject(errorResponse);
        }
        const body = bodyResponses[call - 1];
        const selfLink = `<https://example.okta.com/api/v1/groups?limit=${body.length}${[5, 6, 7].includes(call) ? '' : '&expand=stats'}>; rel="self"`;
        const nextLink = `<https://example.okta.com/api/v1/groups?after=${body[body.length - 1].id}&limit=${body.length}${[5, 6, 7].includes(call) ? '' : '&expand=stats'}>; rel="next"`;
        return Promise.resolve({
          headers: {
            get: () => `${selfLink}${call < 8 ? `, ${nextLink}` : ''}`,
          },
          json: () => Promise.resolve(body),
        });
      });

      const iterateeMock = jest.fn();
      await client.iterateGroups(iterateeMock, 6);

      expect(mockRetryableRequest).toHaveBeenCalledTimes(8);
      const expectedUrlCalls = [
        '/api/v1/groups?limit=6&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6&expand=stats', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=3&expand=stats', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=1&expand=stats', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=3',
        'https://example.okta.com/api/v1/groups?after=entity9&limit=3',
        'https://example.okta.com/api/v1/groups?after=entity12&limit=6&expand=stats',
      ];
      for (let i = 1; i <= 8; i++) {
        expect(mockRetryableRequest).toHaveBeenNthCalledWith(
          i,
          expectedUrlCalls[i - 1],
        );
      }

      expect(iterateeMock).toHaveBeenCalledTimes(18);
      for (let i = 1; i <= 18; i++) {
        expect(iterateeMock).toHaveBeenNthCalledWith(i, { id: `entity${i}` });
      }
    });

    it('should throw error when request has been tried with lower limits and without expand=options and keeps failing', async () => {
      const bodyResponses = [
        // First call
        getEntities(1, 6),
        // Second call fails (should reduce limit to 3)
        [],
        // Third call fails (should reduce limit to 1)
        [],
        // Fourth call fails (leave limit at 1 and should continue without "expand=stats" query param)
        [],
        // Fifth call fails (without expand and limit goes back to 6)
        [],
        // Sixth call fails (without expand and limit should be 3)
        [],
        // Seventh call fails (without expand and limit should be 1)
        [],
      ];
      const errorResponse = new IntegrationProviderAPIError({
        endpoint: '',
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new APIClient(config, logger);

      const mockRetryableRequest = jest.spyOn(
        client as any,
        'retryableRequest',
      );

      let call = 0;
      mockRetryableRequest.mockImplementation(() => {
        call++;
        if (call !== 1) {
          return Promise.reject(errorResponse);
        }
        const body = bodyResponses[call - 1];
        const selfLink = `<https://example.okta.com/api/v1/groups?limit=6&expand=stats>; rel="self"`;
        const nextLink = `<https://example.okta.com/api/v1/groups?after=${body[body.length - 1].id}&limit=6&expand=stats}>; rel="next"`;
        return Promise.resolve({
          headers: {
            get: () => `${selfLink}${call === 1 ? `, ${nextLink}` : ''}`,
          },
          json: () => Promise.resolve(body),
        });
      });

      const iterateeMock = jest.fn();
      await expect(client.iterateGroups(iterateeMock, 6)).rejects.toThrow();

      expect(mockRetryableRequest).toHaveBeenCalledTimes(7);
      const expectedUrlCalls = [
        '/api/v1/groups?limit=6&expand=stats',
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6&expand=stats', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=3&expand=stats', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=1&expand=stats', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=6', // fails
        'https://example.okta.com/api/v1/groups?after=entity6&limit=3', // fails
        'https://example.okta.com/api/v1/groups?after=entity9&limit=1', // fails
      ];
      for (let i = 1; i <= 5; i++) {
        expect(mockRetryableRequest).toHaveBeenNthCalledWith(
          i,
          expectedUrlCalls[i - 1],
        );
      }

      expect(iterateeMock).toHaveBeenCalledTimes(6);
      for (let i = 1; i <= 6; i++) {
        expect(iterateeMock).toHaveBeenNthCalledWith(i, { id: `entity${i}` });
      }
    });
  });
});
