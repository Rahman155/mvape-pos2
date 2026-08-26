/**
 * Payables Management Routes
 * Handles supplier payables (debt) tracking and payment recording
 * Payables are created from TEMPO purchase orders
 * Note: supplier_id is accessed through purchase_order -> supplier_id
 */
import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
const router = Router();
/**
 * GET /api/payables
 * Get payables list (supplier debts) with pagination
 * Supports filtering by status, supplier, and due date ranges
 */
router.get('/', authorize('OWNER'), async (req, res) => {
    try {
        const { page = 1, limit = 20, status, supplierId, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = `
      SELECT 
        p.id,
        p.purchase_order_id,
        po.supplier_id,
        s.name as supplier_name,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
      FROM piutang p
      LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE p.purchase_order_id IS NOT NULL
    `;
        const params = [];
        if (status) {
            query += ` AND p.status = $${params.length + 1}`;
            params.push(status);
        }
        if (supplierId) {
            query += ` AND po.supplier_id = $${params.length + 1}`;
            params.push(supplierId);
        }
        if (search) {
            query += ` AND s.name ILIKE $${params.length + 1}`;
            params.push(`%${search}%`);
        }
        // Get total count
        let countQuery = `
      SELECT COUNT(*) FROM piutang p
      LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE p.purchase_order_id IS NOT NULL
    `;
        const countParams = [];
        if (status) {
            countQuery += ` AND p.status = $${countParams.length + 1}`;
            countParams.push(status);
        }
        if (supplierId) {
            countQuery += ` AND po.supplier_id = $${countParams.length + 1}`;
            countParams.push(supplierId);
        }
        if (search) {
            countQuery += ` AND s.name ILIKE $${countParams.length + 1}`;
            countParams.push(`%${search}%`);
        }
        const countResult = await db.query(countQuery, countParams);
        const total = Number(countResult.rows[0].count);
        // Add pagination and ordering (due date nearest first)
        query += ` ORDER BY p.due_date ASC, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), offset);
        const result = await db.query(query, params);
        const payables = result.rows.map((row) => ({
            id: row.id,
            purchaseOrderId: row.purchase_order_id,
            supplierId: row.supplier_id,
            supplierName: row.supplier_name,
            amount: Number(row.amount),
            remainingBalance: Number(row.remaining_balance),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        const pages = Math.ceil(total / Number(limit));
        return res.json({
            data: payables,
            total,
            page: Number(page),
            limit: Number(limit),
            pages,
        });
    }
    catch (error) {
        logger.error('Error fetching payables list:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
        });
        return res.status(500).json({ error: 'Failed to fetch payables list' });
    }
});
/**
 * GET /api/payables/:id
 * Get a specific payable (supplier debt) record
 */
router.get('/:id', authorize('OWNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT 
        p.id,
        p.purchase_order_id,
        po.supplier_id,
        s.name as supplier_name,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
       FROM piutang p
       LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE p.id = $1`, [id]);
        if (result.rows.length === 0) {
            logger.warn('Payable fetch failed: Payable not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                payableId: id,
            });
            return res.status(404).json({ error: 'Payable not found' });
        }
        const row = result.rows[0];
        const payable = {
            id: row.id,
            purchaseOrderId: row.purchase_order_id,
            supplierId: row.supplier_id,
            supplierName: row.supplier_name,
            amount: Number(row.amount),
            remainingBalance: Number(row.remaining_balance),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        return res.json(payable);
    }
    catch (error) {
        logger.error('Error fetching payable:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
            payableId: req.params.id,
        });
        return res.status(500).json({ error: 'Failed to fetch payable' });
    }
});
/**
 * PUT /api/payables/:id/payment
 * Record payment for a payable (supplier debt)
 * Updates status: OPEN -> PARTIAL -> CLOSED
 * Required fields: paymentAmount
 */
