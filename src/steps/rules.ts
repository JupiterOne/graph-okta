import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { DATA_ACCOUNT_ENTITY } from '../okta/constants';
import { Entities, Relationships, Steps } from './constants';

export async function fetchRules({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateRules(async (rule) => {
    const ruleEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: rule,
          assign: {
            _key: rule.id,
            _type: Entities.RULE._type,
            _class: Entities.RULE._class,
            id: rule.id,
            name: rule.name,
            ruleType: rule.type, //example: 'group_rule', 'policy_rule'
            status: rule.status, //example: 'ACTIVE' or 'INACTIVE'
            created: parseTimePropertyValue(rule.created)!,
            createdOn: parseTimePropertyValue(rule.created)!,
            lastUpdated: parseTimePropertyValue(rule.lastUpdated)!,
            lastUpdatedOn: parseTimePropertyValue(rule.lastUpdated)!,
            conditions: JSON.stringify(rule.conditions),
            actions: JSON.stringify(rule.actions),
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: ruleEntity,
      }),
    );
  });
}

export const ruleSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.RULES,
    name: 'Fetch Rules',
    entities: [Entities.RULE],
    relationships: [Relationships.ACCOUNT_HAS_RULE],
    dependsOn: [Steps.USERS],
    executionHandler: fetchRules,
  },
];
