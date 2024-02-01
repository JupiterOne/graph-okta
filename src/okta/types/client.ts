import {
  ApiException,
  ApplicationApi,
  Client,
  Configuration,
  DeviceApi,
  ServerConfiguration,
  createConfiguration,
} from '@okta/okta-sdk-nodejs';
import { ConfigLoader } from '@okta/okta-sdk-nodejs/src/config-loader';
import { V2Configuration } from '@okta/okta-sdk-nodejs/src/types/configuration';
import { ApplicationApiResponseProcessor } from '@okta/okta-sdk-nodejs/src/generated/apis/ApplicationApi';

export class OktaClient extends Client {
  deviceApi: DeviceApi;
  configuration: Configuration;

  constructor(config?: V2Configuration) {
    super(config);

    const configLoader = new ConfigLoader();
    const clientConfig = Object.assign({}, config);
    configLoader.applyDefaults();
    configLoader.apply({
      client: clientConfig || {},
    });
    const parsedConfig = configLoader.config;

    const configuration = createConfiguration({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      baseServer: new ServerConfiguration(parsedConfig.client.orgUrl),
      httpApi: this.http,
    });

    this.configuration = configuration;

    // Device API not properly exported in okta-sdk-nodejs@7.0.1
    // TODO: remove when next version is released
    this.deviceApi = new DeviceApi(configuration);

    // Override the Application API to handle the "listApplications" response parsing ourselves
    // Because the SDK deserializer is omitting the "settings.app" properties for AWS applications
    // in okta-sdk-nodejs@7.0.1
    this.applicationApi = new ApplicationApi(
      configuration,
      undefined,
      new OverriddenApplicationApiResponseProcessor() as any,
    );
  }
}

class OverriddenApplicationApiResponseProcessor extends ApplicationApiResponseProcessor {
  async listApplications(response: any) {
    const contentType = response.headers['content-type']
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (contentType === undefined) {
      throw new Error('Cannot parse content. No Content-Type defined.');
    }
    if (contentType !== 'application/json') {
      throw new Error(
        'The mediaType ' +
          contentType +
          ' is not supported by ObjectSerializer.parse.',
      );
    }

    const body = JSON.parse(await response.body.text());
    if (response.httpStatusCode >= 200 && response.httpStatusCode <= 299) {
      return body;
    }
    if (response.httpStatusCode === '403') {
      throw new ApiException(403, 'Forbidden', body, response.headers);
    }
    if (response.httpStatusCode === '429') {
      throw new ApiException(429, 'Too Many Requests', body, response.headers);
    }

    throw new ApiException(
      response.httpStatusCode,
      'Unknown API Status Code!',
      await response.getBodyAsAny(),
      response.headers,
    );
  }
}
