import {
  createTestIntegrationExecutionContext,
  EntityFromIntegration,
  EntityOperationType,
  RelationshipOperationType,
} from "@jupiterone/jupiter-managed-integration-sdk";
import uuidV4 from "uuid/v4";
import * as constants from "./constants";
import * as converters from "./converters";
import createOktaClient from "./createOktaClient";
import synchronize from "./synchronizer";
import {
  OktaClient,
  OktaExecutionContext,
  OktaUser,
  OktaUserCredentials,
  OktaUserGroup,
  OktaUserGroupProfile,
  OktaUserProfile,
  StandardizedOktaAccount,
} from "./types";

jest.mock("@okta/okta-sdk-nodejs");
jest.mock("@okta/okta-sdk-nodejs/src/memory-store");

const mockOktaDomain = "dummy";
const mockOktaOrgUrl = `https://${mockOktaDomain}.okta.com`;
const mockOktaAdminUrl = `https://${mockOktaDomain}-admin.okta.com`;
const mockOktaToken = "testtoken";

const EMPTY_OKTA_COLLECTION = {
  each: async () => {
    return;
  },
};

function getMockUser(): OktaUser {
  return {
    id: uuidV4(),
    status: "STAGED",
    created: new Date(),
    activated: new Date(),
    statusChanged: new Date(),
    lastLogin: new Date(),
    lastUpdated: new Date(),
    passwordChanged: new Date(),
    profile: {
      firstName: "President",
      lastName: "Austin",
      mobilePhone: "9001",
      login: "superkingaustin@lifeomic.com",
      tenant: [],
      email: "superkingaustin@lifeomic.com",
      secondEmail: "kingaustin@lifeomic.com",
      employeeType: "employee",
      generic: false,
      bitbucketUsername: "bb-austin1",
      githubUsername: "gh-austin1",
    } as OktaUserProfile,
    credentials: {} as OktaUserCredentials,
  } as OktaUser;
}

function getMockUserGroup(): OktaUserGroup {
  return {
    id: uuidV4(),
    created: new Date(),
    lastUpdated: new Date(),
    lastMembershipUpdated: new Date(),
    objectClass: [],
    type: "OKTA_GROUP",
    profile: {} as OktaUserGroupProfile,
  } as OktaUserGroup;
}

function getMockAccount(): StandardizedOktaAccount {
  return {
    _type: constants.ENTITY_TYPE_ACCOUNT,
    _class: constants.ENTITY_CLASS_ACCOUNT,
    _key: mockOktaOrgUrl,
    name: mockOktaDomain,
    webLink: mockOktaOrgUrl,
    displayName: mockOktaDomain,
  };
}

function getMockAccountEntityOperations() {
  const mockAccount = getMockAccount();
  return [
    {
      type: EntityOperationType.CREATE_ENTITY,
      entityKey: mockAccount.webLink,
      entityType: constants.ENTITY_TYPE_ACCOUNT,
      entityClass: "Account",
      timestamp: executionContext.event.timestamp,
      properties: {
        name: "dummy",
        displayName: "dummy",
        webLink: mockAccount.webLink,
      },
    },
  ];
}

function getMockServiceEntityOperations() {
  return [
    {
      type: EntityOperationType.CREATE_ENTITY,
      entityKey: "okta:sso:dummy",
      entityType: constants.ENTITY_TYPE_SERVICE,
      entityClass: ["Service", "Control"],
      timestamp: executionContext.event.timestamp,
      properties: {
        name: "SSO",
        displayName: "Okta SSO",
        category: "security",
        function: "sso",
        controlDomain: "identity-access",
      },
    },
    {
      type: EntityOperationType.CREATE_ENTITY,
      entityKey: "okta:mfa:dummy",
      entityType: constants.ENTITY_TYPE_SERVICE,
      entityClass: ["Service", "Control"],
      timestamp: executionContext.event.timestamp,
      properties: {
        name: "MFA",
        displayName: "Okta MFA",
        category: "security",
        function: "mfa",
        controlDomain: "identity-access",
      },
    },
  ];
}

