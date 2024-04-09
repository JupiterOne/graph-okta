# v3.3.13 (Tue Apr 09 2024)

#### 🐛 Bug Fix

- fix test error [#263](https://github.com/JupiterOne/graph-okta/pull/263) ([@RonaldEAM](https://github.com/RonaldEAM))
- bump http-client version [#262](https://github.com/JupiterOne/graph-okta/pull/262) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.12 (Tue Apr 09 2024)

#### 🐛 Bug Fix

- add group stats to monitor heavy loads [#261](https://github.com/JupiterOne/graph-okta/pull/261) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.11 (Mon Apr 08 2024)

#### 🐛 Bug Fix

- dynamically handle request limits on iterateGroups [#260](https://github.com/JupiterOne/graph-okta/pull/260) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.10 (Fri Apr 05 2024)

#### 🐛 Bug Fix

- when groups "expand" returns 500, fallback to request groups without it [#259](https://github.com/JupiterOne/graph-okta/pull/259) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.9 (Fri Apr 05 2024)

#### 🐛 Bug Fix

- stop using the okta sdk and log the error body [#258](https://github.com/JupiterOne/graph-okta/pull/258) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.8 (Fri Apr 05 2024)

#### 🐛 Bug Fix

- remove unnecessary try/catch on client [#257](https://github.com/JupiterOne/graph-okta/pull/257) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.7 (Thu Apr 04 2024)

#### 🐛 Bug Fix

- improve group-user relationships step [#256](https://github.com/JupiterOne/graph-okta/pull/256) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.6 (Wed Apr 03 2024)

#### 🐛 Bug Fix

- retry timeouts and econnreset errors [#255](https://github.com/JupiterOne/graph-okta/pull/255) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.5 (Tue Apr 02 2024)

#### 🐛 Bug Fix

- handle rate limiting in a defensive manner with token buckets [#254](https://github.com/JupiterOne/graph-okta/pull/254) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.4 (Mon Apr 01 2024)

#### 🐛 Bug Fix

- revert change of pagination limit [#253](https://github.com/JupiterOne/graph-okta/pull/253) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.3 (Thu Mar 28 2024)

#### 🐛 Bug Fix

- make improvements to request concurrently on big steps [#252](https://github.com/JupiterOne/graph-okta/pull/252) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.3.2 (Sat Mar 23 2024)

#### 🐛 Bug Fix

- Add groupEntityType to buildGroupEntityToUserRelationships [#251](https://github.com/JupiterOne/graph-okta/pull/251) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.3.1 (Fri Mar 22 2024)

#### 🐛 Bug Fix

- Increase running timer to 45 seconds and catch errors around batchIterateEntities [#250](https://github.com/JupiterOne/graph-okta/pull/250) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.3.0 (Fri Mar 22 2024)

#### 🚀 Enhancement

- Add try/catch and a StepAnnouncer for customer [#249](https://github.com/JupiterOne/graph-okta/pull/249) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.2.4 (Thu Mar 21 2024)

#### 🐛 Bug Fix

- Add more logs for flagged customer [#248](https://github.com/JupiterOne/graph-okta/pull/248) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.2.3 (Wed Mar 20 2024)

#### 🐛 Bug Fix

- Update integration-deployment.yml [#247](https://github.com/JupiterOne/graph-okta/pull/247) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.2.2 (Wed Mar 20 2024)

#### 🐛 Bug Fix

- Add additional debug info for Indeed [#246](https://github.com/JupiterOne/graph-okta/pull/246) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.2.1 (Tue Mar 19 2024)

#### 🐛 Bug Fix

- Use 90% of the API if it's Indeed [#245](https://github.com/JupiterOne/graph-okta/pull/245) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.2.0 (Thu Mar 14 2024)

#### 🚀 Enhancement

- Info the API rate limit for the API endpoints used [#244](https://github.com/JupiterOne/graph-okta/pull/244) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.1.3 (Thu Mar 14 2024)

#### 🐛 Bug Fix

- Log url for x-rate-limit-reset [#243](https://github.com/JupiterOne/graph-okta/pull/243) ([@i5o](https://github.com/i5o))

#### Authors: 1

- Ignacio Rodríguez ([@i5o](https://github.com/i5o))

---

# v3.1.2 (Thu Feb 01 2024)

#### 🐛 Bug Fix

- fix missing "settings.app" properties on listApplications [#242](https://github.com/JupiterOne/graph-okta/pull/242) ([@RonaldEAM](https://github.com/RonaldEAM))

#### Authors: 1

- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.1.1 (Thu Feb 01 2024)

#### 🐛 Bug Fix

- INT-10103: fix duplicated key [#241](https://github.com/JupiterOne/graph-okta/pull/241) ([@gastonyelmini](https://github.com/gastonyelmini))

#### ⚠️ Pushed to `main`

- Apply remove-codeql with multi-gitter [ci skip] ([@electricgull](https://github.com/electricgull))
- Fix x-cortex-service-groups where tier-4 was set incorrectly ([@jablonnc](https://github.com/jablonnc))

#### Authors: 3

- Cameron Griffin ([@electricgull](https://github.com/electricgull))
- Gaston Yelmini ([@gastonyelmini](https://github.com/gastonyelmini))
- Noah Jablonski ([@jablonnc](https://github.com/jablonnc))

---

# v3.1.0 (Tue Oct 24 2023)

#### 🚀 Enhancement

- INT-8666 - Add devices ingestion [#240](https://github.com/JupiterOne/graph-okta/pull/240) (ronald.arias@contractor.jupiterone.com)

#### ⚠️ Pushed to `main`

- Populate CODEOWENRS, baseline package.json and baseline cortex.yaml ([@jablonnc](https://github.com/jablonnc))

#### Authors: 2

- Noah Jablonski ([@jablonnc](https://github.com/jablonnc))
- Ronald Arias ([@RonaldEAM](https://github.com/RonaldEAM))

---

# v3.0.1 (Wed Aug 16 2023)

#### 🐛 Bug Fix

- Mutate integration config is missing protocol [#239](https://github.com/JupiterOne/graph-okta/pull/239) ([@gastonyelmini](https://github.com/gastonyelmini))
- INT-8956: credential verification [#238](https://github.com/JupiterOne/graph-okta/pull/238) ([@mishelashala](https://github.com/mishelashala))

#### Authors: 2

- Gaston Yelmini ([@gastonyelmini](https://github.com/gastonyelmini))
- Michell Ayala ([@mishelashala](https://github.com/mishelashala))

---

# v3.0.0 (Mon Jun 05 2023)

#### 💥 Breaking Change

- more closely replicate gsuite build setup [#236](https://github.com/JupiterOne/graph-okta/pull/236) ([@mdaum](https://github.com/mdaum))
- Use latest sdk node18 [#235](https://github.com/JupiterOne/graph-okta/pull/235) ([@mdaum](https://github.com/mdaum))

#### Authors: 1

- Maxwell Daum ([@mdaum](https://github.com/mdaum))

---

# v2.7.1 (Fri May 26 2023)

#### 🐛 Bug Fix

- Remove okta users data source [#234](https://github.com/JupiterOne/graph-okta/pull/234) ([@VDubber](https://github.com/VDubber))

#### Authors: 1

- Samuel Poulton ([@VDubber](https://github.com/VDubber))

---

# v2.7.0 (Mon May 22 2023)

#### 🚀 Enhancement

- Int 8408 Add Ingestion Sources [#233](https://github.com/JupiterOne/graph-okta/pull/233) ([@VDubber](https://github.com/VDubber))

#### 🐛 Bug Fix

- Update integration-deployment.yml [#232](https://github.com/JupiterOne/graph-okta/pull/232) ([@Nick-NCSU](https://github.com/Nick-NCSU))

#### Authors: 2

- Nick Thompson ([@Nick-NCSU](https://github.com/Nick-NCSU))
- Samuel Poulton ([@VDubber](https://github.com/VDubber))

---

# v2.6.7 (Wed May 17 2023)

#### 🐛 Bug Fix

- Pin create-integration-deployment@v1.2.2 workflow [#231](https://github.com/JupiterOne/graph-okta/pull/231) ([@ndowmon](https://github.com/ndowmon))

#### Authors: 1

- Nick Dowmon ([@ndowmon](https://github.com/ndowmon))

---

# v2.6.6 (Wed May 10 2023)

#### 🐛 Bug Fix

- Unpin create-integration-deployment@v1.2.0 workflow [#230](https://github.com/JupiterOne/graph-okta/pull/230) ([@ndowmon](https://github.com/ndowmon))

#### Authors: 1

- Nick Dowmon ([@ndowmon](https://github.com/ndowmon))

---

# v2.6.5 (Wed May 10 2023)

#### 🐛 Bug Fix

- Simplify and improve rate limiting [#228](https://github.com/JupiterOne/graph-okta/pull/228) ([@ndowmon](https://github.com/ndowmon))
- INT-7418 Adding integration deployment workflow [#227](https://github.com/JupiterOne/graph-okta/pull/227) ([@jroblesx](https://github.com/jroblesx))

#### Authors: 2

- Jean R. Robles G. ([@jroblesx](https://github.com/jroblesx))
- Nick Dowmon ([@ndowmon](https://github.com/ndowmon))

---

## 2.6.1 - 2023-04-27

### Added

- Added `auto` package to help with builds, versioning and npm packaging.

## 2.6.0 - 2023-04-25

### Added

- Added the following properties to `mfa_device`

  | Property       | Type     |
  | -------------- | -------- |
  | `platform`     | `string` |
  | `deviceType`   | `string` |
  | `credentialId` | `string` |
  | `profileName`  | `string` |

## 2.5.4 - 2023-04-18

### Updated

- Support multiple relationships for the same applications group.

## 2.5.2 - 2023-03-09

### Updated

- Reduced concurrency on `/api/v1/groups/<group-id>/users` from 10 to 4 to
  reduce throttling.

## 2.5.1 - 2023-02-14

### Added

- Added support for the okta-gov.com domain.

## 2.5.0 - 2022-11-16

### Added

- Added `countryCode` property to `okta_user` entity.

## 2.4.0 - 2022-11-16

### Added

- Added `hiredOn` and `terminatedOn` properties to `okta_user` entity.

## 2.3.2 - 2022-10-17

### Changed

- Increase page size when fetching members of a group
- Separate group to user relationship logic into separate steps
- Batch process user group relationship data
- Disable Okta Node.js client caching
- Batch process application data
- Batch process device data
- Improve error handling around invalid role formats

## 2.3.1 - 2022-10-13

### Fixed

- Remove large `memberOfGroupId` property from `okta_user`

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
