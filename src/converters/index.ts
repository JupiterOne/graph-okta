import {
  EntityFromIntegration,
  RelationshipFromIntegration,
} from "@jupiterone/jupiter-managed-integration-sdk";

export * from "./account";
export * from "./application";
export * from "./device";
export * from "./group";
export * from "./service";
export * from "./user";

export function createHasRelationships(
  fromEntity: EntityFromIntegration,
  toEntities: EntityFromIntegration[],
  relationshipType: string,
  relationshipProperties?: any,
) {
  const relationships: RelationshipFromIntegration[] = [];
  for (const e of toEntities) {
    relationships.push(
      createHasRelationship(
        fromEntity,
        e,
        relationshipType,
        relationshipProperties,
      ),
    );
  }
  return relationships;
}

export function createHasRelationship(
  fromEntity: EntityFromIntegration,
  toEntity: EntityFromIntegration,
  relationshipType: string,
  relationshipProperties?: any,
) {
  const relationship: RelationshipFromIntegration = {
    _key: `${fromEntity._key}|has|${toEntity._key}`,
    _type: relationshipType,
    _class: "HAS",
    _fromEntityKey: fromEntity._key,
    _toEntityKey: toEntity._key,
    displayName: "HAS",
    ...relationshipProperties,
  };

  return relationship;
}
