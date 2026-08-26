/**
 * Piutang Management Routes
 * Handles customer credit/receivable tracking and payment recording
 * Piutang are created from customer transactions with credit terms
 * 
 * NOTE: Alert routes MUST be defined before parametric routes (/:id)
 * to ensure proper Express route matching
 */

import { Router, Request, Response } from 'express';
import { authorize } from '../middleware/authorize.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router() as ReturnType<typeof Router>;

// ========================================================================
// ALERT ENDPOINTS - MUST BE BEFORE PARAMETRIC ROUTES
// ========================================================================

/**
 * GET /api/piutang/alerts/upcoming
 * Get piutang due within the next 7 days (OPEN/PARTIAL only)
 */
router.get('/alerts/upcoming', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    const result = await db.query(
      `SELECT 
        p.id,
        p.transaction_id,
        p.member_id,
        m.name as customer_name,
        m.phone as customer_phone,
        m.email as customer_email,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at,
        (p.due_date::date - CURRENT_DATE) as days_until_due
       FROM piutang p
       LEFT JOIN members m ON p.member_id = m.id
       WHERE p.status IN ('OPEN', 'PARTIAL')
       AND p.due_date >= $1
       AND p.due_date <= $2
       AND p.member_id IS NOT NULL
       ORDER BY p.due_date ASC`,
      [todayStr, sevenDaysStr]
    );

    const upcomingPiutang = result.rows.map((row: any) => ({
      id: row.id,
      transactionId: row.transaction_id,
      memberId: row.member_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      amount: Number(row.amount),
      remainingBalance: Number(row.remaining_balance),
      dueDate: row.due_date,
      status: row.status,
      daysUntilDue: row.days_until_due,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      data: upcomingPiutang,
      total: upcomingPiutang.length,
      alert: 'Piutang due within the next 7 days',
    });
  } catch (error) {
    logger.error('Error fetching upcoming piutang:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: 'Failed to fetch upcoming piutang' });
  }
});

/**
 * GET /api/piutang/alerts/overdue
 * Get overdue piutang (past due date, OPEN/PARTIAL only)
 */
