import * as url from 'url';

// https://developer.okta.com/docs/guides/find-your-domain/overview/
const OKTA_DOMAINS = [
  'okta.com',
  'oktapreview.com',
  'okta-emea.com',
  'okta-gov.com',
];

export default function isValidOktaOrgUrl(orgUrl: string) {
  if (!orgUrl) {
    return false;
  }

  const orgUrlWithHttp = !orgUrl.startsWith('https://')
    ? `https://${orgUrl}`
    : orgUrl;

  const { hostname } = url.parse(orgUrlWithHttp);

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
