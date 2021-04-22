import { accountSteps } from './account';
import { userSteps } from './users';
import { groupSteps } from './groups';
import { factorSteps } from './factors';
import { applicationSteps } from './applications';

const integrationSteps = [
  ...accountSteps,
  ...userSteps,
  ...groupSteps,
  ...factorSteps,
  ...applicationSteps,
];

export { integrationSteps };
