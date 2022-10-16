import {
  RelationshipClass,
  StepEntityMetadata,
  StepRelationshipMetadata,
} from '@jupiterone/integration-sdk-core';

export const DATA_ACCOUNT_ENTITY = 'DATA_ACCOUNT_ENTITY';
export const DATA_USER_ENTITIES_MAP = 'DATA_USER_ENTITIES_MAP';

export const Steps = {
  ACCOUNT: 'fetch-account',
  GROUPS: 'fetch-groups',
  USERS: 'fetch-users',
  APPLICATIONS: 'fetch-applications',
  MFA_DEVICES: 'fetch-devices',
  RULES: 'fetch-rules',
  ROLES: 'fetch-roles',
  APPLICATION_CREATION: 'build-application-creation-relationship',
  APP_USER_GROUP_USERS_RELATIONSHIP: 'build-app-user-group-users-relationships',
  USER_GROUP_USERS_RELATIONSHIP: 'build-user-group-users-relationships',
  BUILD_GROUP_APPLICATION_RELATIONSHIPS:
    'build-group-application-relationships',
  BUILD_USER_APPLICATION_RELATIONSHIPS: 'build-group-application-relationships',
};

export const Entities: Record<
  | 'ACCOUNT'
  | 'SERVICE'
  | 'USER'
  | 'USER_GROUP'
  | 'APP_USER_GROUP'
  | 'APPLICATION'
  | 'MFA_DEVICE'
  | 'RULE'
  | 'ROLE',
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
    indexMetadata: {
      enabled: false,
    },
  },
  RULE: {
    resourceName: 'Okta Rule',
    _type: 'okta_rule',
    _class: ['Configuration'],
  },
  ROLE: {
    resourceName: 'Okta Role',
    _type: 'okta_role',
    _class: ['AccessRole'],
  },
};

export const Relationships: Record<
  | 'ACCOUNT_HAS_SERVICE'
  | 'ACCOUNT_HAS_USER'
  | 'ACCOUNT_HAS_USER_GROUP'
  | 'ACCOUNT_HAS_APP_USER_GROUP'
  | 'ACCOUNT_HAS_RULE'
  | 'USER_GROUP_HAS_USER'
  | 'APP_USER_GROUP_HAS_USER'
  | 'ACCOUNT_HAS_APPLICATION'
  | 'GROUP_ASSIGNED_APPLICATION'
  | 'GROUP_ASSIGNED_ROLE'
  | 'USER_ASSIGNED_APPLICATION'
  | 'USER_ASSIGNED_AWS_IAM_ROLE'
  | 'USER_ASSIGNED_ROLE'
  | 'USER_GROUP_ASSIGNED_AWS_IAM_ROLE'
  | 'USER_ASSIGNED_MFA_DEVICE'
  | 'RULE_MANAGES_USER_GROUP'
  | 'USER_CREATED_APPLICATION',
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
  ACCOUNT_HAS_RULE: {
    _type: 'okta_account_has_rule',
    _class: RelationshipClass.HAS,
    sourceType: Entities.ACCOUNT._type,
    targetType: Entities.RULE._type,
  },
  USER_GROUP_HAS_USER: {
    _type: 'okta_group_has_user',
    _class: RelationshipClass.HAS,
    sourceType: Entities.USER_GROUP._type,
    targetType: Entities.USER._type,
    indexMetadata: {
      enabled: false,
    },
  },
  APP_USER_GROUP_HAS_USER: {
    _type: 'okta_app_user_group_has_user',
    _class: RelationshipClass.HAS,
    sourceType: Entities.APP_USER_GROUP._type,
    targetType: Entities.USER._type,
    indexMetadata: {
      enabled: false,
    },
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
  GROUP_ASSIGNED_ROLE: {
    _type: 'okta_user_group_assigned_role',
    _class: RelationshipClass.ASSIGNED,
    sourceType: Entities.USER_GROUP._type,
    targetType: Entities.ROLE._type,
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
  USER_ASSIGNED_ROLE: {
    _type: 'okta_user_assigned_role',
    _class: RelationshipClass.ASSIGNED,
    sourceType: Entities.USER._type,
    targetType: Entities.ROLE._type,
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
  RULE_MANAGES_USER_GROUP: {
    _type: 'okta_rule_manages_user_group',
    _class: RelationshipClass.MANAGES,
    sourceType: Entities.RULE._type,
    targetType: Entities.USER_GROUP._type,
  },
  USER_CREATED_APPLICATION: {
    _type: 'okta_user_created_application',
    _class: RelationshipClass.CREATED,
    sourceType: Entities.USER._type,
    targetType: Entities.APPLICATION._type,
    partial: true,
  },
};
