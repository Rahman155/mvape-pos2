/**
 * Database entity type definitions
 * These types represent the structure of tables in PostgreSQL
 */
import { UUID } from '../types/index.js';
export interface User {
    id: UUID;
    username: string;
    email: string | null;
    password_hash: string;
    role: 'KASIR' | 'OWNER' | 'ADMIN';
    store_id: UUID | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    last_login: Date | null;
}
export interface Store {
    id: UUID;
    name: string;
    address: string | null;
    phone: string | null;
    logo_url: string | null;
    operating_hours: Record<string, any> | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    metadata: Record<string, any>;
}
export interface Product {
    id: UUID;
    name: string;
    sku: string;
    category: string | null;
    cost_price: string;
    selling_price: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface Inventory {
    id: UUID;
    product_id: UUID;
    store_id: UUID;
    quantity: number;
    reserved: number;
    reorder_level: number;
    last_restock_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface Transaction {
    id: UUID;
    store_id: UUID;
    kasir_id: UUID;
    transaction_date: Date;
    total_amount: string;
    payment_method: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    edited_at: Date | null;
    edited_by: UUID | null;
    is_edited: boolean;
    version: number;
}
export interface TransactionItem {
    id: UUID;
    transaction_id: UUID;
    product_id: UUID;
    quantity: number;
    unit_price: string;
    total_price: string;
    created_at: Date;
}
export interface Member {
    id: UUID;
    member_number: string;
    name: string;
    phone: string | null;
    email: string | null;
    credit_balance: string;
    total_spent: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface BOP {
    id: UUID;
    store_id: UUID;
    name: string;
    description: string | null;
    amount: string;
    effective_from: string;
    effective_to: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface Supplier {
    id: UUID;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    payment_terms: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface PurchaseOrder {
    id: UUID;
    supplier_id: UUID;
    order_date: Date;
    payment_method: 'CASH' | 'TRANSFER' | 'TEMPO';
    payment_status: 'PENDING' | 'PAID' | 'PARTIAL';
    total_amount: string;
    due_date: string | null;
    status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
    created_at: Date;
    updated_at: Date;
}
export interface POItem {
    id: UUID;
    purchase_order_id: UUID;
    product_id: UUID;
    quantity: number;
    unit_price: string;
    total_price: string;
    received_quantity: number;
    created_at: Date;
}
export interface Piutang {
    id: UUID;
    transaction_id: UUID | null;
    member_id: UUID | null;
    amount: string;
    remaining_balance: string;
    due_date: string | null;
    status: 'OPEN' | 'PARTIAL' | 'CLOSED';
    created_at: Date;
    updated_at: Date;
}
export interface StockTransfer {
    id: UUID;
    from_location_id: UUID;
    to_store_id: UUID;
    transfer_date: Date;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    created_by: UUID;
    created_at: Date;
    updated_at: Date;
}
export interface StockTransferItem {
    id: UUID;
    stock_transfer_id: UUID;
    product_id: UUID;
    quantity: number;
    received_quantity: number;
    created_at: Date;
}
export interface StockOpname {
    id: UUID;
    store_id: UUID;
    opname_date: Date;
    status: 'ONGOING' | 'COMPLETED' | 'VERIFIED';
    conducted_by: UUID;
    verified_by: UUID | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface OpnameDetail {
    id: UUID;
    opname_id: UUID;
    product_id: UUID;
    system_quantity: number;
    physical_quantity: number;
    difference: number | null;
    status: 'MATCH' | 'SHORTAGE' | 'EXCESS';
    notes: string | null;
    created_at: Date;
}
export interface Attendance {
    id: UUID;
    user_id: UUID;
    clock_in: Date;
    clock_out: Date | null;
    duration_minutes: number | null;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'INCOMPLETE';
    created_at: Date;
}
export interface ChangeHistory {
    id: UUID;
    entity_type: string;
    entity_id: UUID;
    changed_by: UUID;
    change_type: 'CREATE' | 'UPDATE' | 'DELETE';
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    timestamp: Date;
}
export interface CreditTransaction {
    id: UUID;
    member_id: UUID;
    transaction_type: 'TOPUP' | 'DEDUCT' | 'PAYMENT';
    amount: string;
    previous_balance: string;
    new_balance: string;
    notes: string | null;
    created_by: UUID;
    created_at: Date;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
}
export interface TransactionWithItems extends Transaction {
    items: TransactionItem[];
}
export interface OpnameWithDetails extends StockOpname {
    details: OpnameDetail[];
}
export interface POWithItems extends PurchaseOrder {
    items: POItem[];
}
export interface StockTransferWithItems extends StockTransfer {
    items: StockTransferItem[];
}
//# sourceMappingURL=types.d.ts.map