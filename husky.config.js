//module.exports = require('@jupiterone/integration-sdk-dev-tools/config/husky');

module.exports = {
  hooks: {
    'pre-commit': 'lint-staged',
    'pre-push': 'yarn prepush',
  },
};
