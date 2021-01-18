module.exports = {
  ...require('@jupiterone/integration-sdk-dev-tools/config/jest'),
  globalSetup: './jest.globalSetup.js',
  setupFiles: ['dotenv/config'],
};
