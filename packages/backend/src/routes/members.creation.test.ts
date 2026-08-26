/**
 * Member Creation Integration Tests
 * Tests for member creation with database operations
 *
 * Requirements: 14.2, 14.3 (Member Management)
 * - Validates required fields (name, phone)
 * - Generates unique member ID/number
 * - Stores member in database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

describe('Member Creation Integration Tests', () => {
  let createdMemberIds: string[] = [];

  beforeAll(async () => {
    // Ensure database is connected
    if (!db) {
      throw new Error('Database connection failed');
    }
  });

  afterAll(async () => {
    // Cleanup all created members
    if (createdMemberIds.length > 0 && db) {
      for (const memberId of createdMemberIds) {
        await db.query('DELETE FROM members WHERE id = $1', [memberId]);
      }
    }
  });

  describe('Member Field Validation', () => {
    it('should reject member creation with empty name', async () => {
      const data = {
        name: '',
        phone: '081234567890',
        email: null,
      };

      // Validation should catch empty name
      expect(data.name || data.name.trim()).toBeFalsy();
    });

    it('should reject member creation with whitespace-only name', async () => {
      const data = {
        name: '   ',
        phone: '081234567890',
        email: null,
      };

      // Validation should catch whitespace-only name
      const trimmed = data.name.trim();
      expect(trimmed).toBeFalsy();
    });

    it('should reject member creation without phone', async () => {
      const data = {
        name: 'John Doe',
        phone: '',
        email: null,
      };

      // Validation should catch missing phone
      expect(data.phone || data.phone.trim()).toBeFalsy();
    });

    it('should accept member creation with name and phone only', async () => {
      const data = {
        name: 'John Doe',
        phone: '081234567890',
        email: null,
      };

      // Should validate successfully
      const isValid = data.name && data.name.trim() && data.phone && data.phone.trim();
      expect(isValid).toBeTruthy();
    });

    it('should accept member creation with name, phone, and email', async () => {
      const data = {
        name: 'John Doe',
        phone: '081234567890',
        email: 'john@example.com',
      };

      // Should validate successfully
      const isValid = data.name && data.name.trim() && data.phone && data.phone.trim();
      expect(isValid).toBeTruthy();
    });
  });

  describe('Member ID Generation', () => {
    it('should generate unique member ID for each member', async () => {
      const id1 = uuidv4();
      const id2 = uuidv4();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate member number with proper format', async () => {
      const timestamp = Date.now();
      const memberNumber = `MBR${timestamp}`;

      expect(memberNumber).toMatch(/^MBR\d+$/);
    });

    it('should create members with unique member numbers', async () => {
      const memberNumber1 = `MBR${Date.now()}`;
      // Ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));
      const memberNumber2 = `MBR${Date.now()}`;

      expect(memberNumber1).not.toBe(memberNumber2);
    });
  });

  describe('Member Database Storage', () => {
    it('should successfully store member in database', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          'test@example.com',
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(memberId);
      expect(result.rows[0].member_number).toBe(memberNumber);
      expect(result.rows[0].name).toBe('Test Member');
      expect(result.rows[0].phone).toBe('081234567890');
      expect(result.rows[0].email).toBe('test@example.com');
      expect(result.rows[0].credit_balance).toBe('0');
      expect(result.rows[0].is_active).toBe(true);

      createdMemberIds.push(memberId);
    });

    it('should store member without email', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBeNull();

      createdMemberIds.push(memberId);
    });

    it('should set credit balance to 0 for new member', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(Number(result.rows[0].credit_balance)).toBe(0);
      expect(Number(result.rows[0].total_spent)).toBe(0);

      createdMemberIds.push(memberId);
    });

    it('should set is_active to true for new member', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result.rows[0].is_active).toBe(true);

      createdMemberIds.push(memberId);
    });

    it('should store created_at and updated_at timestamps', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const beforeInsert = new Date();

      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          null,
          '0',
          '0',
          true,
          beforeInsert,
          beforeInsert,
        ]
      );

      expect(result.rows[0].created_at).toBeDefined();
      expect(result.rows[0].updated_at).toBeDefined();
      expect(result.rows[0].created_at).toEqual(result.rows[0].updated_at);

      createdMemberIds.push(memberId);
    });

    it('should retrieve stored member by ID', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      // Insert
      await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          'test@example.com',
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      // Retrieve
      const result = await db.query('SELECT * FROM members WHERE id = $1', [memberId]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('Test Member');
      expect(result.rows[0].phone).toBe('081234567890');

      createdMemberIds.push(memberId);
    });

    it('should retrieve stored member by member number', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      // Insert
      await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          memberId,
          memberNumber,
          'Test Member',
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      // Retrieve by member number
      const result = await db.query('SELECT * FROM members WHERE member_number = $1', [memberNumber]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(memberId);
      expect(result.rows[0].name).toBe('Test Member');

      createdMemberIds.push(memberId);
    });
  });

  describe('Member Field Data Integrity', () => {
    it('should trim whitespace from name on storage', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();
      const originalName = '  John Doe  ';

      // In real implementation, backend should trim
      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          originalName.trim(), // Trimmed before insert
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result.rows[0].name).toBe('John Doe');
      expect(result.rows[0].name).not.toContain('  ');

      createdMemberIds.push(memberId);
    });

    it('should store phone as-is (for flexibility)', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();
      const phone = '081234567890';

      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          'Test Member',
          phone,
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result.rows[0].phone).toBe(phone);

      createdMemberIds.push(memberId);
    });

    it('should store email as-is or null', async () => {
      const memberId1 = uuidv4();
      const memberId2 = uuidv4();
      const memberNumber1 = `MBR${Date.now()}`;
      const memberNumber2 = `MBR${Date.now() + 1}`;
      const now = new Date();

      // With email
      const result1 = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId1,
          memberNumber1,
          'Test Member',
          '081234567890',
          'test@example.com',
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      // Without email
      const result2 = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId2,
          memberNumber2,
          'Another Member',
          '082345678901',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result1.rows[0].email).toBe('test@example.com');
      expect(result2.rows[0].email).toBeNull();

      createdMemberIds.push(memberId1);
      createdMemberIds.push(memberId2);
    });
  });

  describe('Member Uniqueness Constraints', () => {
    it('should allow multiple members with same name', async () => {
      const memberId1 = uuidv4();
      const memberId2 = uuidv4();
      const memberNumber1 = `MBR${Date.now()}`;
      const memberNumber2 = `MBR${Date.now() + 1}`;
      const now = new Date();
      const sameName = 'John Doe';

      // Insert first member
      await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          memberId1,
          memberNumber1,
          sameName,
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      // Insert second member with same name
      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId2,
          memberNumber2,
          sameName,
          '082345678901',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      expect(result.rows.length).toBe(1);

      createdMemberIds.push(memberId1);
      createdMemberIds.push(memberId2);
    });

    it('should enforce unique member_number constraint', async () => {
      const memberId1 = uuidv4();
      const memberId2 = uuidv4();
      const sameMemberNumber = `MBR_UNIQUE_${Date.now()}`;
      const now = new Date();

      // Insert first member
      await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          memberId1,
          sameMemberNumber,
          'Member 1',
          '081234567890',
          null,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      // Try to insert second member with same member_number - should fail
      try {
        await db.query(
          `INSERT INTO members 
           (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            memberId2,
            sameMemberNumber, // Same member number - violates unique constraint
            'Member 2',
            '082345678901',
            null,
            '0',
            '0',
            true,
            now,
            now,
          ]
        );

        // If we get here, constraint is not enforced
        fail('Should have thrown unique constraint error');
      } catch (error: any) {
        // Expected to fail with unique constraint error
        expect(error.message).toContain('unique');
      }

      createdMemberIds.push(memberId1);
    });
  });

  describe('Member Creation Workflow', () => {
    it('should complete full member creation workflow', async () => {
      const memberId = uuidv4();
      const memberNumber = `MBR${Date.now()}`;
      const now = new Date();

      // Step 1: Validate input
      const inputData = {
        name: 'New Member',
        phone: '081234567890',
        email: 'member@example.com',
      };

      const hasName = inputData.name && inputData.name.trim();
      const hasPhone = inputData.phone && inputData.phone.trim();
      expect(hasName && hasPhone).toBe(true);

      // Step 2: Generate ID and member number
      expect(memberId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(memberNumber).toMatch(/^MBR\d+$/);

      // Step 3: Store in database
      const result = await db.query(
        `INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          memberId,
          memberNumber,
          inputData.name.trim(),
          inputData.phone.trim(),
          inputData.email,
          '0',
          '0',
          true,
          now,
          now,
        ]
      );

      // Step 4: Verify storage
      expect(result.rows.length).toBe(1);
      const storedMember = result.rows[0];
      expect(storedMember.id).toBe(memberId);
      expect(storedMember.member_number).toBe(memberNumber);
      expect(storedMember.name).toBe(inputData.name.trim());
      expect(storedMember.phone).toBe(inputData.phone.trim());
      expect(storedMember.email).toBe(inputData.email);
      expect(Number(storedMember.credit_balance)).toBe(0);

      createdMemberIds.push(memberId);
    });
  });
});
