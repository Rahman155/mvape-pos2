/**
 * EXAMPLE: Authentication routes with authorization
 *
 * This file demonstrates how to use the authorization middleware
 * in actual route handlers. This is an example and should be adapted
 * to your actual authentication system implementation.
 *
 * Real implementation would:
 * 1. Implement actual JWT token generation/validation
 * 2. Hash and verify passwords
 * 3. Store sessions in database
 * 4. Handle token refresh
 * 5. Implement session management
 */
import express from 'express';
export declare const authRouter: ReturnType<typeof express.Router>;
export default authRouter;
//# sourceMappingURL=auth.example.d.ts.map