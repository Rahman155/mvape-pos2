/**
 * Product Routes Tests
 * Unit and integration tests for product listing and search functionality
 */

import express, { Express } from 'express';
import { productsRouter } from './products';
import { db } from '../database/index.js';
import { redis } from '../cache/index.js';

// Mock dependencies
jest.mock('../database/index.js');
jest.mock('../cache/index.js');
jest.mock('../middleware/auth.js');

describe('Product Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock middleware that sets req.user
    app.use((req, res, next) => {
      req.user = {
        id: 'user-123',
        role: 'KASIR',
        storeId: 'store-123',
      };
      req.requestId = 'req-123';
      next();
    });

    app.use('/products', productsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /products/search', () => {
    it('should search products by name', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Vape Juice 30ml',
          sku: 'VJ-30ML-001',
          category: 'Juice',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Premium vape juice',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        },
      ];

      const mockCountResult = {
        rows: [{ total: 1 }],
      };

      const mockProductResult = {
        rows: mockProducts,
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockProductResult);

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?q=juice&storeId=store-123&limit=20&offset=0'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Vape Juice 30ml');
      expect(response.body.pagination.total).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pages).toBe(1);
    });

    it('should search products by SKU', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Vape Juice 30ml',
          sku: 'VJ-30ML-001',
          category: 'Juice',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Premium vape juice',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?q=VJ-30ML-001&storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('VJ-30ML-001');
    });

    it('should filter products by category', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Vape Juice 30ml',
          sku: 'VJ-30ML-001',
          category: 'Juice',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Premium vape juice',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?category=Juice&storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Juice');
    });

    it('should include stock availability flag', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'In Stock Product',
          sku: 'ISP-001',
          category: 'Juice',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Available product',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 10,
        },
        {
          id: 'prod-2',
          name: 'Out of Stock Product',
          sku: 'OSP-001',
          category: 'Juice',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Unavailable product',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 0,
          reserved: 0,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body.data[0].isAvailable).toBe(true);
      expect(response.body.data[1].isAvailable).toBe(false);
    });

    it('should respect pagination limits', async () => {
      const mockProducts = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `prod-${i}`,
          name: `Product ${i}`,
          sku: `PROD-${i}`,
          category: 'Test',
          cost_price: '15000',
          selling_price: '25000',
          description: `Product ${i}`,
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        }));

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 100 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?storeId=store-123&limit=10&offset=0'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pages).toBe(10);
    });

    it('should cache results for 5 minutes', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Cached Product',
          sku: 'CP-001',
          category: 'Test',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Cacheable product',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?q=cache&storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('products:search:'),
        expect.any(String),
        300
      );
    });

    it('should return cached results on cache hit', async () => {
      const cachedData = {
        data: [
          {
            id: 'prod-1',
            name: 'Cached Product',
            sku: 'CP-001',
            quantity: 50,
            reserved: 0,
            isAvailable: true,
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, pages: 1 },
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const response = await app._request(
        'GET',
        '/products/search?q=cache&storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          data: cachedData.data,
          pagination: cachedData.pagination,
        })
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      app.use((req, res, next) => {
        req.user = null;
        next();
      });

      const response = await app._request('GET', '/products/search');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle database errors gracefully', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (db.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await app._request(
        'GET',
        '/products/search?storeId=store-123'
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /products/:id', () => {
    it('should retrieve a single product with inventory', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Single Product',
        sku: 'SP-001',
        category: 'Test',
        cost_price: '15000',
        selling_price: '25000',
        description: 'Single product',
        image_url: 'https://example.com/image.jpg',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        quantity: 50,
        reserved: 0,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockProduct],
      });

      const response = await app._request(
        'GET',
        '/products/prod-1?storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('prod-1');
      expect(response.body.data.isAvailable).toBe(true);
    });

    it('should return 404 if product not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const response = await app._request(
        'GET',
        '/products/nonexistent?storeId=store-123'
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /products', () => {
    it('should list all products for a store', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Product 1',
          sku: 'P1',
          category: 'Test',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Product 1',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      const response = await app._request(
        'GET',
        '/products?storeId=store-123&limit=20&offset=0'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should return empty array when no products exist', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app._request(
        'GET',
        '/products?storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('Store-based filtering', () => {
    it('should filter products for current store only (KASIR)', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Store Product',
          sku: 'SP-001',
          category: 'Test',
          cost_price: '15000',
          selling_price: '25000',
          description: 'Product for store',
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          quantity: 50,
          reserved: 0,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body.meta.storeId).toBe('store-123');

      // Verify query includes storeId parameter
      const queries = (db.query as jest.Mock).mock.calls;
      const selectCall = queries[1][0] as string;
      expect(selectCall).toContain('i.store_id');
    });
  });

  describe('Response format', () => {
    it('should include proper response structure', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (redis.set as jest.Mock).mockResolvedValueOnce('OK');

      const response = await app._request(
        'GET',
        '/products/search?storeId=store-123'
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('pages');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
      expect(response.body.meta).toHaveProperty('storeId');
    });
  });
});
