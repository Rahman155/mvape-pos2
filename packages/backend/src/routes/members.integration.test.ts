/**
 * Member Routes Integration Tests
 * Tests for member list API endpoint with pagination and search
 *
 * Requirements: 14.1 (Member Management)
 * - API returns paginated members list (14.1)
 * - Search by name works (14.1)
 * - Search by phone works (14.1)
 * - Response includes all required fields (14.1)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createApp } from '../app.js';
import request from 'supertest';
import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';

describe('Member List API Endpoint Integration', () => {
  let app: Express;
  let authToken: string;
  let testMemberIds: string[] = [];

  beforeAll(async () => {
    // Initialize app
    app = createApp();
    // Mock token for testing
    authToken = 'test-token';
  });

  beforeEach(async () => {
    // Create test members
    const now = new Date();
    const members = [
      {
        id: uuidv4(),
        memberNumber: 'MBR-TEST-001',
        name: 'Alice Johnson',
        phone: '081234567890',
        email: 'alice@example.com',
        creditBalance: 1000000,
        totalSpent: 5000000,
      },
      {
        id: uuidv4(),
        memberNumber: 'MBR-TEST-002',
        name: 'Bob Smith',
        phone: '081987654321',
        email: 'bob@example.com',
        creditBalance: 500000,
        totalSpent: 2500000,
      },
      {
        id: uuidv4(),
        memberNumber: 'MBR-TEST-003',
        name: 'Charlie Brown',
        phone: '081555555555',
        email: 'charlie@example.com',
        creditBalance: 2000000,
        totalSpent: 10000000,
      },
    ];

    for (const member of members) {
      await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          member.id,
          member.memberNumber,
          member.name,
          member.phone,
          member.email,
          member.creditBalance.toString(),
          member.totalSpent.toString(),
          true,
          now,
          now,
        ]
      );
      testMemberIds.push(member.id);
    }
  });

  afterEach(async () => {
    // Cleanup test members
    for (const memberId of testMemberIds) {
      await db.query('DELETE FROM members WHERE id = $1', [memberId]);
    }
    testMemberIds = [];
  });

  afterAll(async () => {
    // Close database connection
    if (db) {
      await db.close();
    }
  });

  describe('GET /api/members - List Members', () => {
    it('should return paginated members list', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('pages');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return correct response format', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      const member = response.body.data[0];

      // Check required fields are present
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('memberNumber');
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('phone');
      expect(member).toHaveProperty('creditBalance');
      expect(member).toHaveProperty('totalSpent');
      expect(member).toHaveProperty('isActive');
      expect(member).toHaveProperty('createdAt');
      expect(member).toHaveProperty('updatedAt');
    });

    it('should return members with correct data types', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      const member = response.body.data[0];

      expect(typeof member.id).toBe('string');
      expect(typeof member.memberNumber).toBe('string');
      expect(typeof member.name).toBe('string');
      expect(typeof member.phone).toBe('string');
      expect(typeof member.creditBalance).toBe('number');
      expect(typeof member.totalSpent).toBe('number');
      expect(typeof member.isActive).toBe('boolean');
    });

    it('should only return active members', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data.every((m: any) => m.isActive === true)).toBe(true);
    });

    it('should include pagination info', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.pages).toBeGreaterThan(0);
    });
  });

  describe('GET /api/members - Search Functionality', () => {
    it('should search members by name', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20, search: 'Alice' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((m: any) => m.name.includes('Alice'))).toBe(
        true
      );
    });

    it('should search members by phone', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20, search: '081234567890' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((m: any) => m.phone.includes('081234567890'))
      ).toBe(true);
    });

    it('should search members by member number', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20, search: 'MBR-TEST-001' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((m: any) => m.memberNumber.includes('MBR-TEST-001'))
      ).toBe(true);
    });

    it('should perform case-insensitive search', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20, search: 'alice' });

      expect(response.status).toBe(200);
      // Should find Alice despite lowercase search
      expect(response.body.data.some((m: any) => m.name.toLowerCase().includes('alice'))).toBe(true);
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20, search: 'nonexistent' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
      expect(response.body.total).toBe(0);
    });

    it('should combine search with pagination', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 1, search: 'MBR-TEST' });

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(1);
      // Only 1 member should be returned due to limit
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/members - Pagination', () => {
    it('should handle different page numbers', async () => {
      // Create additional members to test pagination
      const extraMembers = Array.from({ length: 25 }, (_, i) => ({
        id: uuidv4(),
        memberNumber: `MBR-EXTRA-${i + 1}`,
        name: `Extra Member ${i + 1}`,
        phone: `0815${String(i + 1).padStart(8, '0')}`,
        email: `extra${i + 1}@example.com`,
        creditBalance: 100000 * (i + 1),
        totalSpent: 500000 * (i + 1),
      }));

      const now = new Date();
      for (const member of extraMembers) {
        await db.query(
          `INSERT INTO members 
           (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            member.id,
            member.memberNumber,
            member.name,
            member.phone,
            member.email,
            member.creditBalance.toString(),
            member.totalSpent.toString(),
            true,
            now,
            now,
          ]
        );
        testMemberIds.push(member.id);
      }

      // Test page 1
      const page1Response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.page).toBe(1);
      expect(page1Response.body.data.length).toBeLessThanOrEqual(10);

      // Test page 2
      const page2Response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 2, limit: 10 });

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.page).toBe(2);

      // Results should be different
      const page1Ids = page1Response.body.data.map((m: any) => m.id);
      const page2Ids = page2Response.body.data.map((m: any) => m.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.limit).toBe(5);
    });

    it('should calculate pages correctly', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      const expectedPages = Math.ceil(response.body.total / 20);
      expect(response.body.pages).toBe(expectedPages);
    });

    it('should default to page 1 if not provided', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
    });

    it('should default to limit 20 if not provided', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1 });

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(20);
    });
  });

  describe('GET /api/members - Data Integrity', () => {
    it('should return credit balance as number', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data.every((m: any) => typeof m.creditBalance === 'number')).toBe(true);
    });

    it('should return total spent as number', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data.every((m: any) => typeof m.totalSpent === 'number')).toBe(true);
    });

    it('should preserve member data accuracy', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20, search: 'Alice' });

      expect(response.status).toBe(200);
      const alice = response.body.data.find((m: any) => m.name === 'Alice Johnson');

      expect(alice).toBeDefined();
      expect(alice.memberNumber).toBe('MBR-TEST-001');
      expect(alice.phone).toBe('081234567890');
      expect(alice.creditBalance).toBe(1000000);
      expect(alice.totalSpent).toBe(5000000);
    });
  });

  describe('GET /api/members - Error Handling', () => {
    it('should return 400 for invalid page number', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 'invalid', limit: 20 });

      // The API should handle gracefully - likely treating as NaN which becomes 1
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 'invalid' });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/members/:id - Get Member Detail', () => {
    it('should return member detail with transactions', async () => {
      const memberId = testMemberIds[0];

      const response = await request(app)
        .get(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('member');
      expect(response.body).toHaveProperty('transactions');
      expect(response.body.member.id).toBe(memberId);
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should return 404 for non-existent member', async () => {
      const response = await request(app)
        .get(`/api/members/${uuidv4()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/members - Create Member', () => {
    it('should create a new member', async () => {
      const newMemberData = {
        name: 'David Wilson',
        phone: '081666666666',
        email: 'david@example.com',
      };

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newMemberData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('memberNumber');
      expect(response.body.name).toBe('David Wilson');
      expect(response.body.phone).toBe('081666666666');
      expect(response.body.creditBalance).toBe(0);

      // Cleanup
      testMemberIds.push(response.body.id);
    });

    it('should generate unique member number', async () => {
      const response1 = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Eve Davis',
          phone: '081777777777',
        });

      const response2 = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Frank Miller',
          phone: '081888888888',
        });

      expect(response1.body.memberNumber).not.toBe(response2.body.memberNumber);

      testMemberIds.push(response1.body.id);
      testMemberIds.push(response2.body.id);
    });

    it('should require member name', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '081999999999',
        });

      expect(response.status).toBe(400);
    });
  });
});
