/**
 * Purchase Orders Management Routes
 * Handles purchase order CRUD operations (owner-only)
 * Supports CASH, TRANSFER, and TEMPO payment methods
 */
import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
/**
 * GET /api/purchase-orders
 * Get purchase orders list with pagination
 */
router.get('/', authorize('OWNER'), async (req, res) => {
    try {
        const { page = 1, limit = 20, supplierId, status, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = `
      SELECT 
        po.id,
        po.supplier_id,
        s.name as supplier_name,
        po.order_date,
        po.payment_method,
        po.payment_status,
        po.total_amount,
        po.due_date,
        po.status,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `;
        const params = [];
        if (supplierId) {
            query += ` AND po.supplier_id = $${params.length + 1}`;
            params.push(supplierId);
        }
        if (status) {
            query += ` AND po.status = $${params.length + 1}`;
            params.push(status);
        }
        if (search) {
            query += ` AND s.name ILIKE $${params.length + 1}`;
            params.push(`%${search}%`);
        }
        // Get total count
        let countQuery = `
      SELECT COUNT(*) FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `;
        const countParams = [];
        if (supplierId) {
            countQuery += ` AND po.supplier_id = $${countParams.length + 1}`;
            countParams.push(supplierId);
        }
        if (status) {
            countQuery += ` AND po.status = $${countParams.length + 1}`;
            countParams.push(status);
        }
        if (search) {
            countQuery += ` AND s.name ILIKE $${countParams.length + 1}`;
            countParams.push(`%${search}%`);
        }
        const countResult = await db.query(countQuery, countParams);
        const total = Number(countResult.rows[0].count);
        // Add pagination and ordering
        query += ` ORDER BY po.order_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), offset);
        const result = await db.query(query, params);
        const purchaseOrders = result.rows.map((row) => ({
            id: row.id,
            supplierId: row.supplier_id,
            supplierName: row.supplier_name,
            orderDate: row.order_date,
            paymentMethod: row.payment_method,
            paymentStatus: row.payment_status,
            totalAmount: Number(row.total_amount),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        const pages = Math.ceil(total / Number(limit));
        return res.json({
            data: purchaseOrders,
            total,
            page: Number(page),
            limit: Number(limit),
            pages,
        });
    }
    catch (error) {
        logger.error('Error fetching purchase orders list:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
        });
        return res.status(500).json({ error: 'Failed to fetch purchase orders list' });
    }
});
/**
 * POST /api/purchase-orders
 * Create a new purchase order (owner-only)
 * Required fields: supplierId, items (array), paymentMethod
 * Optional for TEMPO: durationDays
 */
router.post('/', authorize('OWNER'), async (req, res) => {
    try {
        const { supplierId, items, paymentMethod, durationDays } = req.body;
        // Validation
        if (!supplierId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
            logger.warn('Purchase order creation failed: Missing required fields', {
                requestId: req.requestId,
                userId: req.user?.id,
                providedFields: {
                    supplierId: !!supplierId,
                    paymentMethod: !!paymentMethod,
                    items: Array.isArray(items) ? items.length : 0,
                },
            });
            return res.status(400).json({
                error: 'Invalid request',
                details: 'supplierId, paymentMethod, and items (non-empty array) are required',
            });
        }
        // Validate payment method
        const validPaymentMethods = ['CASH', 'TRANSFER', 'TEMPO'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                error: 'Invalid payment method',
                details: `Payment method must be one of: ${validPaymentMethods.join(', ')}`,
            });
        }
        // Validate TEMPO duration
        if (paymentMethod === 'TEMPO') {
            if (!durationDays || typeof durationDays !== 'number' || durationDays <= 0) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'durationDays is required for TEMPO payment method and must be a positive number',
                });
            }
        }
        // Verify supplier exists
        const supplierResult = await db.query('SELECT id, name FROM suppliers WHERE id = $1', [supplierId]);
        if (supplierResult.rows.length === 0) {
            logger.warn('Purchase order creation failed: Supplier not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                supplierId,
            });
            return res.status(404).json({ error: 'Supplier not found' });
        }
        // Validate items
        let totalAmount = 0;
        const validatedItems = [];
        for (const item of items) {
            if (!item.productId || !item.quantity || item.unitPrice === undefined) {
                return res.status(400).json({
                    error: 'Invalid item',
                    details: 'Each item must have productId, quantity, and unitPrice',
                });
            }
            // Verify product exists
            const productResult = await db.query('SELECT id FROM products WHERE id = $1', [item.productId]);
            if (productResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Product not found',
                    details: `Product ${item.productId} does not exist`,
                });
            }
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            if (quantity <= 0 || unitPrice < 0) {
                return res.status(400).json({
                    error: 'Invalid item values',
                    details: 'Quantity must be positive, unitPrice must be non-negative',
                });
            }
            const totalPrice = quantity * unitPrice;
            totalAmount += totalPrice;
            validatedItems.push({
                productId: item.productId,
                quantity,
                unitPrice,
                totalPrice,
            });
        }
        // Create purchase order in transaction
        const poId = uuidv4();
        const orderDate = new Date();
        // Calculate due date for TEMPO
        let dueDate = null;
        if (paymentMethod === 'TEMPO') {
            dueDate = new Date(orderDate);
            dueDate.setDate(dueDate.getDate() + durationDays);
        }
        // Create PO record
        await db.query(`INSERT INTO purchase_orders 
       (id, supplier_id, order_date, payment_method, payment_status, total_amount, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            poId,
            supplierId,
            orderDate,
            paymentMethod,
            'PENDING',
            totalAmount,
            dueDate ? dueDate.toISOString().split('T')[0] : null,
            'PENDING',
            orderDate,
            orderDate,
        ]);
        // Create PO items
        for (const item of validatedItems) {
            const poItemId = uuidv4();
            await db.query(`INSERT INTO po_items 
         (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                poItemId,
                poId,
                item.productId,
                item.quantity,
                item.unitPrice,
                item.totalPrice,
                0,
                orderDate,
            ]);
        }
        logger.info('Purchase order created successfully', {
            requestId: req.requestId,
            userId: req.user?.id,
            poId,
            supplierId,
            itemCount: validatedItems.length,
            totalAmount,
            paymentMethod,
        });
        // Fetch and return created PO with items
        const poResult = await db.query(`SELECT 
        po.id,
        po.supplier_id,
        s.name as supplier_name,
        po.order_date,
        po.payment_method,
        po.payment_status,
        po.total_amount,
        po.due_date,
        po.status,
        po.created_at,
        po.updated_at
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`, [poId]);
        const poRow = poResult.rows[0];
        const itemsResult = await db.query(`SELECT 
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        received_quantity
       FROM po_items WHERE purchase_order_id = $1`, [poId]);
        const poItems = itemsResult.rows.map((row) => ({
            id: row.id,
            productId: row.product_id,
            quantity: row.quantity,
            unitPrice: Number(row.unit_price),
            totalPrice: Number(row.total_price),
            receivedQuantity: row.received_quantity,
        }));
        const purchaseOrder = {
            id: poRow.id,
            supplierId: poRow.supplier_id,
            supplierName: poRow.supplier_name,
            orderDate: poRow.order_date,
            paymentMethod: poRow.payment_method,
            paymentStatus: poRow.payment_status,
            totalAmount: Number(poRow.total_amount),
            dueDate: poRow.due_date,
            status: poRow.status,
            items: poItems,
            createdAt: poRow.created_at,
            updatedAt: poRow.updated_at,
        };
        return res.status(201).json(purchaseOrder);
    }
    catch (error) {
        logger.error('Error creating purchase order:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
        });
        return res.status(500).json({ error: 'Failed to create purchase order' });
    }
});
/**
 * GET /api/purchase-orders/:id
 * Get a specific purchase order with items
 */
router.get('/:id', authorize('OWNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT 
        po.id,
        po.supplier_id,
        s.name as supplier_name,
        po.order_date,
        po.payment_method,
        po.payment_status,
        po.total_amount,
        po.due_date,
        po.status,
        po.created_at,
        po.updated_at
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`, [id]);
        if (result.rows.length === 0) {
            logger.warn('Purchase order fetch failed: PO not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                poId: id,
            });
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        const poRow = result.rows[0];
        // Fetch PO items
        const itemsResult = await db.query(`SELECT 
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        received_quantity
       FROM po_items WHERE purchase_order_id = $1`, [id]);
        const poItems = itemsResult.rows.map((row) => ({
            id: row.id,
            productId: row.product_id,
            quantity: row.quantity,
            unitPrice: Number(row.unit_price),
            totalPrice: Number(row.total_price),
            receivedQuantity: row.received_quantity,
        }));
        const purchaseOrder = {
            id: poRow.id,
            supplierId: poRow.supplier_id,
            supplierName: poRow.supplier_name,
            orderDate: poRow.order_date,
            paymentMethod: poRow.payment_method,
            paymentStatus: poRow.payment_status,
            totalAmount: Number(poRow.total_amount),
            dueDate: poRow.due_date,
            status: poRow.status,
            items: poItems,
            createdAt: poRow.created_at,
            updatedAt: poRow.updated_at,
        };
        return res.json(purchaseOrder);
    }
    catch (error) {
        logger.error('Error fetching purchase order:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
            poId: req.params.id,
        });
        return res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
});
export default router;
//# sourceMappingURL=purchase-orders.js.map