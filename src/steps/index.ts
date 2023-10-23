import { accountSteps } from './account';
import { userSteps } from './users';
import { groupSteps } from './groups';
import { factorDeviceSteps } from './factorDevices';
import { applicationSteps } from './applications';
import { ruleSteps } from './rules';
import { roleSteps } from './roles';
import { applicationCreationSteps } from './applicationCreation';
import { deviceSteps } from './devices';

const integrationSteps = [
  ...accountSteps,
  ...userSteps,
  ...groupSteps,
  ...factorDeviceSteps,
  ...applicationSteps,
  ...ruleSteps,
  ...roleSteps,
  ...applicationCreationSteps,
  ...deviceSteps,
];

export { integrationSteps };
