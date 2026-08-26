/**
 * Member Management Routes
 * Handles member CRUD operations and credit balance management
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../database/connection.js';
import { Member } from '../database/types.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const router = Router() as ReturnType<typeof Router>;

/**
 * GET /api/members
 * List all members with pagination and search
 */
router.get('/', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', storeId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT * FROM members WHERE is_active = true';
    const params: any[] = [];

    if (search) {
      query +=
        ' AND (name ILIKE $' +
        (params.length + 1) +
        ' OR member_number ILIKE $' +
        (params.length + 2) +
        ' OR phone ILIKE $' +
        (params.length + 3) +
        ')';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM members WHERE is_active = true';
    const countParams: any[] = [];
    if (search) {
      countQuery +=
        ' AND (name ILIKE $' +
        (countParams.length + 1) +
        ' OR member_number ILIKE $' +
        (countParams.length + 2) +
        ' OR phone ILIKE $' +
        (countParams.length + 3) +
        ')';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = Number(countResult.rows[0].count);

    // Get paginated data
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);
    const members = result.rows.map((row: any) => ({
      id: row.id,
      memberNumber: row.member_number,
      name: row.name,
      phone: row.phone,
      email: row.email,
      creditBalance: Number(row.credit_balance),
      totalSpent: Number(row.total_spent),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const pages = Math.ceil(total / Number(limit));

    return res.json({
      data: members,
      total,
      page: Number(page),
      limit: Number(limit),
      pages,
    });
  } catch (error) {
    logger.error('Error fetching members:', error);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * GET /api/members/:id
 * Get member by ID with transaction history
 */
router.get('/:id', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get member
    const memberResult = await db.query('SELECT * FROM members WHERE id = $1', [
      id,
    ]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member: any = memberResult.rows[0];
    const memberData = {
      id: member.id,
      memberNumber: member.member_number,
      name: member.name,
      phone: member.phone,
      email: member.email,
      creditBalance: Number(member.credit_balance),
      totalSpent: Number(member.total_spent),
      isActive: member.is_active,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
    };

    // Get transaction history
    const transactionsResult = await db.query(
      `SELECT t.id, t.total_amount, t.payment_method, t.transaction_date, t.status
       FROM transactions t
       WHERE (t.payment_method = 'MEMBER_CREDIT' OR EXISTS (
         SELECT 1 FROM piutang p WHERE p.transaction_id = t.id AND p.member_id = $1
       ))
       AND t.status = 'COMPLETED'
       ORDER BY t.transaction_date DESC
       LIMIT 50`,
      [id]
    );

    const transactions = transactionsResult.rows.map((row: any) => ({
      id: row.id,
      totalAmount: Number(row.total_amount),
      paymentMethod: row.payment_method,
      transactionDate: row.transaction_date,
      status: row.status,
    }));

    return res.json({
      member: memberData,
      transactions,
    });
  } catch (error) {
    logger.error('Error fetching member:', error);
    return res.status(500).json({ error: 'Failed to fetch member' });
  }
});

/**
 * POST /api/members
 * Create a new member
 */
router.post('/', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Member name is required' });
    }

    const id = uuidv4();
    const memberNumber = `MBR${Date.now()}`;
    const now = new Date();

    const result = await db.query(
      `INSERT INTO members 
       (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, memberNumber, name.trim(), phone || null, email || null, '0', '0', true, now, now]
    );

    const member: any = result.rows[0];
    return res.status(201).json({
      id: member.id,
      memberNumber: member.member_number,
      name: member.name,
      phone: member.phone,
      email: member.email,
      creditBalance: Number(member.credit_balance),
      totalSpent: Number(member.total_spent),
      isActive: member.is_active,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
    });
  } catch (error) {
    logger.error('Error creating member:', error);
    return res.status(500).json({ error: 'Failed to create member' });
  }
});

/**
 * PUT /api/members/:id/credit
 * Update member credit balance (top-up or deduct)
 * Only accessible to OWNER role for top-up
 */
router.put('/:id/credit', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, type } = req.body;

    // Check authorization - only owner can topup
    if (type === 'TOPUP' && (req.user as any).role !== 'OWNER') {
      return res
        .status(403)
        .json({ error: 'Only owner can perform credit top-up' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!type || !['TOPUP', 'DEDUCT'].includes(type)) {
      return res.status(400).json({ error: 'Invalid operation type' });
    }

    // Get member
    const memberResult = await db.query('SELECT * FROM members WHERE id = $1', [
      id,
    ]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member: any = memberResult.rows[0];
    let newBalance = Number(member.credit_balance);

    if (type === 'TOPUP') {
      newBalance += amount;
    } else if (type === 'DEDUCT') {
      if (newBalance < amount) {
        return res.status(400).json({ error: 'Insufficient credit balance' });
      }
      newBalance -= amount;
    }

    const now = new Date();
    const updateResult = await db.query(
      'UPDATE members SET credit_balance = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [newBalance.toString(), now, id]
    );

    const updatedMember: any = updateResult.rows[0];
    return res.json({
      id: updatedMember.id,
      memberNumber: updatedMember.member_number,
      name: updatedMember.name,
      phone: updatedMember.phone,
      email: updatedMember.email,
      creditBalance: Number(updatedMember.credit_balance),
      totalSpent: Number(updatedMember.total_spent),
      isActive: updatedMember.is_active,
      createdAt: updatedMember.created_at,
      updatedAt: updatedMember.updated_at,
    });
  } catch (error) {
    logger.error('Error updating member credit:', error);
    return res.status(500).json({ error: 'Failed to update member credit' });
  }
});

/**
 * POST /api/members/:id/topup
 * Top-up member credit balance
 * Restricted to OWNER role only
 * Records credit transaction in database
 */
router.post('/:id/topup', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const userId = (req.user as any).id;
    const userRole = (req.user as any).role;

    // Check authorization - only owner can topup
    if (userRole !== 'OWNER') {
      return res
        .status(403)
        .json({ error: 'Only owner can perform credit top-up' });
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res
        .status(400)
        .json({ error: 'Top-up amount must be a positive number' });
    }

    // Get member
    const memberResult = await db.query('SELECT * FROM members WHERE id = $1', [
      id,
    ]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member: any = memberResult.rows[0];
    const previousBalance = Number(member.credit_balance);
    const newBalance = previousBalance + amount;

    // Update member credit balance
    const now = new Date();
    const updateResult = await db.query(
      'UPDATE members SET credit_balance = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [newBalance.toString(), now, id]
    );

    // Record credit transaction
    const transactionId = uuidv4();
    await db.query(
      `INSERT INTO credit_transactions 
       (id, member_id, transaction_type, amount, previous_balance, new_balance, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        transactionId,
        id,
        'TOPUP',
        amount.toString(),
        previousBalance.toString(),
        newBalance.toString(),
        notes || null,
        userId,
        now,
      ]
    );

    const updatedMember: any = updateResult.rows[0];
    return res.status(200).json({
      message: 'Credit top-up successful',
      member: {
        id: updatedMember.id,
        memberNumber: updatedMember.member_number,
        name: updatedMember.name,
        phone: updatedMember.phone,
        email: updatedMember.email,
        creditBalance: Number(updatedMember.credit_balance),
        totalSpent: Number(updatedMember.total_spent),
        isActive: updatedMember.is_active,
        createdAt: updatedMember.created_at,
        updatedAt: updatedMember.updated_at,
      },
      transaction: {
        id: transactionId,
        memberId: id,
        type: 'TOPUP',
        amount: Number(amount),
        previousBalance,
        newBalance,
        notes: notes || null,
        createdAt: now,
      },
    });
  } catch (error) {
    logger.error('Error performing credit top-up:', error);
    return res
      .status(500)
      .json({ error: 'Failed to perform credit top-up' });
  }
});

export default router;
