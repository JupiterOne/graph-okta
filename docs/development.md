# Development

Add details here to give a brief overview of how to work with the provider APIs.
Please reference any SDKs or API docs used to help build the integration here.

## Prerequisites

Just the usual integration environment.

## Provider account setup

Please provide information about the steps needed to create an account with a
provider. Images and references to a provider's documentation is very helpful
for new developers picking up your work.

## Authentication

The basic REST API uses just an ORG_URL and API_TOKEN. The org url will be in
the format https://yoursubdomain.okta.com. The API token is generated from an
Admin account on Okta.
[Documentation](https://developer.okta.com/docs/api/getting_started/getting_a_token)

Okta supports OAuth also, but the standard integration template is not setup for
that.

## Okta API Rate Limits

[Okta API rate limits](https://developer.okta.com/docs/reference/rate-limits/)
are sophisticated, depending on a number of factors including the particular
endpoint, organization-wide limits, and subscription level. Responses include a
few headers to guide a system into conformance, and will deliver `429` responses
that indicate a backoff delay when the rate limits are exceeded. The integration
is implemented to respect these `429` response directives by leveraging the API
client provided by Okta. However, there is more work to be done to make the
integration more proactive by using the headers of every response.

The Okta integration currently ingests users, groups, applications, and MFA
devices. The number of calls works out to be:

- `((numUsers / 200) * listUsers) + (numUsers * (listFactors(user) + listGroups(user)))`
- `listApplications + (numApplications * (listApplicationGroupAssignments(app) + listApplicationUsers(app)))`
