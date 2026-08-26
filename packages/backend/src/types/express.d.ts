/**
 * Type definitions for Express request extensions
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * Unique request ID for tracking and logging
       * Generated as UUID for each request
       */
      requestId: string;

      /**
       * Request start time (milliseconds since epoch)
       * Used to calculate request duration
       */
      startTime: number;

      /**
       * Authenticated user information (to be set during auth middleware)
       */
      user?: {
        id: string;
        username: string;
        email: string;
        role: 'KASIR' | 'OWNER' | 'ADMIN';
        storeId?: string;
      };

      /**
       * User's authentication token
       */
      token?: string;
    }
  }
}

export {};
