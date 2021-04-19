import { accountSteps } from './account';
import { accessSteps } from './access';
import { applicationSteps } from './applications';

const integrationSteps = [...accountSteps, ...accessSteps, ...applicationSteps];

export { integrationSteps };
