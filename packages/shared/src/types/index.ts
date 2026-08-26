/**
 * Common types and interfaces for Vapestore POS
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier' | 'manager';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Transaction {
  id: string;
  userId: string;
  items: TransactionItem[];
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItem {
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}
