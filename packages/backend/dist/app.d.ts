import { Express } from 'express';
/**
 * Create and configure Express application
 */
export declare function createApp(): Express;
/**
 * Start the server
 */
export declare function startServer(): Promise<{
    app: Express;
    port: number;
}>;
export default createApp;
//# sourceMappingURL=app.d.ts.map