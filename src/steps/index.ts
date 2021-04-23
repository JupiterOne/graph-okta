import { accountSteps } from './account';
import { userSteps } from './users';
import { groupSteps } from './groups';
import { deviceSteps } from './devices';
import { applicationSteps } from './applications';

const integrationSteps = [
  ...accountSteps,
  ...userSteps,
  ...groupSteps,
  ...deviceSteps,
  ...applicationSteps,
];

export { integrationSteps };
