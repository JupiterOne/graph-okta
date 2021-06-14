export const USER_ENTITY_TYPE = 'okta_user';
export const USER_GROUP_ENTITY_TYPE = 'okta_user_group';
export const APP_USER_GROUP_ENTITY_TYPE = 'okta_app_user_group';
export const MFA_DEVICE_ENTITY_TYPE = 'mfa_device';
export const DATA_ACCOUNT_ENTITY = 'DATA_ACCOUNT_ENTITY';
export const SERVICE_ENTITY_TYPE = 'okta_service';
export const SERVICE_ENTITY_CLASS = ['Service', 'Control'];
export const ACCOUNT_ENTITY_TYPE = 'okta_account';
export const APPLICATION_ENTITY_TYPE = 'okta_application';

export const ACCOUNT_GROUP_RELATIONSHIP_TYPE = 'okta_account_has_group';
export const ACCOUNT_APPLICATION_RELATIONSHIP_TYPE =
  'okta_account_has_application';

export const GROUP_USER_RELATIONSHIP_TYPE = 'okta_group_has_user';

export const APPLICATION_GROUP_RELATIONSHIP_TYPE =
  'okta_group_assigned_application';
export const APPLICATION_USER_RELATIONSHIP_TYPE =
  'okta_user_assigned_application';

export const GROUP_IAM_ROLE_RELATIONSHIP_TYPE =
  'okta_user_group_assigned_aws_iam_role';
export const USER_IAM_ROLE_RELATIONSHIP_TYPE =
  'okta_user_assigned_aws_iam_role';
export const USER_MFA_DEVICE_RELATIONSHIP_TYPE = 'okta_user_assigned_factor';
