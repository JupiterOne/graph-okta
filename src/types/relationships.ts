import { RelationshipFromIntegration } from "@jupiterone/jupiter-managed-integration-sdk";

export interface StandardizedOktaUserGroupRelationship
  extends RelationshipFromIntegration {
  userId: string;
  groupId: string;
}

export interface StandardizedOktaAccountApplicationRelationship
  extends RelationshipFromIntegration {
  accountUrl: string;
  applicationId: string;
  applicationName: string;
}

export interface StandardizedOktaAccountGroupRelationship
  extends RelationshipFromIntegration {
  accountUrl: string;
  groupId: string;
}

export interface StandardizedOktaApplicationUserRelationship
  extends RelationshipFromIntegration {
  applicationId: string;
  userId: string;
  userEmail: string;
  roles?: string;
  role?: string;
}

export interface StandardizedOktaApplicationGroupRelationship
  extends RelationshipFromIntegration {
  applicationId: string;
  groupId: string;
  roles?: string;
  role?: string;
}

export interface StandardizedOktaUserFactorRelationship
  extends RelationshipFromIntegration {
  userId: string;
  factorId: string;
}
