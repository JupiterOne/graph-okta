import * as dotenv from 'dotenv';
import * as path from 'path';
import { IntegrationConfig } from '../src/config';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}

const DEFAULT_ORG_URL = 'https://dev-857255.okta.com/';
const DEFAULT_API_KEY = 'dummy-api-key';

export const integrationConfig: IntegrationConfig = {
  oktaOrgUrl: process.env.OKTA_ORG_URL || DEFAULT_ORG_URL,
  oktaApiKey: process.env.OKTA_API_KEY || DEFAULT_API_KEY,
};
