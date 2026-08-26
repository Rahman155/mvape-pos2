export interface Config {
    server: {
        port: number;
        nodeEnv: 'development' | 'staging' | 'production';
        isDevelopment: boolean;
        isProduction: boolean;
        isStaging: boolean;
    };
    database: {
        url: string;
        poolMin: number;
        poolMax: number;
    };
    redis: {
        url: string;
        password?: string;
    };
    api: {
        prefix: string;
        corsOrigin: string[];
    };
    jwt: {
        secret: string;
        expiry: string;
        refreshSecret: string;
        refreshExpiry: string;
    };
    storage: {
        type: 'local' | 's3' | 'minio';
        bucket: string;
        region?: string;
        accessKey?: string;
        secretKey?: string;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
    };
    requestTracking: {
        idHeader: string;
    };
}
export declare const config: Config;
/**
 * Validate critical configuration
 */
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map