router.get('/alerts/overdue', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT 
        p.id,
        p.transaction_id,
        p.member_id,
        m.name as customer_name,
        m.phone as customer_phone,
        m.email as customer_email,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at,
        (CURRENT_DATE - p.due_date::date) as days_overdue
       FROM piutang p
       LEFT JOIN members m ON p.member_id = m.id
       WHERE p.status IN ('OPEN', 'PARTIAL')
       AND p.due_date < $1
       AND p.member_id IS NOT NULL
       ORDER BY p.due_date ASC`,
      [today]
    );

    const overduePiutang = result.rows.map((row: any) => ({
      id: row.id,
      transactionId: row.transaction_id,
      memberId: row.member_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      amount: Number(row.amount),
      remainingBalance: Number(row.remaining_balance),
      dueDate: row.due_date,
      status: row.status,
      daysOverdue: row.days_overdue,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      data: overduePiutang,
      total: overduePiutang.length,
      alert: 'Overdue piutang - immediate action required',
    });
  } catch (error) {
    logger.error('Error fetching overdue piutang:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: 'Failed to fetch overdue piutang' });
  }
});

// ========================================================================
// LIST ENDPOINT
// ========================================================================

/**
 * GET /api/piutang
 * Get piutang list (customer receivables) with filtering and pagination
 * Supports filtering by status, customer name, due date ranges, amount range
 * Sorting: due date, remaining balance, created date
 */
router.get('/', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customerName,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      sort = 'due_date',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];

    // Base query with customer info
    let query = `
      SELECT 
        p.id,
        p.transaction_id,
        p.member_id,
        m.name as customer_name,
        m.phone as customer_phone,
        m.email as customer_email,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
      FROM piutang p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.member_id IS NOT NULL
    `;

    // Filtering
    if (status) {
      query += ` AND p.status = $${params.length + 1}`;
      params.push(status);
    }

    if (customerName) {
      query += ` AND m.name ILIKE $${params.length + 1}`;
      params.push(`%${customerName}%`);
    }

    if (dueDateFrom) {
      query += ` AND p.due_date >= $${params.length + 1}`;
      params.push(dueDateFrom);
    }

    if (dueDateTo) {
      query += ` AND p.due_date <= $${params.length + 1}`;
      params.push(dueDateTo);
    }

    if (amountMin) {
      query += ` AND p.remaining_balance >= $${params.length + 1}`;
      params.push(Number(amountMin));
    }

    if (amountMax) {
      query += ` AND p.remaining_balance <= $${params.length + 1}`;
      params.push(Number(amountMax));
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM piutang p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.member_id IS NOT NULL
    `;
    const countParams: any[] = [];

    if (status) {
      countQuery += ` AND p.status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    if (customerName) {
      countQuery += ` AND m.name ILIKE $${countParams.length + 1}`;
      countParams.push(`%${customerName}%`);
    }

    if (dueDateFrom) {
      countQuery += ` AND p.due_date >= $${countParams.length + 1}`;
      countParams.push(dueDateFrom);
    }

    if (dueDateTo) {
      countQuery += ` AND p.due_date <= $${countParams.length + 1}`;
      countParams.push(dueDateTo);
    }

    if (amountMin) {
      countQuery += ` AND p.remaining_balance >= $${countParams.length + 1}`;
      countParams.push(Number(amountMin));
    }

    if (amountMax) {
      countQuery += ` AND p.remaining_balance <= $${countParams.length + 1}`;
      countParams.push(Number(amountMax));
    }

    const countResult = await db.query(countQuery, countParams);
    const total = Number(countResult.rows[0].count);

    // Determine sort order
    let orderBy = 'p.due_date ASC';
    if (sort === 'remaining_balance') {
      orderBy = 'p.remaining_balance DESC';
    } else if (sort === 'created_date') {
      orderBy = 'p.created_at DESC';
    }

    // Add ordering and pagination
    query += ` ORDER BY ${orderBy}, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);

    const piutang = result.rows.map((row: any) => ({
      id: row.id,
      transactionId: row.transaction_id,
      memberId: row.member_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      amount: Number(row.amount),
      remainingBalance: Number(row.remaining_balance),
      dueDate: row.due_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const pages = Math.ceil(total / Number(limit));

    return res.json({
      data: piutang,
      total,
      page: Number(page),
      limit: Number(limit),
      pages,
    });
  } catch (error) {
    logger.error('Error fetching piutang list:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: 'Failed to fetch piutang list' });
  }
});

// ========================================================================
// DETAIL ENDPOINT
// ========================================================================

/**
 * GET /api/piutang/:id
 * Get detailed piutang record with customer info and transaction history
 */
router.get('/:id', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get piutang detail
    const result = await db.query(
      `SELECT 
        p.id,
        p.transaction_id,
        p.member_id,
        m.name as customer_name,
        m.phone as customer_phone,
        m.email as customer_email,
        m.member_number as customer_number,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
       FROM piutang p
       LEFT JOIN members m ON p.member_id = m.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn('Piutang fetch failed: Piutang not found', {
        requestId: req.requestId,
        userId: req.user?.id,
        piutangId: id,
      });
      return res.status(404).json({ error: 'Piutang not found' });
    }

    const row = result.rows[0];
    const memberId = row.member_id;

    // Get transaction history for this member (if transaction_id exists)
    let transactionHistory = [];
    if (row.transaction_id) {
      const transResult = await db.query(
        `SELECT 
          t.id,
          t.transaction_number,
          t.total_amount,
          t.payment_method,
          t.transaction_date,
          t.created_at
         FROM transactions t
         WHERE t.member_id = $1
         ORDER BY t.created_at DESC
         LIMIT 10`,
        [memberId]
      );

      transactionHistory = transResult.rows.map((t: any) => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        totalAmount: Number(t.total_amount),
        paymentMethod: t.payment_method,
        transactionDate: t.transaction_date,
        createdAt: t.created_at,
      }));
    }

    const piutang = {
      id: row.id,
      transactionId: row.transaction_id,
      memberId: row.member_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      customerNumber: row.customer_number,
      amount: Number(row.amount),
      remainingBalance: Number(row.remaining_balance),
      dueDate: row.due_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      transactionHistory,
    };

    return res.json(piutang);
  } catch (error) {
    logger.error('Error fetching piutang:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
      piutangId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to fetch piutang' });
  }
});

// ========================================================================
// PAYMENT ENDPOINT
// ========================================================================

/**
 * POST /api/piutang/:id/payment
 * Record payment for a piutang (customer receivable)
 * Updates status: OPEN -> PARTIAL -> CLOSED
 * Validates: 0 < amount <= remaining_balance
 */
router.post('/:id/payment', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    // Validation
    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
      logger.warn('Payment recording failed: Invalid payment amount', {
        requestId: req.requestId,
        userId: req.user?.id,
        amount,
      });
      return res.status(400).json({
        error: 'Invalid request',
        details: 'amount is required and must be a positive number',
      });
    }

    // Verify piutang exists
    const piutangResult = await db.query(
      `SELECT 
        id, 
        amount, 
        remaining_balance, 
        status, 
        member_id
       FROM piutang WHERE id = $1`,
      [id]
    );

    if (piutangResult.rows.length === 0) {
      logger.warn('Payment recording failed: Piutang not found', {
        requestId: req.requestId,
        userId: req.user?.id,
        piutangId: id,
      });
      return res.status(404).json({ error: 'Piutang not found' });
    }

    const piutang = piutangResult.rows[0];
    const remainingBalance = Number(piutang.remaining_balance);

    // Validate payment amount
    if (amount > remainingBalance) {
      logger.warn('Payment recording failed: Payment exceeds remaining balance', {
        requestId: req.requestId,
        userId: req.user?.id,
        piutangId: id,
        amount,
        remainingBalance,
      });
      return res.status(400).json({
        error: 'Invalid payment amount',
        details: `Payment amount cannot exceed remaining balance of ${remainingBalance}`,
      });
    }

    // Calculate new remaining balance and status
    const newRemainingBalance = remainingBalance - amount;
    let newStatus = piutang.status;

    // Status transition logic
    if (newRemainingBalance === 0) {
      newStatus = 'CLOSED';
    } else if (piutang.status === 'OPEN') {
      newStatus = 'PARTIAL';
    }
    // If already PARTIAL, keep PARTIAL

    // Update piutang record
    const now = new Date();
    await db.query(
      `UPDATE piutang 
       SET remaining_balance = $1, status = $2, updated_at = $3
       WHERE id = $4`,
      [newRemainingBalance, newStatus, now, id]
    );

    logger.info('Payment recorded successfully', {
      requestId: req.requestId,
      userId: req.user?.id,
      piutangId: id,
      amount,
      newRemainingBalance,
      newStatus,
    });

    // Fetch and return updated piutang
    const updatedResult = await db.query(
      `SELECT 
        p.id,
        p.transaction_id,
        p.member_id,
        m.name as customer_name,
        m.phone as customer_phone,
        m.email as customer_email,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
       FROM piutang p
       LEFT JOIN members m ON p.member_id = m.id
       WHERE p.id = $1`,
      [id]
    );

    const row = updatedResult.rows[0];
    const updatedPiutang = {
      id: row.id,
      transactionId: row.transaction_id,
      memberId: row.member_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      amount: Number(row.amount),
      remainingBalance: Number(row.remaining_balance),
      dueDate: row.due_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return res.json(updatedPiutang);
  } catch (error) {
    logger.error('Error recording payment:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
      piutangId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to record payment' });
  }
});

export default router;
