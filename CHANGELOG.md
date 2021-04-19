# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.0.0 - 2021-04-19

### Added

- A total re-write of the integration in the new SDK and using the latest Okta
  API. Behavior and output should be identical.

## 1.8.0 - 2020-12-03

### Added

- Added early rate limiting of the Okta client. Previously, the client continued
  to make API calls until it received a 429 (exhausting all of the client's rate
  limit), then waited to retry based on response headers. Now, the client will
  accept a `minimumRateLimitRemaining` argument (default=5). When the client
  hits the `minimumRateLimitRemaining` value, it will wait to send the next
  request based on response headers.

## 1.7.6 - 2020-11-17

### Fixed

- Stop retrying API calls 4xx HTTP status

## 1.7.5 - 2020-11-12

### Fixed

- Pass `iterationState.state.after` query parameter to `fetchBatchOfUsers`

## 1.7.4 - 2020-11-11

### Changed

- Add warn/trace level logging to client calls

## 1.7.3 - 2020-11-09

### Fixed

- Retry all API errors including `ECONNRESET`

## 1.7.2 - 2020-11-06

### Fixed

- Retry `ETIMEDOUT` API errors
- Expose API errors to customers

## 1.7.1 - 2020-08-28

### Changed

- Changed `logIfForbidden` to `logIfForbiddenOrNotFound` to catch 404 errors.

## 1.7.0 - 2020-08-27

### Added

- Fetch "DEPROVISIONED" users
- Add normalized timestamp properties

## 1.6.13 - 2020-05-19

### Fixed

- A step that runs a long time and doesn't use the gremlin client would fail
  with an error during closing an expired connection.

## 1.6.12 - 2020-05-19

### Fixed

- `"okta-emea.com"` was not considerd a valid Okta url domain

## 1.6.11 - 2020-05-12

### Added

- `.gitleaks.toml` configuration to whitelist .lock files

### Fixed

- `'meraki'` app name was not recognized as a `cisco_meraki_account`

## 1.6.10 - 2020-05-08

### Added

- `logger.info` around `fetchBatchOfApplicationUsers`, `fetchBatchOfResources`
  operations to provide better visbility into how far the operations are able to
  go.

### Fixed

- Local execution requires the `aws-sdk` currently due to a dependency of the
  `jupiter-persister` (no AWS API calls are actually made by the persister in
  local execution, however).

- Integration SDK may throw a `RangeError` when there are a significant number
  of operations to publish.

### Changed

- Move from Travis to GitHub Actions to allow for tagging releases in branches
  and publishing after merge to master.
