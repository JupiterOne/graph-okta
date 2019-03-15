import * as url from "url";

export default function isValidOktaOrgUrl(orgUrl: string): boolean {
  if (!orgUrl) {
    return false;
  }

  const { hostname } = url.parse(orgUrl);

  if (!hostname) {
    return false;
  }

  const splitHostname = hostname.split(".");
  const baseHost =
    splitHostname[splitHostname.length - 2] +
    "." +
    splitHostname[splitHostname.length - 1];
  return baseHost === "okta.com" || baseHost === "oktapreview.com";
}
