import startCase from 'lodash.startcase';

export function getVendorName(appName: string): string {
  if (appName.includes('wordpress')) {
    return 'WordPress / WP Engine';
  } else if (appName.includes('threatstack')) {
    return 'Threat Stack';
  } else if (appName.includes('textmagic')) {
    return 'TextMagic';
  } else if (appName.includes('sumologic')) {
    return 'Sumo Logic';
  } else if (
    appName.includes('statuspage') ||
    appName.includes('jira') ||
    appName.includes('bitbucket')
  ) {
    return 'Atlassian';
  } else if (appName.includes('trendmicro')) {
    return 'Trend Micro';
  } else if (appName.includes('snyk')) {
    return 'Snyk';
  } else if (appName.includes('smallimprovements')) {
    return 'Small Improvements';
  } else if (appName.includes('ringcentral')) {
    return 'RingCentral';
  } else if (appName.includes('pritunl')) {
    return 'Pritunl';
  } else if (appName.includes('paylocity')) {
    return 'Paylocity';
  } else if (appName.includes('paloalto')) {
    return 'Palo Alto Networks';
  } else if (appName.includes('pagerduty')) {
    return 'PagerDuty';
  } else if (appName.includes('office365')) {
    return 'Microsoft';
  } else if (appName.includes('naviabenefits')) {
    return 'Navia Benefits Solutions';
  } else if (appName.includes('modeanalytics')) {
    return 'Mode Analytics';
  } else if (appName.includes('meraki')) {
    return 'Cisco Meraki';
  } else if (appName.includes('mcafee')) {
    return 'McAfee';
  } else if (appName.includes('markmonitor')) {
    return 'Mark Monitor';
  } else if (appName.includes('leavelogic')) {
    return 'LeaveLogic';
  } else if (appName.includes('jamf')) {
    return 'Jamf';
  } else if (appName.includes('gotomeeting') || appName.includes('logmein')) {
    return 'LogMeIn';
  } else if (
    appName.includes('google') ||
    appName === 'cloudconsole' ||
    appName === 'gcp'
  ) {
    return 'Google';
  } else if (appName.includes('golinks')) {
    return 'GoLinks';
  } else if (appName.includes('github')) {
    return 'GitHub';
  } else if (appName.includes('floqast')) {
    return 'FloQast';
  } else if (appName.includes('fireeye')) {
    return 'FireEye';
  } else if (appName.includes('invision')) {
    return 'InVision';
  } else if (appName.includes('hubspot')) {
    return 'HubSpot';
  } else if (appName.includes('hellosign')) {
    return 'HelloSign';
  } else if (appName.includes('hackerone')) {
    return 'HackerOne';
  } else if (appName.includes('easecentral')) {
    return 'EaseCentral';
  } else if (appName.includes('dropbox')) {
    return 'Dropbox';
  } else if (appName.includes('dome9')) {
    return 'Dome9';
  } else if (appName.includes('docusign')) {
    return 'DocuSign';
  } else if (appName.includes('digicert')) {
    return 'DigiCert';
  } else if (appName.includes('dashlane')) {
    return 'Dashlane';
  } else if (appName.includes('cultureamp')) {
    return 'Culture Amp';
  } else if (appName.includes('coderpad')) {
    return 'CoderPad';
  } else if (appName.includes('crowdstrike')) {
    return 'CrowdStrike';
  } else if (appName.includes('carbonblack')) {
    return 'Carbon Black';
  } else if (appName.includes('bamboohr')) {
    return 'BambooHR';
  } else if (appName.includes('ataata') || appName.includes('mimecast')) {
    return 'Mimecast';
  } else if (appName.includes('airwatch')) {
    return 'VMware';
  } else if (appName.includes('aws')) {
    return 'Amazon Web Services';
  } else if (appName.includes('amazon')) {
    return 'Amazon.com';
  } else if (appName.includes('adobe')) {
    return 'Adobe';
  } else if (appName.includes('jupiterone') || appName.startsWith('j1dev')) {
    return 'JupiterOne';
  } else if (appName.includes('lifeomic')) {
    return 'LifeOmic';
  }
  return startCase(appName);
}

export function getAccountName(appName: string): string | string[] {
  if (appName === 'atlassianjirabitbucket') {
    return ['jira_account', 'bitbucket_team'];
  } else if (appName === 'ciscomeraki' || appName === 'meraki') {
    return 'cisco_meraki_account';
  } else if (appName.includes('wordpress')) {
    return 'wordpress_account';
  } else if (appName.includes('snyk')) {
    return 'snyk_account';
  } else if (appName.includes('pritunl')) {
    return 'pritunl_account';
  } else if (appName.includes('githubcloud')) {
    return 'github_account';
  } else if (appName === 'cloudconsole') {
    return 'google_account';
  } else if (appName.includes('lifeomic')) {
    return 'lifeomic_account';
  } else if (appName.includes('jupiterone') || appName.startsWith('j1dev')) {
    return 'jupiterone_account';
  }
  return `${appName}_account`;
}

/**
 * An okta application is considered multi-instance (i.e. mapped to an account
 * entity without a specific identifier) if the following are true:
 *
 * - The Okta application has a specific account identifer setting.
 *
 *   For example, `awsAccountId` or `githubOrg`
 *
 * - There is typically more than one account per organization that could be
 *   configured via a JupiterOne integration instance.
 *
 *   For example, an organization may likely have multiple AWS accounts or
 *   Github accounts (and multiple integration instances in J1), but is highly
 *   unlikely to have more than one instance of Carbon Black account integrated
 *   in J1.
 */
export function isMultiInstanceApp(appName: string): boolean {
  const multiInstanceApps = [
    'aws',
    'githubcloud',
    'gcp',
    'google',
    'office365',
  ];
  if (multiInstanceApps.includes(appName)) {
    return true;
  } else {
    return false;
  }
}
