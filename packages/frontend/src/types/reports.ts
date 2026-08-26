/**
 * Report types for Vapestore POS
 * Includes daily sales reports and related data structures
 */

export interface DailySalesReportResponse {
  data: {
    date: string;
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      storeCount: number;
    };
    byStore: StoreSalesDetail[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface WeeklySalesReportResponse {
  data: {
    week: number;
    year: number;
    weekStart: string;
    weekEnd: string;
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      storeCount: number;
    };
    byStore: WeeklyStoreSalesDetail[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface MonthlySalesReportResponse {
  data: {
    month: number;
    year: number;
    monthStart: string;
    monthEnd: string;
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      storeCount: number;
      averageTransaction: number;
      topProduct: TopProductItem | null;
    };
    byStore: MonthlyStoreSalesDetail[];
    topProducts: TopProductItem[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface StoreSalesDetail {
  storeId: string;
  storeName: string;
  revenue: number;
  transactionCount: number;
  averageTransaction: number;
  paymentMethods: PaymentMethodBreakdown;
}

export interface WeeklyStoreSalesDetail {
  storeId: string;
  storeName: string;
  revenue: number;
  transactionCount: number;
  paymentMethods: PaymentMethodBreakdown;
  dailyBreakdown: DailyBreakdownItem[];
}

export interface MonthlyStoreSalesDetail {
  storeId: string;
  storeName: string;
  revenue: number;
  transactionCount: number;
  paymentMethods: PaymentMethodBreakdown;
  weeklyBreakdown: WeeklyBreakdownItem[];
}

export interface DailyBreakdownItem {
  date: string;
  dayOfWeek: string;
  revenue: number;
  transactionCount: number;
}

export interface WeeklyBreakdownItem {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  revenue: number;
  transactionCount: number;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  averagePrice?: number;
}

export interface PaymentMethodBreakdown {
  [key: string]: PaymentMethodStat;
}

export interface PaymentMethodStat {
  count: number;
  amount: number;
}

export interface SalesReportSummary {
  totalRevenue: number;
  totalTransactions: number;
  storeCount: number;
  averageTransaction?: number;
}

export interface SalesReportError {
  code: string;
  message: string;
  timestamp: string;
}

// ============= Financial Analysis Reports =============

/**
 * Profit & Loss Report
 * Requirements: 17.1, 17.2, 17.3
 */
export interface ProfitLossReportResponse {
  data: {
    month: number;
    year: number;
    monthStart: string;
    monthEnd: string;
    summary: {
      totalRevenue: number;
      totalCOGS: number;
      grossProfit: number;
      grossProfitMargin: number; // percentage
      operatingExpenses: number;
      netProfit: number;
      netProfitMargin: number; // percentage
    };
    byStore: ProfitLossStoreDetail[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProfitLossStoreDetail {
  storeId: string;
  storeName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  netProfit: number;
  netProfitMargin: number;
}

/**
 * Inventory Valuation Report
 * Requirements: 21.2, 21.3
 */
export interface InventoryValuationReportResponse {
  data: {
    date: string;
    summary: {
      totalInventoryValue: number;
      storeCount: number;
      totalItemCount: number;
      warehouseValue: number;
    };
    byStore: InventoryValuationStoreDetail[];
    warehouse: InventoryValuationLocationDetail;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface InventoryValuationStoreDetail {
  storeId: string;
  storeName: string;
  inventoryValue: number;
  itemCount: number;
  topItems: InventoryItem[];
}

export interface InventoryValuationLocationDetail {
  inventoryValue: number;
  itemCount: number;
  topItems: InventoryItem[];
}

export interface InventoryItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  value: number;
}

/**
 * Cash Flow Report
 * Requirements: 17.5, 17.6
 */
export interface CashFlowReportResponse {
  data: {
    month: number;
    year: number;
    monthStart: string;
    monthEnd: string;
    summary: {
      operatingCashIn: number;
      operatingCashOut: number;
      operatingCashFlow: number;
      investingCashFlow: number;
      financingCashFlow: number;
      netCashFlow: number;
    };
    byStore: CashFlowStoreDetail[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CashFlowStoreDetail {
  storeId: string;
  storeName: string;
  operatingCashIn: number;
  operatingCashOut: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
}

/**
 * BOP (Biaya Operasional Penjualan) Expense Report
 * Requirements: 17.1, 17.2, 17.3
 */
export interface BOPReportResponse {
  data: {
    period: 'daily' | 'weekly' | 'monthly';
    date?: string;
    week?: number;
    year?: number;
    month?: number;
    weekStart?: string;
    weekEnd?: string;
    monthStart?: string;
    monthEnd?: string;
    summary: {
      totalBOP: number;
      storeCount: number;
      averageBOP: number;
    };
    byStore: BOPStoreDetail[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BOPStoreDetail {
  storeId: string;
  storeName: string;
  totalBOP: number;
  bopItems: BOPItem[];
}

export interface BOPItem {
  id: string;
  name: string;
  description?: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}
