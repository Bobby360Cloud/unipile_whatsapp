import env from 'dotenv';

env.config();

export default {
  port: (process.env.NODE_ENV === 'test') ? process.env.TEST_APP_PORT : process.env.PORT || 7005,
  unipile_dsn: process.env.UNIPILE_DSN ,
  unipile_api_key: process.env.UNIPILE_API_KEY ,
  mongodb_url: process.env.MONGODB_URI,
  
};