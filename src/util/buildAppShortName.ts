import { OktaAccountInfo } from '../okta/types';

export default function buildAppShortName(
  oktaAccountInfo: OktaAccountInfo,
  appName: string,
): string {
  if (appName === 'amazon_aws') {
    return 'aws';
  } else if (appName === 'cloudconsole') {
    return 'gcp';
  }

  /**
   * Look for an app name that ends with 'saml', like 'hubspotsaml'
   *
   * The shortname should be the part before 'saml'
   */
  const samlAppRegex = /(\w+)saml/;
  const samlAppMatch = samlAppRegex.exec(appName);

  if (samlAppMatch) {
    return samlAppMatch[1].replace(/_$/, '');
  }

  const startPos = appName.indexOf('_');
  if (startPos !== -1) {
    const endPos = appName.lastIndexOf('_');
    if (startPos < endPos) {
      const suffix = appName.substring(endPos + 1);
      if (/[0-9]+/.test(suffix)) {
        return appName.substring(startPos + 1, endPos);
      }
    }
  }

  return appName;
}
