import env from 'dotenv';

env.config();

export default {
  port: (process.env.NODE_ENV === 'test') ? process.env.TEST_APP_PORT : process.env.PORT || 7005,
  UNIPILE_DSN: process.env.UNIPILE_DSN ,
  UNIPILE_API_KEY: process.env.UNIPILE_API_KEY ,
  MONGODB_URL: process.env.MONGODB_URI,
  PHP_SERVER_URL:process.env.PHP_SERVER_URL,
  APP_HOST: process.env.APP_HOST,
};