# Integration with JupiterOne

## Okta + JupiterOne Integration Benefits

- Visualize Okta applications, groups, users, and MFA devices in the JupiterOne
  graph.
- Map Okta users to employees in your JupiterOne account.
- Monitor changes to Okta users using JupiterOne alerts.

## How it Works

- JupiterOne periodically fetches the current applications, groups, users, and
  MFA devices from Okta to update the graph.
- Write JupiterOne queries to review and monitor updates to the graph.
- Configure alerts to take action when the JupiterOne graph changes.

## Requirements

- JupiterOne requires a REST API key. You need permission to create an Admin
  user in Okta that will be used to
  [create the API key](https://developer.okta.com/docs/api/getting_started/getting_a_token).
- You must have permission in JupiterOne to install new integrations.

## Support

If you need help with this integration, please contact
[JupiterOne Support](https://support.jupiterone.io).

## Integration Walkthrough

### In Okta

1. Login to Okta at https://yoursubdomain.okta.com, using an account with Admin
   privileges.
2. Go to Admin mode by pressing the Admin button in the top right corner. You
   should now be at https://yoursubdomain-admin.okta.com.
3. On the left-side menu, select Security, and then API.
4. On the screen which appears, select Tokens. You should now be at
   https://yoursubdomain-admin.okta.com/admin/access/api/tokens.
5. Press the Create Token button and name the token.
6. Copy the token value which appears to a safe location, because it will not be
   available after closing this screen. Note that, per the Okta website, "API
   tokens are valid for 30 days and automatically renew every time they are used
   with an API request. When a token has been inactive for more than 30 days it
   is revoked and cannot be used again. Tokens are also only valid if the user
   who created the token is also active."

### In JupiterOne

1. From the configuration **Gear Icon**, select **Integrations**.
2. Scroll to the **Okta** integration tile and click it.
3. Click the **Add Configuration** button.
4. Enter the **Account Name** by which you'd like to identify this Okta account
   in JupiterOne. Ingested entities will have this value stored in
   `tag.AccountName` when **Tag with Account Name** is checked.
5. Enter a **Description** that will further assist your team when identifying
   the integration instance.
6. Select a **Polling Interval** that you feel is sufficient for your monitoring
   needs. You may leave this as `DISABLED` and manually execute the integration.
   Remember that an Okta API token that is not used for 30 days will expire.
7. Enter the **Okta Org Url** for your organization. Note this should be in the
   format https://yoursubdomain.okta.com, not
   https://yoursubdomain-admin.okta.com.
8. Enter the **Okta API Key** generated for use by JupiterOne.
9. Click **Create Configuration** once all values are provided.

# How to Uninstall

1. From the configuration **Gear Icon**, select **Integrations**.
2. Scroll to the **Okta** integration tile and click it.
3. Identify and click the **integration to delete**.
4. Click the **trash can** icon.
5. Click the **Remove** button to delete the integration.

<!-- {J1_DOCUMENTATION_MARKER_START} -->
<!--
********************************************************************************
NOTE: ALL OF THE FOLLOWING DOCUMENTATION IS GENERATED USING THE
"j1-integration document" COMMAND. DO NOT EDIT BY HAND! PLEASE SEE THE DEVELOPER
DOCUMENTATION FOR USAGE INFORMATION:

https://github.com/JupiterOne/sdk/blob/master/docs/integrations/development.md
********************************************************************************
-->

## Data Model

### Entities

The following entities are created:

| Resources          | Entity `_type`        | Entity `_class`      |
| ------------------ | --------------------- | -------------------- |
| Okta Account       | `okta_account`        | `Account`            |
| Okta App UserGroup | `okta_app_user_group` | `UserGroup`          |
| Okta Application   | `okta_application`    | `Application`        |
| Okta Factor Device | `mfa_device`          | `Key`                |
| Okta Service       | `okta_service`        | `Service`, `Control` |
| Okta User          | `okta_user`           | `User`               |
| Okta UserGroup     | `okta_user_group`     | `UserGroup`          |

### Relationships

The following relationships are created/mapped:

| Source Entity `_type` | Relationship `_class` | Target Entity `_type` |
| --------------------- | --------------------- | --------------------- |
| `okta_account`        | **HAS**               | `okta_app_user_group` |
| `okta_account`        | **HAS**               | `okta_application`    |
| `okta_account`        | **HAS**               | `okta_service`        |
| `okta_account`        | **HAS**               | `okta_user`           |
| `okta_account`        | **HAS**               | `okta_user_group`     |
| `okta_app_user_group` | **HAS**               | `okta_user`           |
| `okta_user`           | **ASSIGNED**          | `okta_application`    |
| `okta_user`           | **ASSIGNED**          | `mfa_device`          |
| `okta_user_group`     | **ASSIGNED**          | `okta_application`    |
| `okta_user_group`     | **HAS**               | `okta_user`           |

<!--
********************************************************************************
END OF GENERATED DOCUMENTATION AFTER BELOW MARKER
********************************************************************************
-->
<!-- {J1_DOCUMENTATION_MARKER_END} -->
