import * as url from 'url';

// https://developer.okta.com/docs/guides/find-your-domain/overview/
const OKTA_DOMAINS = ['okta.com', 'oktapreview.com', 'okta-emea.com'];

export default function isValidOktaOrgUrl(orgUrl: string): boolean {
  if (!orgUrl) {
    return false;
  }

  const { hostname } = url.parse(orgUrl);

  if (!hostname) {
    return false;
  }

  const splitHostname = hostname.split('.');
  const baseHost =
    splitHostname[splitHostname.length - 2] +
    '.' +
    splitHostname[splitHostname.length - 1];
  return OKTA_DOMAINS.includes(baseHost);
}
