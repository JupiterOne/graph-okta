import { createMockIntegrationLogger } from '@jupiterone/integration-sdk-testing';
import buildApplicationGroupRelationshipId from './buildEntityRelationships';

describe('buildApplicationGroupRelationshipId()', () => {
  const logger = createMockIntegrationLogger();
  describe('given invalid app id', () => {
    it('should return undefined', () => {
      const result = buildApplicationGroupRelationshipId(
        'acb4dde56b984e41',
        '',
        logger,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('given invalid group id', () => {
    it('should return null', () => {
      const result = buildApplicationGroupRelationshipId(
        '',
        '9c69f04b268358f6',
        logger,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('given a valid entities ids', () => {
    it('should build it and return it', () => {
      const result = buildApplicationGroupRelationshipId(
        'acb4dde56b984e41',
        '9c69f04b268358f6',
        logger,
      );
      expect(result).toEqual('acb4dde56b984e41|assigned|9c69f04b268358f6');
    });
  });
});
