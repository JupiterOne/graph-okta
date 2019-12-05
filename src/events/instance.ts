import Alpha from "@lifeomic/alpha";
import Logger from "bunyan";

const alpha = new Alpha("lambda://jupiter-integration-service:deployed");

const integrationInstanceQuery = `
  query GetIntegrationInstance (
    $instanceInput: GetIntegrationInstanceInput!
  ) {
    integrationInstance (input: $instanceInput) {
      accountId
      id
      name
      config
    }
  }
`;

interface GraphQLError {
  message: string;
}

interface IntegrationInstance {
  accountId: string;
  id: string;
  name: string;
  config: {
    authenticationSecret?: string;
  };
}

export default async function getIntegrationInstance(
  accountId: string,
  integrationInstanceId: string,
  logger: Logger,
): Promise<IntegrationInstance> {
  try {
    const response = await alpha.post("/private/graphql", {
      query: integrationInstanceQuery,
      variables: {
        instanceInput: {
          id: integrationInstanceId,
          accountId,
        },
      },
    });

    const { data: body } = response;
    return body.data.integrationInstance;
  } catch (err) {
    if (err.response) {
      const { data: body } = err.response;
      if (body.errors) {
        throw new Error(
          (body.errors as GraphQLError[]).reduce(
            (errorMessage: string, { message }) => {
              return `${errorMessage}, ${message}`;
            },
            "",
          ),
        );
      }
    }

    throw err;
  }
}
