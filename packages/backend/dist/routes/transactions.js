/**
 * Transaction Routes
 * Handles transaction creation, retrieval, and editing
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../database/connection.js';
import { createTransaction, validateMemberCredit } from '../services/transaction.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
const router = Router();
/**
 * POST /api/transactions
 * Create a new transaction with payment processing
 */
router.post('/', requireAuth(), async (req, res) => {
    try {
        const { storeId, items, paymentMethod, paymentData, notes } = req.body;
        const user = req.user;
        // Validation
        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Transaction items are required' });
        }
        if (!paymentMethod || !['CASH', 'MEMBER_CREDIT', 'TEMPO'].includes(paymentMethod)) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }
        // Validate cash payment
        if (paymentMethod === 'CASH') {
            if (!paymentData?.cash) {
                return res.status(400).json({ error: 'Cash payment data is required' });
            }
            if (paymentData.cash.amountReceived <= 0) {
                return res.status(400).json({ error: 'Amount received must be greater than 0' });
            }
        }
        // Validate member credit payment
        if (paymentMethod === 'MEMBER_CREDIT') {
            if (!paymentData?.memberCredit) {
                return res.status(400).json({ error: 'Member credit payment data is required' });
            }
            const memberValidation = await validateMemberCredit(paymentData.memberCredit.memberId, paymentData.memberCredit.usedCredit);
            if (!memberValidation.valid) {
                return res.status(400).json({
                    error: memberValidation.error,
                    availableBalance: memberValidation.currentBalance,
                });
            }
        }
        // Validate tempo payment
        if (paymentMethod === 'TEMPO') {
            if (!paymentData?.tempo) {
                return res.status(400).json({ error: 'Tempo payment data is required' });
            }
            if (!paymentData.tempo.customerName) {
                return res.status(400).json({ error: 'Customer name is required for tempo payment' });
            }
            if (!paymentData.tempo.durationDays || paymentData.tempo.durationDays <= 0) {
                return res.status(400).json({ error: 'Valid duration is required for tempo payment' });
            }
        }
        // Create transaction
        const result = await createTransaction({
            storeId,
            kasirId: user.id,
            items,
            paymentMethod,
            paymentData,
            notes,
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.status(201).json(result.transaction);
    }
    catch (error) {
        logger.error('Error creating transaction:', error);
        return res.status(500).json({ error: 'Failed to create transaction' });
    }
});
/**
 * GET /api/transactions
 * List transactions with pagination and filtering
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20)
 * - storeId: Filter by store ID
 * - paymentMethod: Filter by single payment method (CASH, MEMBER_CREDIT, TEMPO)
 * - paymentMethods: Filter by multiple payment methods (comma-separated: CASH,MEMBER_CREDIT)
 * - startDate: Filter transactions from this date
 * - endDate: Filter transactions until this date
 */
