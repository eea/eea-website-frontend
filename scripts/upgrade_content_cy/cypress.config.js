const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  numTestsKeptInMemory: 1,
  experimentalMemoryManagement: true,
  e2e: {
    baseUrl: process.env.CYPRESS_URL,
    viewportWidth: 1920,
    viewportHeight: 1280,
    env: {
      loginRoute: process.env.CYPRESS_LOGIN_ROUTE,
      username: process.env.CYPRESS_USERNAME,
      password: process.env.CYPRESS_PASSWORD,
      multiLingual: process.env.CYPRESS_MULTILINGUAL === 'true', // Convert string to boolean
      contentTypes: process.env.CYPRESS_CONTENT_TYPES.split(','), // Convert string to array
    },
  },
};
