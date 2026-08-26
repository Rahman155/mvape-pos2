import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
/**
 * Parse environment variables and validate configuration
 */
function parseConfig() {
    const nodeEnv = (process.env.NODE_ENV || 'development');
    const port = parseInt(process.env.PORT || '3001', 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error(`Invalid PORT: ${process.env.PORT}. Must be between 1 and 65535`);
    }
    const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    const databasePoolMin = parseInt(process.env.DATABASE_POOL_MIN || '2', 10);
    const databasePoolMax = parseInt(process.env.DATABASE_POOL_MAX || '10', 10);
    if (databasePoolMin < 1 || databasePoolMax < databasePoolMin) {
        throw new Error('Invalid DATABASE_POOL configuration');
    }
    return {
        server: {
            port,
            nodeEnv,
            isDevelopment: nodeEnv === 'development',
            isProduction: nodeEnv === 'production',
            isStaging: nodeEnv === 'staging',
        },
        database: {
            url: process.env.DATABASE_URL || '',
            poolMin: databasePoolMin,
            poolMax: databasePoolMax,
        },
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
        },
        api: {
            prefix: process.env.API_PREFIX || '/api/v1',
            corsOrigin: corsOrigin.map((origin) => origin.trim()),
        },
        jwt: {
            secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            expiry: process.env.JWT_EXPIRY || '24h',
            refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
            refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        },
        storage: {
            type: (process.env.STORAGE_TYPE || 'local'),
            bucket: process.env.STORAGE_BUCKET || 'vapestore-pos-uploads',
            region: process.env.STORAGE_REGION,
            accessKey: process.env.STORAGE_ACCESS_KEY,
            secretKey: process.env.STORAGE_SECRET_KEY,
        },
        logging: {
            level: (process.env.LOG_LEVEL || 'info'),
        },
        requestTracking: {
            idHeader: process.env.REQUEST_ID_HEADER || 'x-request-id',
        },
    };
}
export const config = parseConfig();
/**
 * Validate critical configuration
 */
export function validateConfig() {
    if (config.server.isProduction) {
        // Production validations
        if (config.jwt.secret === 'your-secret-key-change-in-production') {
            throw new Error('JWT_SECRET must be changed in production environment');
        }
        if (!config.database.url || !process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is required in production environment');
        }
    }
    // Log config status for debugging
    console.log('[Config] Environment:', config.server.nodeEnv);
    console.log('[Config] API Prefix:', config.api.prefix);
    console.log('[Config] CORS Origins:', config.api.corsOrigin);
}
//# sourceMappingURL=index.js.map