import {
  RelationshipClass,
  StepEntityMetadata,
  StepRelationshipMetadata,
} from '@jupiterone/integration-sdk-core';

export const Steps = {
  ACCOUNT: 'fetch-account',
  GROUPS: 'fetch-groups',
  USERS: 'fetch-users',
  APPLICATIONS: 'fetch-applications',
  MFA_DEVICES: 'fetch-devices',
};

export const Entities: Record<
  | 'ACCOUNT'
  | 'SERVICE'
  | 'USER'
  | 'USER_GROUP'
  | 'APP_USER_GROUP'
  | 'APPLICATION'
  | 'MFA_DEVICE',
  StepEntityMetadata
> = {
  ACCOUNT: {
    resourceName: 'Okta Account',
    _type: 'okta_account',
    _class: ['Account'],
  },
  SERVICE: {
    resourceName: 'Okta Service',
    _type: 'okta_service',
    _class: ['Service', 'Control'],
  },
  USER: {
    resourceName: 'Okta User',
    _type: 'okta_user',
    _class: ['User'],
  },
  USER_GROUP: {
    resourceName: 'Okta UserGroup',
    _type: 'okta_user_group',
    _class: ['UserGroup'],
  },
  APP_USER_GROUP: {
    resourceName: 'Okta App UserGroup',
    _type: 'okta_app_user_group',
    _class: ['UserGroup'],
  },
  APPLICATION: {
    resourceName: 'Okta Application',
    _type: 'okta_application',
    _class: ['Application'],
  },
  MFA_DEVICE: {
    resourceName: 'Okta Factor Device',
    _type: 'mfa_device',
    _class: ['Key', 'AccessKey'],
  },
};

export const Relationships: Record<
  | 'ACCOUNT_HAS_SERVICE'
  | 'ACCOUNT_HAS_USER'
  | 'ACCOUNT_HAS_USER_GROUP'
  | 'ACCOUNT_HAS_APP_USER_GROUP'
  | 'USER_GROUP_HAS_USER'
  | 'APP_USER_GROUP_HAS_USER'
  | 'ACCOUNT_HAS_APPLICATION'
  | 'GROUP_ASSIGNED_APPLICATION'
  | 'USER_ASSIGNED_APPLICATION'
  | 'USER_ASSIGNED_AWS_IAM_ROLE'
  | 'USER_GROUP_ASSIGNED_AWS_IAM_ROLE'
  | 'USER_ASSIGNED_MFA_DEVICE',
  StepRelationshipMetadata
> = {
  ACCOUNT_HAS_SERVICE: {
    _type: 'okta_account_has_service',
    _class: RelationshipClass.HAS,
    sourceType: Entities.ACCOUNT._type,
    targetType: Entities.SERVICE._type,
  },
  ACCOUNT_HAS_USER: {
    _type: 'okta_account_has_user',
    _class: RelationshipClass.HAS,
    sourceType: Entities.ACCOUNT._type,
    targetType: Entities.USER._type,
  },
  ACCOUNT_HAS_USER_GROUP: {
    _type: 'okta_account_has_group',
    _class: RelationshipClass.HAS,
    sourceType: Entities.ACCOUNT._type,
    targetType: Entities.USER_GROUP._type,
  },
  ACCOUNT_HAS_APP_USER_GROUP: {
    _type: 'okta_account_has_group',
    _class: RelationshipClass.HAS,
    sourceType: Entities.ACCOUNT._type,
    targetType: Entities.APP_USER_GROUP._type,
  },
  USER_GROUP_HAS_USER: {
    _type: 'okta_group_has_user',
    _class: RelationshipClass.HAS,
    sourceType: Entities.USER_GROUP._type,
    targetType: Entities.USER._type,
  },
  APP_USER_GROUP_HAS_USER: {
    _type: 'okta_group_has_user',
    _class: RelationshipClass.HAS,
    sourceType: Entities.APP_USER_GROUP._type,
    targetType: Entities.USER._type,
  },
  ACCOUNT_HAS_APPLICATION: {
    _type: 'okta_account_has_application',
    _class: RelationshipClass.HAS,
    sourceType: Entities.ACCOUNT._type,
    targetType: Entities.APPLICATION._type,
  },
  GROUP_ASSIGNED_APPLICATION: {
    _type: 'okta_group_assigned_application',
    _class: RelationshipClass.ASSIGNED,
    sourceType: 'okta_user_group, okta_app_user_group',
    targetType: Entities.APPLICATION._type,
  },
  USER_ASSIGNED_APPLICATION: {
    _type: 'okta_user_assigned_application',
    _class: RelationshipClass.ASSIGNED,
    sourceType: Entities.USER._type,
    targetType: Entities.APPLICATION._type,
  },
  USER_ASSIGNED_AWS_IAM_ROLE: {
    _type: 'okta_user_assigned_aws_iam_role',
    _class: RelationshipClass.ASSIGNED,
    sourceType: Entities.USER._type,
    targetType: 'aws_iam_role',
  },
  USER_GROUP_ASSIGNED_AWS_IAM_ROLE: {
    _type: 'okta_user_group_assigned_aws_iam_role',
    _class: RelationshipClass.ASSIGNED,
    sourceType: Entities.USER_GROUP._type,
    targetType: 'aws_iam_role',
  },
  USER_ASSIGNED_MFA_DEVICE: {
    _type: 'okta_user_assigned_factor',
    _class: RelationshipClass.ASSIGNED,
    sourceType: Entities.USER._type,
    targetType: Entities.MFA_DEVICE._type,
  },
};
