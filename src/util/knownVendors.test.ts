import {
  getAccountName,
  getVendorName,
  isMultiInstanceApp,
} from './knownVendors';

describe('getVendorName()', () => {
  it('should return "WordPress / WP Engine" for input "wordpress"', () => {
    expect(getVendorName('wordpress')).toBe('WordPress / WP Engine');
  });

  it('should return "Threat Stack" for input "threatstack"', () => {
    expect(getVendorName('threatstack')).toBe('Threat Stack');
  });

  it('should return "TextMagic" for input "textmagic"', () => {
    expect(getVendorName('textmagic')).toBe('TextMagic');
  });

  it('should return "Sumo Logic" for input "sumologic"', () => {
    expect(getVendorName('sumologic')).toBe('Sumo Logic');
  });

  it('should return "Atlassian" for input "statuspage"', () => {
    expect(getVendorName('statuspage')).toBe('Atlassian');
  });

  it('should return "Atlassian" for input "jira"', () => {
    expect(getVendorName('jira')).toBe('Atlassian');
  });

  it('should return "Atlassian" for input "bitbucket"', () => {
    expect(getVendorName('bitbucket')).toBe('Atlassian');
  });

  it('should return "Trend Micro" for input "trendmicro"', () => {
    expect(getVendorName('trendmicro')).toBe('Trend Micro');
  });

  it('should return "Snyk" for input "snyk"', () => {
    expect(getVendorName('snyk')).toBe('Snyk');
  });

  it('should return "Small Improvements" for input "smallimprovements"', () => {
    expect(getVendorName('smallimprovements')).toBe('Small Improvements');
  });

  it('should return "RingCentral" for input "ringcentral"', () => {
    expect(getVendorName('ringcentral')).toBe('RingCentral');
  });

  it('should return "Pritunl" for input "pritunl"', () => {
    expect(getVendorName('pritunl')).toBe('Pritunl');
  });

  it('should return "Paylocity" for input "paylocity"', () => {
    expect(getVendorName('paylocity')).toBe('Paylocity');
  });

  it('should return "Palo Alto Networks" for input "paloalto"', () => {
    expect(getVendorName('paloalto')).toBe('Palo Alto Networks');
  });

  it('should return "PagerDuty" for input "pagerduty"', () => {
    expect(getVendorName('pagerduty')).toBe('PagerDuty');
  });

  it('should return "Microsoft" for input "office365"', () => {
    expect(getVendorName('office365')).toBe('Microsoft');
  });

  it('should return "Navia Benefits Solutions" for input "naviabenefits"', () => {
    expect(getVendorName('naviabenefits')).toBe('Navia Benefits Solutions');
  });

  it('should return "Mode Analytics" for input "modeanalytics"', () => {
    expect(getVendorName('modeanalytics')).toBe('Mode Analytics');
  });

  it('should return "Cisco Meraki" for input "meraki"', () => {
    expect(getVendorName('meraki')).toBe('Cisco Meraki');
  });

  it('should return "McAfee" for input "mcafee"', () => {
    expect(getVendorName('mcafee')).toBe('McAfee');
  });

  it('should return "Mark Monitor" for input "markmonitor"', () => {
    expect(getVendorName('markmonitor')).toBe('Mark Monitor');
  });

  it('should return "LeaveLogic" for input "leavelogic"', () => {
    expect(getVendorName('leavelogic')).toBe('LeaveLogic');
  });

  it('should return "Jamf" for input "jamf"', () => {
    expect(getVendorName('jamf')).toBe('Jamf');
  });

  it('should return "LogMeIn" for input "gotomeeting"', () => {
    expect(getVendorName('gotomeeting')).toBe('LogMeIn');
  });

  it('should return "LogMeIn" for input "logmein"', () => {
    expect(getVendorName('logmein')).toBe('LogMeIn');
  });

  it('should return "Google" for input "google"', () => {
    expect(getVendorName('google')).toBe('Google');
  });

  it('should return "Google" for input "cloudconsole"', () => {
    expect(getVendorName('cloudconsole')).toBe('Google');
  });

  it('should return "Google" for input "gcp"', () => {
    expect(getVendorName('gcp')).toBe('Google');
  });

  it('should return "GoLinks" for input "golinks"', () => {
    expect(getVendorName('golinks')).toBe('GoLinks');
  });

  it('should return "GitHub" for input "github"', () => {
    expect(getVendorName('github')).toBe('GitHub');
  });

  it('should return "FloQast" for input "floqast"', () => {
    expect(getVendorName('floqast')).toBe('FloQast');
  });

  it('should return "FireEye" for input "fireeye"', () => {
    expect(getVendorName('fireeye')).toBe('FireEye');
  });

  it('should return "InVision" for input "invision"', () => {
    expect(getVendorName('invision')).toBe('InVision');
  });

  it('should return "HubSpot" for input "hubspot"', () => {
    expect(getVendorName('hubspot')).toBe('HubSpot');
  });

  it('should return "HelloSign" for input "hellosign"', () => {
    expect(getVendorName('hellosign')).toBe('HelloSign');
  });

  it('should return "HackerOne" for input "hackerone"', () => {
    expect(getVendorName('hackerone')).toBe('HackerOne');
  });

  it('should return "EaseCentral" for input "easecentral"', () => {
    expect(getVendorName('easecentral')).toBe('EaseCentral');
  });

  it('should return "Dropbox" for input "dropbox"', () => {
    expect(getVendorName('dropbox')).toBe('Dropbox');
  });

  it('should return "Dome9" for input "dome9"', () => {
    expect(getVendorName('dome9')).toBe('Dome9');
  });

  it('should return "DocuSign" for input "docusign"', () => {
    expect(getVendorName('docusign')).toBe('DocuSign');
  });

  it('should return "DigiCert" for input "digicert"', () => {
    expect(getVendorName('digicert')).toBe('DigiCert');
  });

  it('should return "Dashlane" for input "dashlane"', () => {
    expect(getVendorName('dashlane')).toBe('Dashlane');
  });

  it('should return "Culture Amp" for input "cultureamp"', () => {
    expect(getVendorName('cultureamp')).toBe('Culture Amp');
  });

  it('should return "CoderPad" for input "coderpad"', () => {
    expect(getVendorName('coderpad')).toBe('CoderPad');
  });

  it('should return "CrowdStrike" for input "crowdstrike"', () => {
    expect(getVendorName('crowdstrike')).toBe('CrowdStrike');
  });

  it('should return "Carbon Black" for input "carbonblack"', () => {
    expect(getVendorName('carbonblack')).toBe('Carbon Black');
  });

  it('should return "BambooHR" for input "bamboohr"', () => {
    expect(getVendorName('bamboohr')).toBe('BambooHR');
  });

  it('should return "Mimecast" for input "ataata"', () => {
    expect(getVendorName('ataata')).toBe('Mimecast');
  });

  it('should return "Mimecast" for input "mimecast"', () => {
    expect(getVendorName('mimecast')).toBe('Mimecast');
  });

  it('should return "VMware" for input "airwatch"', () => {
    expect(getVendorName('airwatch')).toBe('VMware');
  });

  it('should return "Amazon Web Services" for input "aws"', () => {
    expect(getVendorName('aws')).toBe('Amazon Web Services');
  });

  it('should return "Amazon.com" for input "amazon"', () => {
    expect(getVendorName('amazon')).toBe('Amazon.com');
  });

  it('should return "Adobe" for input "adobe"', () => {
    expect(getVendorName('adobe')).toBe('Adobe');
  });

  it('should return "JupiterOne" for input "jupiterone"', () => {
    expect(getVendorName('jupiterone')).toBe('JupiterOne');
  });

  it('should return "JupiterOne" for input starting with "j1dev"', () => {
    expect(getVendorName('j1dev-something')).toBe('JupiterOne');
  });

  it('should return "LifeOmic" for input "lifeomic"', () => {
    expect(getVendorName('lifeomic')).toBe('LifeOmic');
  });

  it('should return the start case of the input for unknown vendors', () => {
    expect(getVendorName('unknownvendor')).toBe('Unknownvendor');
  });
});

