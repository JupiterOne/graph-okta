# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 2.3.0 - 2022-10-21

### Fixed

- Add `lastVerifiedOn` and `authenticatorName` properties to `mfa_device`

## 2.2.2 - 2022-07-27

### Fixed

- Duplicate **CREATED** relationships between okta_user and okta_application are
  now prevented.

## 2.2.1 - 2022-07-27

### Changed

- The **CREATED** relationship between okta_user and okta_application is now set
  to partial so data will not be removed when events are no longer available in
  Okta's system logs.
- The query of Okta's system logs now pulls the full 90 days avaiable.

## 2.2.0 - 2022-07-26

### Added

- New entity added:

| Resources | Entity `_type` | Entity `_class` |
| --------- | -------------- | --------------- |
| Okta Role | `okta_role`    | `AccessRole`    |

- New relationships added:

| Source Entity `_type` | Relationship `_class` | Target Entity `_type` |
| --------------------- | --------------------- | --------------------- |
| `okta_user`           | **ASSIGNED**          | `okta_role`           |
| `okta_user`           | **CREATED**           | `okta_application`    |
| `okta_user_group`     | **ASSIGNED**          | `okta_role`           |

## 2.1.7 - 2022-03-23

### Added

- Errors pulling support enabled information will be logged as an informational
  message.

## 2.1.7 - 2022-03-23

### Added

- Added ingestion of support enabled boolean and expiration date.

## 2.1.6 - 2022-01-07

### Added

- Added additional retry logic to handle occaisional 500 errors.

## 2.1.4 - 2021-12-29

### Changed

- Will catch `403` error status from Okta API to throw
  `IntegrationProviderAuthorizationError` and exposes it to the customer so they
  are able to fix the permission issue themselves
- Included more details in the docs around the relationship between token
  permissions and the user that creates the token

## 2.1.3 - 2021-08-09

### Fixed

- Fix MFA device fails to validate in J1 SDK

## 2.1.2 - 2021-08-04

### Fixed

- Fix 404 errors on non-existent groups or apps when fetching details

### Updated

- Updated to latest JupiterOne SDK and Okta node client versions.
- Fix for 400 error while attempting to download Okta Rules on accounts where
  the Rules feature is not enabled.

## 2.1.1 - 2021-07-23

### Fixed

- Fix duplicate relationship error for USER_ASSIGNED_AWS_IAM_ROLE when multiple
  apps point to the same IAM role.

- Fix 404 error on non-existent user when fetching devices for users.

- Fix `applications` step failure on `MISSING_KEY_ERROR` when group not found
  building relationship to application.

- Fix `applications` step failure on `MISSING_KEY_ERROR` when user not found
  building relationship to application.

- Fix `groups` step failure on `MISSING_KEY_ERROR` when user not found building
  relationship to application.

## 2.1.0 - 2021-07-22

### Added

- New entity added:

| Resources | Entity `_type` | Entity `_class` |
| --------- | -------------- | --------------- |
| Okta Rule | `okta_rule`    | `Configuration` |

- New relationships added:

| Source Entity `_type` | Relationship `_class` | Target Entity `_type` |
| --------------------- | --------------------- | --------------------- |
| `okta_account`        | **HAS**               | `okta_rule`           |
| `okta_rule`           | **MANAGES**           | `okta_user_group`     |

### Fixed

- Fix `RequestExecutorWithEarlyRateLimiting` extending wrong built-in default
  executor type to ensure we get the retry logic we expect.

## 2.0.0 - 2021-06-22

### Added

- New properties added to resources:

  | Entity      | Properties   |
  | ----------- | ------------ |
  | `okta_user` | `mfaEnabled` |

### Changed

- Migrated the integration to the new SDK and latest Okta APIs.

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
