# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- `instanceConfigFields.json` now specifies an `apiKey` config field.
