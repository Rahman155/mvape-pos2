/**
 * Unit Tests for Member Credit Top-up Endpoint
 * Tests POST /api/members/:id/topup
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';

describe('Member Credit Top-up Endpoint', () => {
  let app: any;
  let testOwnerId: string;
  let testKasirId: string;
  let testMemberId: string;
  let testStoreId: string;
  let ownerToken: string;
  let kasirToken: string;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    app = createApp();

    if (!db) {
      throw new Error('Database not initialized');
    }

    // Setup test data
    testOwnerId = uuidv4();
    testKasirId = uuidv4();
    testMemberId = uuidv4();
    testStoreId = uuidv4();

    const hashedPassword = await AuthService.hashPassword(testPassword);

    // Create test store
    await db.query(
      'INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [testStoreId, 'Test Store', 'Test Address']
    );

    // Create OWNER user
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`,
      [testOwnerId, 'testowner', `owner_${Date.now()}@test.com`, hashedPassword, 'OWNER', testStoreId, true]
    );

    // Create KASIR user
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`,
      [testKasirId, 'testkasir', `kasir_${Date.now()}@test.com`, hashedPassword, 'KASIR', testStoreId, true]
    );

    // Create test member
    await db.query(
      `INSERT INTO members (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [testMemberId, 'MBR001', 'Test Member', '08123456789', 'member@test.com', '100', '0', true, new Date(), new Date()]
    );

    // Get auth tokens
    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testowner',
        password: testPassword,
      });

    ownerToken = ownerLoginRes.body.token;

    const kasirLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testkasir',
        password: testPassword,
      });

    kasirToken = kasirLoginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM credit_transactions WHERE member_id = $1', [testMemberId]);
    await db.query('DELETE FROM members WHERE id = $1', [testMemberId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testOwnerId, testKasirId]);
    await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
  });

  describe('POST /api/members/:id/topup', () => {
    it('should successfully topup member credit when OWNER', async () => {
      const topupAmount = 50;

      const response = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: topupAmount,
          notes: 'Test top-up',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Credit top-up successful');
      expect(response.body.member.creditBalance).toBe(150); // 100 + 50
      expect(response.body.transaction.type).toBe('TOPUP');
      expect(response.body.transaction.previousBalance).toBe(100);
      expect(response.body.transaction.newBalance).toBe(150);
    });

    it('should fail topup when not OWNER', async () => {
      const response = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          amount: 50,
          notes: 'Unauthorized topup',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only owner can perform credit top-up');
    });

    it('should fail topup with invalid amount (negative)', async () => {
      const response = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: -50,
          notes: 'Negative amount',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Top-up amount must be a positive number');
    });

    it('should fail topup with zero amount', async () => {
      const response = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Top-up amount must be a positive number');
    });

    it('should fail topup with missing amount', async () => {
      const response = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          notes: 'No amount provided',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Top-up amount must be a positive number');
    });

    it('should fail topup for non-existent member', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .post(`/api/members/${nonExistentId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 50,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Member not found');
    });

    it('should record transaction in credit_transactions table', async () => {
      const topupAmount = 25;

      const response = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: topupAmount,
          notes: 'Transaction recording test',
        });

      expect(response.status).toBe(200);

      // Verify transaction was recorded
      const transactionResult = await db.query(
        'SELECT * FROM credit_transactions WHERE member_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testMemberId]
      );

      expect(transactionResult.rows.length).toBeGreaterThan(0);
      const transaction = transactionResult.rows[0];
      expect(transaction.transaction_type).toBe('TOPUP');
      expect(Number(transaction.amount)).toBe(topupAmount);
      expect(transaction.member_id).toBe(testMemberId);
    });

    it('should handle multiple top-ups correctly', async () => {
      const firstTopup = 30;
      const secondTopup = 20;

      // First topup
      const res1 = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: firstTopup,
          notes: 'First topup',
        });

      expect(res1.status).toBe(200);
      const balanceAfterFirst = res1.body.member.creditBalance;

      // Second topup
      const res2 = await request(app)
        .post(`/api/members/${testMemberId}/topup`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: secondTopup,
          notes: 'Second topup',
        });

      expect(res2.status).toBe(200);
      expect(res2.body.member.creditBalance).toBe(balanceAfterFirst + secondTopup);

      // Verify both transactions recorded
      const transactionResult = await db.query(
        'SELECT COUNT(*) as count FROM credit_transactions WHERE member_id = $1 AND transaction_type = $2',
        [testMemberId, 'TOPUP']
      );

      expect(Number(transactionResult.rows[0].count)).toBeGreaterThanOrEqual(2);
    });
  });
});