describe('getAccountName()', () => {
  it('should return ["jira_account", "bitbucket_team"] for input "atlassianjirabitbucket"', () => {
    expect(getAccountName('atlassianjirabitbucket')).toEqual([
      'jira_account',
      'bitbucket_team',
    ]);
  });

  it('should return "cisco_meraki_account" for input "ciscomeraki"', () => {
    expect(getAccountName('ciscomeraki')).toBe('cisco_meraki_account');
  });

  it('should return "cisco_meraki_account" for input "meraki"', () => {
    expect(getAccountName('meraki')).toBe('cisco_meraki_account');
  });

  it('should return "wordpress_account" for input "wordpress"', () => {
    expect(getAccountName('wordpress')).toBe('wordpress_account');
  });

  it('should return "snyk_account" for input "snyk"', () => {
    expect(getAccountName('snyk')).toBe('snyk_account');
  });

  it('should return "pritunl_account" for input "pritunl"', () => {
    expect(getAccountName('pritunl')).toBe('pritunl_account');
  });

  it('should return "github_account" for input "githubcloud"', () => {
    expect(getAccountName('githubcloud')).toBe('github_account');
  });

  it('should return "google_account" for input "cloudconsole"', () => {
    expect(getAccountName('cloudconsole')).toBe('google_account');
  });

  it('should return "lifeomic_account" for input "lifeomic"', () => {
    expect(getAccountName('lifeomic')).toBe('lifeomic_account');
  });

  it('should return "jupiterone_account" for input "jupiterone"', () => {
    expect(getAccountName('jupiterone')).toBe('jupiterone_account');
  });

  it('should return "jupiterone_account" for input starting with "j1dev"', () => {
    expect(getAccountName('j1dev-something')).toBe('jupiterone_account');
  });

  it('should return "Unknown_account" for unknown input', () => {
    expect(getAccountName('unknownapp')).toBe('unknownapp_account');
  });
});

describe('isMultiInstanceApp()', () => {
  it('should return true for input "aws"', () => {
    expect(isMultiInstanceApp('aws')).toBe(true);
  });

  it('should return true for input "githubcloud"', () => {
    expect(isMultiInstanceApp('githubcloud')).toBe(true);
  });

  it('should return true for input "gcp"', () => {
    expect(isMultiInstanceApp('gcp')).toBe(true);
  });

  it('should return true for input "google"', () => {
    expect(isMultiInstanceApp('google')).toBe(true);
  });

  it('should return true for input "office365"', () => {
    expect(isMultiInstanceApp('office365')).toBe(true);
  });

  it('should return false for input "unknownapp"', () => {
    expect(isMultiInstanceApp('unknownapp')).toBe(false);
  });

  it('should return false for empty input', () => {
    expect(isMultiInstanceApp('')).toBe(false);
  });
});
