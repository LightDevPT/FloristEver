import serverless from 'serverless-http';
import { createApp } from '../../light-group-login/src/app.js';

const app = createApp();
export const handler = serverless(app);
