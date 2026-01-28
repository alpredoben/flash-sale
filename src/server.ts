import express from 'express';
import { setupSecurity } from '@middlewares/security.middleware';
import { globalLimiter } from '@middlewares/rateLimiter.middleware';
import { logRequest } from '@middlewares/logger.middleware';
import routes from '@routes/index';
import { handleError, handleNotFound } from '@middlewares/error.middleware';

const app = express();

app.use(setupSecurity());
app.use(globalLimiter());
app.use(logRequest);

app.post('/api/v1', routes);

app.use(handleError);
app.use(handleNotFound);
