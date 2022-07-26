import { accountSteps } from './account';
import { userSteps } from './users';
import { groupSteps } from './groups';
import { deviceSteps } from './devices';
import { applicationSteps } from './applications';
import { ruleSteps } from './rules';
import { roleSteps } from './roles';
import { applicationCreationSteps } from './applicationCreation';

const integrationSteps = [
  ...accountSteps,
  ...userSteps,
  ...groupSteps,
  ...deviceSteps,
  ...applicationSteps,
  ...ruleSteps,
  ...roleSteps,
  ...applicationCreationSteps,
];

export { integrationSteps };
