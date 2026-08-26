import { startServer } from './app.js';
import { logger } from './utils/logger.js';

/**
 * Application entry point
 */
async function main(): Promise<void> {
  try {
    const { port } = await startServer();
    logger.info(`🚀 Backend API is running on http://localhost:${port}`);
  } catch (error) {
    logger.error('Failed to start application', error as Error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error('Unexpected error', error);
  process.exit(1);
});
