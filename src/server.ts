import server from './app';
import { environment } from './configs';
import logger from '@utils/logger.util';

if (environment.nodeEnv !== 'test') {
  server.startApp().catch((error) => {
    logger.error('Fatal error during server startup', error);
    process.exit(1);
  });
}
