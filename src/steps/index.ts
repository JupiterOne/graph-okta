import { accountSteps } from './account';
import { accessSteps } from './access';
import { applicationSteps } from './applications';
import { ruleSteps } from './rules';

const integrationSteps = [
  ...accountSteps,
  ...accessSteps,
  ...applicationSteps,
  ...ruleSteps,
];

export { integrationSteps };
