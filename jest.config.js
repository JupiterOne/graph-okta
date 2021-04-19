module.exports = require('@jupiterone/integration-sdk-dev-tools/config/jest');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, './.env') });
