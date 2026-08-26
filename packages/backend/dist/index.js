import { startServer } from './app.js';
import { logger } from './utils/logger.js';
/**
 * Application entry point
 */
async function main() {
    try {
        const { port } = await startServer();
        logger.info(`🚀 Backend API is running on http://localhost:${port}`);
    }
    catch (error) {
        logger.error('Failed to start application', error);
        process.exit(1);
    }
}
// Start the application
main().catch((error) => {
    logger.error('Unexpected error', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map