import express from 'express';
import { setupSecurity } from '@middlewares/security.middleware';
import { globalLimiter } from '@middlewares/rateLimiter.middleware';
import { logRequest } from '@middlewares/logger.middleware';
import routers from '@routes/index';
import { handleError, handleNotFound } from '@middlewares/error.middleware';

const app = express();

app.use(setupSecurity());
app.use(globalLimiter());
app.use(logRequest);

app.use('/api/v1', routers);

app.use(handleError);
app.use(handleNotFound);
