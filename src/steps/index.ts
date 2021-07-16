import { accountSteps } from './account';
import { userSteps } from './users';
import { groupSteps } from './groups';
import { deviceSteps } from './devices';
import { applicationSteps } from './applications';
import { ruleSteps } from './rules';

const integrationSteps = [
  ...accountSteps,
  ...userSteps,
  ...groupSteps,
  ...deviceSteps,
  ...applicationSteps,
  ...ruleSteps,
];

export { integrationSteps };
