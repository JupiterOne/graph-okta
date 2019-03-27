export const ENTITY_TYPE_USER = "okta_user";
export const ENTITY_TYPE_USER_GROUP = "okta_user_group";
export const ENTITY_TYPE_APP_USER_GROUP = "okta_app_user_group";
export const ENTITY_TYPE_APPLICATION = "okta_application";
export const ENTITY_TYPE_ACCOUNT = "okta_account";
export const ENTITY_CLASS_ACCOUNT = "Account";
export const ENTITY_TYPE_SERVICE = "okta_service";
export const ENTITY_CLASS_SERVICE = ["Service", "Control"];
export const ENTITY_TYPE_FACTOR = "mfa_device";
export const RELATIONSHIP_TYPE_USER_FACTOR = "okta_user_assigned_factor";
export const RELATIONSHIP_TYPE_GROUP_USER = "okta_group_has_user";
export const RELATIONSHIP_TYPE_ACCOUNT_SERVICE = "okta_account_has_service";
export const RELATIONSHIP_TYPE_ACCOUNT_GROUP = "okta_account_has_group";
export const RELATIONSHIP_TYPE_ACCOUNT_APPLICATION =
  "okta_account_has_application";
export const RELATIONSHIP_TYPE_APPLICATION_USER =
  "okta_user_assigned_application";
export const RELATIONSHIP_TYPE_APPLICATION_GROUP =
  "okta_group_assigned_application";
