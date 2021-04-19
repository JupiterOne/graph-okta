import buildAppShortName from './buildAppShortName';

const OKTA_ACCOUNT_INFO = {
  name: 'company',
  preview: false,
};

test('should build shortname for a custom app', () => {
  const appName = 'company_mydashboardapp_1';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('mydashboardapp');
});

test('should build shortname for company name with inc', () => {
  const appName = 'companyinc_mydashboardapp_1';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('mydashboardapp');
});

test('should build shortname for company name with llc', () => {
  const appName = 'companyllc_mydashboardapp_1';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('mydashboardapp');
});

test('should build shortname for company name with corp', () => {
  const appName = 'companycorp_mydashboardapp_1';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('mydashboardapp');
});

test('should build shortname for a saml app', () => {
  const appName = 'newappsaml';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('newapp');
});

test('should build shortname for a _saml app', () => {
  const appName = 'statuspage_saml';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('statuspage');
});

test('should build shortname for amazon_aws app', () => {
  const appName = 'amazon_aws';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('aws');
});

test('should return original app name if it is already short', () => {
  const appName = 'google';

  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('google');
});

test('should handle app name that does not end in digits', () => {
  const appName = 'companycorp_mydashboardapp_xyz';
  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe(appName);
});

test('should handle underscores in the actual app name', () => {
  const appName = 'companycorp_my_demo_app_123';
  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe('my_demo_app');
});

test('should handle dropbox_for_business', () => {
  const appName = 'dropbox_for_business';
  expect(buildAppShortName(OKTA_ACCOUNT_INFO, appName)).toBe(
    'dropbox_for_business',
  );
});
