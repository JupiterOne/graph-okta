import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  parseTimePropertyValue,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  DATA_ACCOUNT_ENTITY,
  Entities,
  IngestionSources,
  Relationships,
  Steps,
} from './constants';

export async function fetchRules({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  try {
    await apiClient.iterateRules(async (rule) => {
      if (!rule.id) {
        return;
      }
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
              status: rule.status?.toLowerCase(), //example: 'ACTIVE' or 'INACTIVE'
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

      for (const groupId of rule.actions?.assignUserToGroups?.groupIds || []) {
        if (jobState.hasKey(groupId)) {
          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.MANAGES,
              fromType: Entities.RULE._type,
              fromKey: ruleEntity._key,
              toType: Entities.USER_GROUP._type,
              toKey: groupId,
            }),
          );
        } else {
          logger.warn(
            `Rule points to non-existent group. Expected group with key to exist (key=${groupId})`,
          );
        }
      }
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch rules');
    throw err;
  }
}

export const ruleSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.RULES,
    ingestionSourceId: IngestionSources.RULES,
    name: 'Fetch Rules',
    entities: [Entities.RULE],
    relationships: [
      Relationships.ACCOUNT_HAS_RULE,
      Relationships.RULE_MANAGES_USER_GROUP,
    ],
    dependsOn: [Steps.USERS, Steps.GROUPS],
    executionHandler: fetchRules,
  },
];