function getMockAccountServiceRelationshipOperations() {
  const mockAccount = getMockAccount();
  const timestamp = executionContext.event.timestamp;
  return [
    {
      type: RelationshipOperationType.CREATE_RELATIONSHIP,
      relationshipKey: `${mockAccount._key}|has|okta:sso:dummy`,
      relationshipType: constants.RELATIONSHIP_TYPE_ACCOUNT_SERVICE,
      fromEntityKey: mockAccount._key,
      toEntityKey: "okta:sso:dummy",
      relationshipClass: "HAS",
      timestamp,
      properties: {
        displayName: "HAS",
      },
    },
    {
      type: RelationshipOperationType.CREATE_RELATIONSHIP,
      relationshipKey: `${mockAccount._key}|has|okta:mfa:dummy`,
      relationshipType: constants.RELATIONSHIP_TYPE_ACCOUNT_SERVICE,
      fromEntityKey: mockAccount._key,
      toEntityKey: "okta:mfa:dummy",
      relationshipClass: "HAS",
      timestamp,
      properties: {
        displayName: "HAS",
      },
    },
  ];
}

let executionContext: OktaExecutionContext;
let mockOktaClient: jest.Mocked<OktaClient>;

beforeEach(() => {
  const testContext = createTestIntegrationExecutionContext({
    instance: {
      config: {
        oktaApiKey: uuidV4(),
        oktaOrgUrl: mockOktaOrgUrl,
      },
    },
  });

  mockOktaClient = createOktaClient(
    testContext.logger,
    mockOktaOrgUrl,
    mockOktaToken,
  ) as jest.Mocked<OktaClient>;

  executionContext = {
    ...testContext,
    ...testContext.clients.getClients(),
    okta: mockOktaClient,
  };
});

test("should only build account and service entities and relationships if there is no other data", async () => {
  mockOktaClient.listUsers.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listUserGroups.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplications.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationUsers.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationGroupAssignments.mockResolvedValue(
    EMPTY_OKTA_COLLECTION,
  );

  jest.spyOn(executionContext.graph, "findEntities").mockResolvedValue([]);
  jest.spyOn(executionContext.graph, "findRelationships").mockResolvedValue([]);

  const [entityOperations, relationshipOperations] = await synchronize(
    executionContext,
  );

  expect(entityOperations).toEqual([
    ...getMockAccountEntityOperations(),
    ...getMockServiceEntityOperations(),
  ]);
  expect(relationshipOperations).toEqual(
    getMockAccountServiceRelationshipOperations(),
  );
});

test("should build a CreateEntityOperation for a new user", async () => {
  const mockUser = getMockUser();

  mockOktaClient.listUsers.mockResolvedValue({
    each: (cb: (item: OktaUser) => void) => {
      cb(mockUser);
    },
  });

  mockOktaClient.listFactors.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listUserGroups.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplications.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationUsers.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationGroupAssignments.mockResolvedValue(
    EMPTY_OKTA_COLLECTION,
  );

  jest.spyOn(executionContext.graph, "findEntities").mockResolvedValue([]);
  jest.spyOn(executionContext.graph, "findRelationships").mockResolvedValue([]);

  const [entityOperations, relationshipOperations] = await synchronize(
    executionContext,
  );

  const entityKey = mockUser.id;

  expect(entityOperations).toEqual([
    ...getMockAccountEntityOperations(),
    ...getMockServiceEntityOperations(),
    {
      type: EntityOperationType.CREATE_ENTITY,
      entityKey,
      entityType: constants.ENTITY_TYPE_USER,
      entityClass: "User",
      timestamp: executionContext.event.timestamp,
      properties: {
        webLink: `${mockOktaAdminUrl}/admin/user/profile/view/${mockUser.id}`,
        ...converters.flattenUser(mockUser),
      },
    },
  ]);

  expect(relationshipOperations).toEqual(
    getMockAccountServiceRelationshipOperations(),
  );
});

test("should diff new users from existing users", async () => {
  const oldMockUser = getMockUser();
  const newUserStatus = "ACTIVE";
  const accountEntityId = uuidV4();
  const userEntityId = uuidV4();
  const mockAccount = getMockAccount();

  // Create a new mock user that has an updated status.
  const newMockUser = {
    ...oldMockUser,
    status: newUserStatus,
  };

  const key = oldMockUser.id;

  mockOktaClient.listUsers.mockResolvedValue({
    each: (cb: (item: OktaUser) => void) => {
      cb(newMockUser);
    },
  });

  mockOktaClient.listFactors.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listUserGroups.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplications.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationUsers.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationGroupAssignments.mockResolvedValue(
    EMPTY_OKTA_COLLECTION,
  );

  jest
    .spyOn(executionContext.graph, "findEntities")
    .mockResolvedValueOnce([
      {
        _id: accountEntityId,
        ...mockAccount,
      },
    ])
    // Second call is for fetching existing services
    .mockResolvedValueOnce([])
    // Third call is for fetching existing users
    .mockResolvedValueOnce(([
      {
        _id: userEntityId,
        _key: key,
        ...converters.flattenUser(oldMockUser),
      },
    ] as unknown) as EntityFromIntegration[])
    // Remaining calls always return empty list
    .mockResolvedValue([]);

  jest.spyOn(executionContext.graph, "findRelationships").mockResolvedValue([]);

  const [entityOperations, relationshipOperations] = await synchronize(
    executionContext,
  );
  // Validate that the "status" has been updated
  const expectedEntityOperations = [
    ...getMockServiceEntityOperations(),
    {
      type: EntityOperationType.UPDATE_ENTITY,
      entityId: userEntityId,
      timestamp: executionContext.event.timestamp,
      properties: {
        _class: "User",
        _type: "okta_user",
        status: newUserStatus,
        active: true,
        webLink: `${mockOktaAdminUrl}/admin/user/profile/view/${
          newMockUser.id
        }`,
      },
    },
  ];

  expect(entityOperations).toEqual(expectedEntityOperations);

  expect(relationshipOperations).toEqual(
    getMockAccountServiceRelationshipOperations(),
  );
});

