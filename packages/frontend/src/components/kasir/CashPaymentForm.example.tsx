/**
 * CashPaymentForm Component - Usage Examples
 * 
 * This file demonstrates various ways to use the CashPaymentForm component
 * in the Vapestore POS application.
 */

import React, { useState } from 'react';
import { CashPaymentForm, CashPaymentData } from './CashPaymentForm';
import toast from 'react-hot-toast';

/**
 * Example 1: Basic Implementation
 * Simplest usage with required props only
 */
export function BasicCashPaymentExample() {
  const handlePaymentConfirm = (paymentData: CashPaymentData) => {
    console.log('Payment data:', paymentData);
    console.log(`Change to return: Rp ${paymentData.change.toLocaleString('id-ID')}`);
  };

  return (
    <CashPaymentForm
      totalAmount={50000}
      onPaymentConfirm={handlePaymentConfirm}
    />
  );
}

/**
 * Example 2: With Cancel Callback
 * Include cancel button functionality
 */
export function CashPaymentWithCancelExample() {
  const handlePaymentConfirm = (paymentData: CashPaymentData) => {
    console.log('Payment confirmed:', paymentData);
  };

  const handleCancel = () => {
    console.log('Payment cancelled by user');
  };

  return (
    <CashPaymentForm
      totalAmount={125000}
      onPaymentConfirm={handlePaymentConfirm}
      onCancel={handleCancel}
    />
  );
}

/**
 * Example 3: With Loading State
 * Show loading indicator during payment processing
 */
export function CashPaymentWithLoadingExample() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentConfirm = async (paymentData: CashPaymentData) => {
    setIsProcessing(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('Payment processed successfully');
      // Redirect to receipt or next step
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <CashPaymentForm
      totalAmount={75000}
      onPaymentConfirm={handlePaymentConfirm}
      isProcessing={isProcessing}
    />
  );
}

/**
 * Example 4: With Toast Notifications
 * Provide feedback via toast messages
 */
export function CashPaymentWithToastExample() {
  const handlePaymentConfirm = (paymentData: CashPaymentData) => {
    const changeAmount = paymentData.change;
    
    if (changeAmount > 0) {
      toast.success(
        `Pembayaran diterima!\nKembalian: Rp ${changeAmount.toLocaleString('id-ID')}`
      );
    } else if (changeAmount === 0) {
      toast.success('Pembayaran diterima. Tidak ada kembalian.');
    }
    
    console.log('Processing transaction...');
  };

  const handleCancel = () => {
    toast.error('Pembayaran dibatalkan');
  };

  return (
    <CashPaymentForm
      totalAmount={50000}
      onPaymentConfirm={handlePaymentConfirm}
      onCancel={handleCancel}
    />
  );
}

/**
 * Example 5: Integrated in Modal Dialog
 * Common pattern in POS applications
 */