router.put('/:id/payment', authorize('OWNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount } = req.body;
        // Validation
        if (paymentAmount === undefined || typeof paymentAmount !== 'number' || paymentAmount <= 0) {
            logger.warn('Payment recording failed: Invalid payment amount', {
                requestId: req.requestId,
                userId: req.user?.id,
                paymentAmount,
            });
            return res.status(400).json({
                error: 'Invalid request',
                details: 'paymentAmount is required and must be a positive number',
            });
        }
        // Verify payable exists
        const payableResult = await db.query(`SELECT 
        id, 
        amount, 
        remaining_balance, 
        status, 
        purchase_order_id
       FROM piutang WHERE id = $1`, [id]);
        if (payableResult.rows.length === 0) {
            logger.warn('Payment recording failed: Payable not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                payableId: id,
            });
            return res.status(404).json({ error: 'Payable not found' });
        }
        const payable = payableResult.rows[0];
        const remainingBalance = Number(payable.remaining_balance);
        // Validate payment amount
        if (paymentAmount > remainingBalance) {
            logger.warn('Payment recording failed: Payment exceeds remaining balance', {
                requestId: req.requestId,
                userId: req.user?.id,
                payableId: id,
                paymentAmount,
                remainingBalance,
            });
            return res.status(400).json({
                error: 'Invalid payment amount',
                details: `Payment amount cannot exceed remaining balance of ${remainingBalance}`,
            });
        }
        // Calculate new remaining balance and status
        const newRemainingBalance = remainingBalance - paymentAmount;
        let newStatus = payable.status;
        if (newRemainingBalance === 0) {
            newStatus = 'CLOSED';
        }
        else if (payable.status === 'OPEN') {
            newStatus = 'PARTIAL';
        }
        // Update payable record
        const now = new Date();
        await db.query(`UPDATE piutang 
       SET remaining_balance = $1, status = $2, updated_at = $3
       WHERE id = $4`, [newRemainingBalance, newStatus, now, id]);
        logger.info('Payment recorded successfully', {
            requestId: req.requestId,
            userId: req.user?.id,
            payableId: id,
            paymentAmount,
            newRemainingBalance,
            newStatus,
        });
        // Fetch and return updated payable
        const updatedResult = await db.query(`SELECT 
        p.id,
        p.purchase_order_id,
        po.supplier_id,
        s.name as supplier_name,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
       FROM piutang p
       LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE p.id = $1`, [id]);
        const row = updatedResult.rows[0];
        const updatedPayable = {
            id: row.id,
            purchaseOrderId: row.purchase_order_id,
            supplierId: row.supplier_id,
            supplierName: row.supplier_name,
            amount: Number(row.amount),
            remainingBalance: Number(row.remaining_balance),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        return res.json(updatedPayable);
    }
    catch (error) {
        logger.error('Error recording payment:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
            payableId: req.params.id,
        });
        return res.status(500).json({ error: 'Failed to record payment' });
    }
});
/**
 * GET /api/payables/alerts/upcoming
 * Get payables due within the next 7 days
 */
router.get('/alerts/upcoming', authorize('OWNER'), async (req, res) => {
    try {
        const today = new Date();
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const todayStr = today.toISOString().split('T')[0];
        const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
        const result = await db.query(`SELECT 
        p.id,
        p.purchase_order_id,
        po.supplier_id,
        s.name as supplier_name,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
       FROM piutang p
       LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE p.status IN ('OPEN', 'PARTIAL')
       AND p.due_date >= $1
       AND p.due_date <= $2
       AND p.purchase_order_id IS NOT NULL
       ORDER BY p.due_date ASC`, [todayStr, sevenDaysStr]);
        const upcomingPayables = result.rows.map((row) => ({
            id: row.id,
            purchaseOrderId: row.purchase_order_id,
            supplierId: row.supplier_id,
            supplierName: row.supplier_name,
            amount: Number(row.amount),
            remainingBalance: Number(row.remaining_balance),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        return res.json({
            data: upcomingPayables,
            total: upcomingPayables.length,
            alert: 'Payables due within the next 7 days',
        });
    }
    catch (error) {
        logger.error('Error fetching upcoming payables:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
        });
        return res.status(500).json({ error: 'Failed to fetch upcoming payables' });
    }
});
/**
 * GET /api/payables/alerts/overdue
 * Get overdue payables (past due date)
 */
router.get('/alerts/overdue', authorize('OWNER'), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await db.query(`SELECT 
        p.id,
        p.purchase_order_id,
        po.supplier_id,
        s.name as supplier_name,
        p.amount,
        p.remaining_balance,
        p.due_date,
        p.status,
        p.created_at,
        p.updated_at
       FROM piutang p
       LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE p.status IN ('OPEN', 'PARTIAL')
       AND p.due_date < $1
       AND p.purchase_order_id IS NOT NULL
       ORDER BY p.due_date ASC`, [today]);
        const overduePayables = result.rows.map((row) => ({
            id: row.id,
            purchaseOrderId: row.purchase_order_id,
            supplierId: row.supplier_id,
            supplierName: row.supplier_name,
            amount: Number(row.amount),
            remainingBalance: Number(row.remaining_balance),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        return res.json({
            data: overduePayables,
            total: overduePayables.length,
            alert: 'Overdue payables - immediate action required',
        });
    }
    catch (error) {
        logger.error('Error fetching overdue payables:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
        });
        return res.status(500).json({ error: 'Failed to fetch overdue payables' });
    }
});
export default router;
//# sourceMappingURL=payables.js.map