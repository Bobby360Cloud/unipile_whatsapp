import env from 'dotenv';

env.config();

export default {
  port: (process.env.NODE_ENV === 'test') ? process.env.TEST_APP_PORT : process.env.PORT || 7005,
};