router.get('/', requireAuth(), async (req, res) => {
    try {
        const { page = 1, limit = 20, storeId, paymentMethod, paymentMethods, startDate, endDate } = req.query;
        const user = req.user;
        const offset = (Number(page) - 1) * Number(limit);
        let query = 'SELECT t.* FROM transactions t WHERE t.status = \'COMPLETED\'';
        const params = [];
        // Filter by store - kasir sees only their store
        if (user.role === 'KASIR' && user.storeId) {
            query += ' AND t.store_id = $' + (params.length + 1);
            params.push(user.storeId);
        }
        else if (storeId) {
            query += ' AND t.store_id = $' + (params.length + 1);
            params.push(storeId);
        }
        // Handle both single and multiple payment method filters
        if (paymentMethods) {
            // Multiple payment methods (comma-separated): "CASH,MEMBER_CREDIT"
            const methods = paymentMethods.split(',').map(m => m.trim());
            const placeholders = methods.map((_, idx) => `$${params.length + idx + 1}`).join(',');
            query += ` AND t.payment_method IN (${placeholders})`;
            params.push(...methods);
        }
        else if (paymentMethod) {
            // Single payment method (backward compatibility)
            query += ' AND t.payment_method = $' + (params.length + 1);
            params.push(paymentMethod);
        }
        if (startDate) {
            query += ' AND t.transaction_date >= $' + (params.length + 1);
            params.push(new Date(startDate));
        }
        if (endDate) {
            query += ' AND t.transaction_date <= $' + (params.length + 1);
            params.push(new Date(endDate));
        }
        // Get total count
        const countResult = await db.query(query.replace('SELECT t.*', 'SELECT COUNT(*) as count'), params);
        const total = Number(countResult.rows[0].count);
        // Get paginated data
        query += ' ORDER BY t.transaction_date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(Number(limit), offset);
        const result = await db.query(query, params);
        const transactions = result.rows.map((row) => ({
            id: row.id,
            storeId: row.store_id,
            kasirId: row.kasir_id,
            transactionDate: row.transaction_date,
            totalAmount: Number(row.total_amount),
            paymentMethod: row.payment_method,
            status: row.status,
            notes: row.notes,
            isEdited: row.is_edited,
            version: row.version,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        const pages = Math.ceil(total / Number(limit));
        return res.json({
            data: transactions,
            total,
            page: Number(page),
            limit: Number(limit),
            pages,
        });
    }
    catch (error) {
        logger.error('Error fetching transactions:', error);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
/**
 * GET /api/transactions/:id
 * Get transaction details with items
 */
router.get('/:id', requireAuth(), async (req, res) => {
    try {
        const { id } = req.params;
        const txnResult = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (txnResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const txn = txnResult.rows[0];
        const itemsResult = await db.query('SELECT * FROM transaction_items WHERE transaction_id = $1', [id]);
        const transaction = {
            id: txn.id,
            storeId: txn.store_id,
            kasirId: txn.kasir_id,
            transactionDate: txn.transaction_date,
            totalAmount: Number(txn.total_amount),
            paymentMethod: txn.payment_method,
            status: txn.status,
            notes: txn.notes,
            isEdited: txn.is_edited,
            version: txn.version,
            editedAt: txn.edited_at,
            editedBy: txn.edited_by,
            createdAt: txn.created_at,
            updatedAt: txn.updated_at,
            items: itemsResult.rows.map((item) => ({
                id: item.id,
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: Number(item.unit_price),
                totalPrice: Number(item.total_price),
                createdAt: item.created_at,
            })),
        };
        return res.json(transaction);
    }
    catch (error) {
        logger.error('Error fetching transaction:', error);
        return res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});
/**
 * PUT /api/transactions/:id
 * Edit transaction (only if authorized)
 */
router.put('/:id', requireAuth(), async (req, res) => {
    try {
        const { id } = req.params;
        const { items, notes } = req.body;
        const user = req.user;
        const txnResult = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (txnResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const txn = txnResult.rows[0];
        // Only kasir who created it or owner can edit
        if (user.role === 'KASIR' && txn.kasir_id !== user.id) {
            return res.status(403).json({ error: 'Not authorized to edit this transaction' });
        }
        // Recalculate total
        const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const now = new Date();
        await db.query('BEGIN');
        try {
            // Update transaction
            await db.query(`UPDATE transactions 
         SET total_amount = $1, notes = $2, is_edited = true, edited_at = $3, edited_by = $4, version = version + 1, updated_at = $5
         WHERE id = $6`, [totalAmount.toString(), notes || null, now, user.id, now, id]);
            // Delete old items
            await db.query('DELETE FROM transaction_items WHERE transaction_id = $1', [id]);
            // Insert new items
            const newItems = [];
            for (const item of items) {
                const itemId = uuidv4();
                const itemResult = await db.query(`INSERT INTO transaction_items 
           (id, transaction_id, product_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`, [
                    itemId,
                    id,
                    item.productId,
                    item.quantity,
                    item.unitPrice.toString(),
                    item.totalPrice.toString(),
                    now,
                ]);
                newItems.push(itemResult.rows[0]);
            }
            await db.query('COMMIT');
            const updatedTxn = {
                id: txn.id,
                storeId: txn.store_id,
                kasirId: txn.kasir_id,
                transactionDate: txn.transaction_date,
                totalAmount,
                paymentMethod: txn.payment_method,
                status: txn.status,
                notes: notes || null,
                isEdited: true,
                editedAt: now,
                editedBy: user.id,
                version: txn.version + 1,
                createdAt: txn.created_at,
                updatedAt: now,
                items: newItems.map((item) => ({
                    id: item.id,
                    productId: item.product_id,
                    quantity: item.quantity,
                    unitPrice: Number(item.unit_price),
                    totalPrice: Number(item.total_price),
                })),
            };
            return res.json(updatedTxn);
        }
        catch (innerError) {
            await db.query('ROLLBACK');
            throw innerError;
        }
    }
    catch (error) {
        logger.error('Error updating transaction:', error);
        return res.status(500).json({ error: 'Failed to update transaction' });
    }
});
export default router;
//# sourceMappingURL=transactions.js.map