export function CashPaymentModalExample() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionData, setTransactionData] = useState<CashPaymentData | null>(
    null
  );

  const handlePaymentConfirm = (paymentData: CashPaymentData) => {
    setTransactionData(paymentData);
    setShowPaymentModal(false);
    console.log('Transaction data:', paymentData);
    // Proceed to receipt generation or confirmation
  };

  const handleCancel = () => {
    setShowPaymentModal(false);
  };

  return (
    <div>
      <button onClick={() => setShowPaymentModal(true)}>
        Bayar Tunai
      </button>

      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Pembayaran Tunai
            </h2>
            <CashPaymentForm
              totalAmount={50000}
              onPaymentConfirm={handlePaymentConfirm}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {transactionData && (
        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded">
          <p className="text-green-900 dark:text-green-100">
            Pembayaran berhasil! Kembalian: Rp{' '}
            {transactionData.change.toLocaleString('id-ID')}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: With Custom Styling
 * Apply custom CSS classes for branding
 */
export function CashPaymentCustomStyledExample() {
  const handlePaymentConfirm = (paymentData: CashPaymentData) => {
    console.log('Payment:', paymentData);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        💳 Pembayaran Tunai
      </h2>
      
      <CashPaymentForm
        totalAmount={100000}
        onPaymentConfirm={handlePaymentConfirm}
        className="max-w-md mx-auto"
      />
    </div>
  );
}

/**
 * Example 7: Transaction Flow Integration
 * Real-world checkout flow example
 */
export function CheckoutFlowExample() {
  const [cartTotal] = useState(87500);
  const [paymentStep, setPaymentStep] = useState<'method-select' | 'cash-payment' | 'receipt'>(
    'method-select'
  );
  const [transactionData, setTransactionData] = useState<CashPaymentData | null>(
    null
  );

  const handlePaymentMethodSelect = (method: string) => {
    if (method === 'CASH') {
      setPaymentStep('cash-payment');
    }
  };

  const handleCashPaymentConfirm = (paymentData: CashPaymentData) => {
    setTransactionData(paymentData);
    setPaymentStep('receipt');
  };

  const handleReset = () => {
    setPaymentStep('method-select');
    setTransactionData(null);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Step 1: Payment Method Selection */}
      {paymentStep === 'method-select' && (
        <div className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Pilih Metode Pembayaran</h1>
            <p className="text-gray-600">Total: Rp {cartTotal.toLocaleString('id-ID')}</p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => handlePaymentMethodSelect('CASH')}
              className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
            >
              💵 Pembayaran Tunai
            </button>
            <button
              className="w-full p-4 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
              disabled
            >
              🎫 Member Credit (Coming Soon)
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Cash Payment Form */}
      {paymentStep === 'cash-payment' && (
        <div>
          <h1 className="text-2xl font-bold mb-6">Masukkan Uang Tunai</h1>
          <CashPaymentForm
            totalAmount={cartTotal}
            onPaymentConfirm={handleCashPaymentConfirm}
            onCancel={() => setPaymentStep('method-select')}
          />
        </div>
      )}

      {/* Step 3: Receipt/Confirmation */}
      {paymentStep === 'receipt' && transactionData && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
            <div className="text-5xl mb-2">✅</div>
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              Pembayaran Berhasil!
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Terima kasih telah berbelanja di toko kami
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Belanja:</span>
                <span className="font-semibold">
                  Rp {transactionData.totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Uang Masuk:</span>
                <span className="font-semibold">
                  Rp {transactionData.amountReceived.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                <span className="font-bold text-green-600 dark:text-green-400">
                  Kembalian:
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                  Rp {transactionData.change.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleReset}
              className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
            >
              Transaksi Baru
            </button>
            <button className="w-full p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold">
              Cetak Struk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 8: Validation Scenarios
 * Shows how validation works with different amounts
 */
export function ValidationScenariosExample() {
  const cartTotal = 50000;
  
  const scenarios = [
    { amount: 100000, description: 'Pembayaran normal (dengan kembalian)' },
    { amount: 50000, description: 'Pembayaran pas (tidak ada kembalian)' },
    { amount: 30000, description: 'Pembayaran kurang (error)' },
    { amount: 0, description: 'Pembayaran kosong (error)' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Skenario Validasi</h2>
      <p className="text-gray-600">Total Belanja: Rp {cartTotal.toLocaleString('id-ID')}</p>
      
      <div className="space-y-3">
        {scenarios.map((scenario, idx) => (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <p className="font-semibold text-gray-900 dark:text-white">
              {scenario.description}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Input: Rp {scenario.amount.toLocaleString('id-ID')}
            </p>
            
            {scenario.amount > cartTotal && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                ✅ Kembalian: Rp {(scenario.amount - cartTotal).toLocaleString('id-ID')}
              </p>
            )}
            
            {scenario.amount === cartTotal && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                ℹ️ Pembayaran pas, tidak ada kembalian
              </p>
            )}
            
            {scenario.amount < cartTotal && scenario.amount > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                ❌ Kurang: Rp {(cartTotal - scenario.amount).toLocaleString('id-ID')}
              </p>
            )}
            
            {scenario.amount === 0 && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                ❌ Jumlah uang tidak boleh kosong
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 9: Dark Mode Preview
 * Shows component in both light and dark modes
 */
export function DarkModeSwitchExample() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="bg-white dark:bg-gray-900 p-8 min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dark Mode Demo
          </h1>
          <button
            onClick={() => setIsDark(!isDark)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        
        <div className="max-w-md mx-auto">
          <CashPaymentForm
            totalAmount={50000}
            onPaymentConfirm={(data) => console.log(data)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Example 10: Responsive Design Preview
 * Shows component in different viewport sizes
 */
export function ResponsiveDesignExample() {
  return (
    <div className="space-y-8">
      {/* Mobile View */}
      <div>
        <h3 className="text-sm font-bold text-gray-600 mb-2">📱 Mobile View</h3>
        <div className="bg-gray-100 p-4 rounded-lg max-w-sm">
          <CashPaymentForm
            totalAmount={50000}
            onPaymentConfirm={(data) => console.log(data)}
          />
        </div>
      </div>

      {/* Tablet View */}
      <div>
        <h3 className="text-sm font-bold text-gray-600 mb-2">📲 Tablet View</h3>
        <div className="bg-gray-100 p-4 rounded-lg max-w-2xl">
          <CashPaymentForm
            totalAmount={50000}
            onPaymentConfirm={(data) => console.log(data)}
          />
        </div>
      </div>

      {/* Desktop View */}
      <div>
        <h3 className="text-sm font-bold text-gray-600 mb-2">🖥️ Desktop View</h3>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="max-w-4xl mx-auto flex gap-8">
            <div className="flex-1">
              <CashPaymentForm
                totalAmount={50000}
                onPaymentConfirm={(data) => console.log(data)}
              />
            </div>
            <div className="flex-1">
              <CashPaymentForm
                totalAmount={150000}
                onPaymentConfirm={(data) => console.log(data)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  BasicCashPaymentExample,
  CashPaymentWithCancelExample,
  CashPaymentWithLoadingExample,
  CashPaymentWithToastExample,
  CashPaymentModalExample,
  CashPaymentCustomStyledExample,
  CheckoutFlowExample,
  ValidationScenariosExample,
  DarkModeSwitchExample,
  ResponsiveDesignExample,
};
