This can be used to mock the Okta API responses when testing the integration if
you don't have access to the real API

1. Download the mock server from
   https://github.com/JupiterOne/integrations-mock-server
2. Follow the instructions in the README to set up the mock server (generate
   certs -> set up environment variables in shell)
3. Create a .env with:

```
OKTA_ORG_URL=https://dev-857255-admin.okta.com
OKTA_API_KEY=unknown
```

4. Start the server:

From `integrations-mock-server` project

```
yarn start -u https://dev-857255-admin.okta.com -c /<path-to-graph-okta>/mocks/config.json
```

5. Execute the integration `yarn start`
