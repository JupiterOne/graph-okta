import {
  Recording,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';
import { Steps } from './constants';
import { setupOktaRecording } from '../../test/setup/recording';
import { buildStepTestConfig } from '../../test/config';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe(Steps.DEVICES, () => {
  test.skip('success', async () => {
    recording = setupOktaRecording({
      name: Steps.DEVICES,
      directory: __dirname,
    });

    const stepConfig = buildStepTestConfig(Steps.DEVICES);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  });
});