test("should create user entities and relationships", async () => {
  const mockUser = getMockUser();
  const mockUserGroup = getMockUserGroup();
  const mockAccount = getMockAccount();
  const userEntityKey = mockUser.id;
  const userGroupEntityKey = mockUserGroup.id;
  const groupUserRelationshipKey = `${userGroupEntityKey}|has_user|${userEntityKey}`;
  const accountGroupRelationshipKey = `${
    mockAccount._key
  }|has|${userGroupEntityKey}`;

  mockOktaClient.listUsers.mockResolvedValue({
    each: (cb: (item: OktaUser) => void) => {
      cb(mockUser);
    },
  });

  mockOktaClient.listUserGroups.mockResolvedValue({
    each: (cb: (item: OktaUserGroup) => void) => {
      cb(mockUserGroup);
    },
  });

  mockOktaClient.listFactors.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplications.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationUsers.mockResolvedValue(EMPTY_OKTA_COLLECTION);
  mockOktaClient.listApplicationGroupAssignments.mockResolvedValue(
    EMPTY_OKTA_COLLECTION,
  );

  jest.spyOn(executionContext.graph, "findEntities").mockResolvedValue([]);
  jest.spyOn(executionContext.graph, "findRelationships").mockResolvedValue([]);

  const [entityOperations, relationshipOperations] = await synchronize(
    executionContext,
  );
  const timestamp = executionContext.event.timestamp;

  const expectedEntityOperations = [
    ...getMockAccountEntityOperations(),
    ...getMockServiceEntityOperations(),
    {
      type: EntityOperationType.CREATE_ENTITY,
      entityKey: userEntityKey,
      entityType: constants.ENTITY_TYPE_USER,
      entityClass: "User",
      timestamp,
      properties: {
        webLink: `${mockOktaAdminUrl}/admin/user/profile/view/${mockUser.id}`,
        ...converters.flattenUser(mockUser),
      },
    },
    {
      type: EntityOperationType.CREATE_ENTITY,
      entityKey: userGroupEntityKey,
      entityType: constants.ENTITY_TYPE_USER_GROUP,
      entityClass: "UserGroup",
      timestamp,
      properties: {
        webLink: `${mockOktaAdminUrl}/admin/group/${mockUserGroup.id}`,
        ...converters.flattenUserGroup(mockUserGroup),
      },
    },
  ];
  expect(entityOperations).toEqual(expectedEntityOperations);

  const expectedRelationshipOperations = [
    ...getMockAccountServiceRelationshipOperations(),
    {
      type: RelationshipOperationType.CREATE_RELATIONSHIP,
      relationshipKey: accountGroupRelationshipKey,
      relationshipType: constants.RELATIONSHIP_TYPE_ACCOUNT_GROUP,
      fromEntityKey: mockAccount._key,
      toEntityKey: userGroupEntityKey,
      relationshipClass: "HAS",
      timestamp,
      properties: {
        displayName: "HAS",
        accountUrl: mockAccount.webLink,
        groupId: mockUserGroup.id,
      },
    },
    {
      type: RelationshipOperationType.CREATE_RELATIONSHIP,
      relationshipKey: groupUserRelationshipKey,
      relationshipType: constants.RELATIONSHIP_TYPE_GROUP_USER,
      toEntityKey: userEntityKey,
      fromEntityKey: userGroupEntityKey,
      relationshipClass: "HAS",
      timestamp,
      properties: {
        userId: mockUser.id,
        groupId: mockUserGroup.id,
        displayName: "HAS",
      },
    },
  ];
  expect(relationshipOperations).toEqual(expectedRelationshipOperations);
});
