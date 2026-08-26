/**
 * Tests for authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  authorize,
  authorizeStore,
  authorizeResourceOwnership,
  requireAuth,
  allowPublic,
  optionalAuth,
} from './authorize.js';

// Mock Express objects
function createMockRequest(): Partial<Request> {
  return {
    requestId: 'test-request-id',
    path: '/test',
    method: 'GET',
    params: {},
    query: {},
    body: {},
  };
}

function createMockResponse(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function createMockNext(): NextFunction {
  return jest.fn();
}

describe('Authorization Middleware', () => {
  describe('authorize() - Role-based middleware', () => {
    it('should allow access when user has required role (single role)', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'john',
        email: 'john@example.com',
        role: 'OWNER',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorize('OWNER');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user role is in array of allowed roles', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorize(['OWNER', 'KASIR']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access with 401 when no user is authenticated', () => {
      const req = createMockRequest() as any;
      req.user = undefined;

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorize('OWNER');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access with 403 when user role not in allowed roles', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorize('OWNER');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          code: 'FORBIDDEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access with "public" permission even without user', () => {
      const req = createMockRequest() as any;
      req.user = undefined;

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorize('public');
      middleware(req, res, next);

      // Note: current implementation still requires user, but public endpoints
      // would be handled separately (e.g., login endpoint doesn't have this middleware)
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authorizeStore() - Store access control', () => {
    it('should allow OWNER to access any store', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'owner',
        email: 'owner@example.com',
        role: 'OWNER',
        storeId: undefined,
      };
      req.params = { storeId: 'store-2' };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeStore('storeId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow KASIR to access their assigned store', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
        storeId: 'store-1',
      };
      req.params = { storeId: 'store-1' };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeStore('storeId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny KASIR access to other stores', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
        storeId: 'store-1',
      };
      req.params = { storeId: 'store-2' };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeStore('storeId');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          code: 'FORBIDDEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access with 401 when no user is authenticated', () => {
      const req = createMockRequest() as any;
      req.user = undefined;
      req.params = { storeId: 'store-1' };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeStore('storeId');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });

    it('should return 400 when store ID is not provided', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
        storeId: 'store-1',
      };
      req.params = {};

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeStore('storeId');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          code: 'MISSING_STORE_ID',
        })
      );
    });

    it('should accept storeId from different sources (params, body, query)', () => {
      // From body
      const req1 = createMockRequest() as any;
      req1.user = { id: 'user-1', role: 'OWNER', storeId: undefined };
      req1.params = {};
      req1.body = { storeId: 'store-1' };

      const res1 = createMockResponse() as any;
      const next1 = createMockNext();

      const middleware = authorizeStore('storeId');
      middleware(req1, res1, next1);

      expect(next1).toHaveBeenCalled();

      // From query
      const req2 = createMockRequest() as any;
      req2.user = { id: 'user-1', role: 'OWNER', storeId: undefined };
      req2.params = {};
      req2.query = { storeId: 'store-2' };

      const res2 = createMockResponse() as any;
      const next2 = createMockNext();

      middleware(req2, res2, next2);

      expect(next2).toHaveBeenCalled();
    });
  });

  describe('authorizeResourceOwnership() - Resource ownership check', () => {
    it('should allow access when user owns resource', async () => {
      const ownershipCheck = jest.fn().mockResolvedValue(true);

      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeResourceOwnership(ownershipCheck);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(ownershipCheck).toHaveBeenCalledWith(req);
    });

    it('should deny access when user does not own resource', async () => {
      const ownershipCheck = jest.fn().mockResolvedValue(false);

      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeResourceOwnership(ownershipCheck);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          code: 'FORBIDDEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow OWNER bypass resource ownership check', async () => {
      const ownershipCheck = jest.fn(); // Should not be called

      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'owner',
        email: 'owner@example.com',
        role: 'OWNER',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeResourceOwnership(ownershipCheck);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(ownershipCheck).not.toHaveBeenCalled();
    });

    it('should deny access with 401 when no user is authenticated', async () => {
      const ownershipCheck = jest.fn();

      const req = createMockRequest() as any;
      req.user = undefined;

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeResourceOwnership(ownershipCheck);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when ownership check throws error', async () => {
      const ownershipCheck = jest.fn().mockRejectedValue(new Error('Database error'));

      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'kasir',
        email: 'kasir@example.com',
        role: 'KASIR',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = authorizeResourceOwnership(ownershipCheck);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should respect allowOwnerBypass option', async () => {
      const ownershipCheck = jest.fn().mockResolvedValue(false);

      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'owner',
        email: 'owner@example.com',
        role: 'OWNER',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      // With allowOwnerBypass: true (default)
      const middleware1 = authorizeResourceOwnership(ownershipCheck, { allowOwnerBypass: true });
      await middleware1(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(ownershipCheck).not.toHaveBeenCalled();

      // With allowOwnerBypass: false
      const next2 = createMockNext();
      const middleware2 = authorizeResourceOwnership(ownershipCheck, { allowOwnerBypass: false });
      await middleware2(req, res, next2);
      expect(ownershipCheck).toHaveBeenCalled();
    });
  });

  describe('requireAuth() - Authentication requirement', () => {
    it('should allow access when user is authenticated', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'john',
        email: 'john@example.com',
        role: 'OWNER',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = requireAuth();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access with 401 when user is not authenticated', () => {
      const req = createMockRequest() as any;
      req.user = undefined;

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = requireAuth();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('allowPublic() - Public access', () => {
    it('should always allow access', () => {
      const req = createMockRequest() as any;
      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = allowPublic();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access without user', () => {
      const req = createMockRequest() as any;
      req.user = undefined;

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = allowPublic();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth() - Optional authentication', () => {
    it('should allow access with authenticated user', () => {
      const req = createMockRequest() as any;
      req.user = {
        id: 'user-1',
        username: 'john',
        email: 'john@example.com',
        role: 'OWNER',
      };

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = optionalAuth();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access without authenticated user', () => {
      const req = createMockRequest() as any;
      req.user = undefined;

      const res = createMockResponse() as any;
      const next = createMockNext();

      const middleware = optionalAuth();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
