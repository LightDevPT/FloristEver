import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

await connectDb();

const app = createApp();
app.listen(env.PORT, () => {
  logger.info(`Light Group Login ativo em ${env.PUBLIC_BASE_URL}`);
});
