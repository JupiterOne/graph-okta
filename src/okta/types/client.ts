import {
  Client,
  Configuration,
  DeviceApi,
  ServerConfiguration,
  createConfiguration,
} from '@okta/okta-sdk-nodejs';
import { ConfigLoader } from '@okta/okta-sdk-nodejs/src/config-loader';
import { V2Configuration } from '@okta/okta-sdk-nodejs/src/types/configuration';

// Client override to add the Device API missing in okta-sdk-nodejs@7.0.1
// TODO: remove when next version is released
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
    this.deviceApi = new DeviceApi(configuration);
  }
}
