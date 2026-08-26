/**
 * PaymentMethodSelector Component Examples
 * Demonstrates how to use the payment method selector in various scenarios
 */

import React, { useState, useEffect } from 'react';
import { PaymentMethodSelector, PaymentData } from './PaymentMethodSelector';
import { Member } from '@/types';

/**
 * Example 1: Basic Usage with Cart Total
 */
export function BasicExample() {
  const handlePaymentSelect = (paymentData: PaymentData) => {
    console.log('Payment selected:', paymentData);
    // Proceed to transaction confirmation
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="mb-4 text-2xl font-bold">Basic Payment Selector</h2>
      <PaymentMethodSelector
        cartTotal={150000}
        onPaymentSelect={handlePaymentSelect}
      />
    </div>
  );
}

/**
 * Example 2: With Member List and Callbacks
 */
export function WithMembersExample() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);

  // Simulate loading members from API
  useEffect(() => {
    setIsLoading(true);
    // In real app: fetchMembers()
    setTimeout(() => {
      setMembers([
        {
          id: '1',
          memberNumber: 'M001',
          name: 'Budi Santoso',
          phone: '081234567890',
          email: 'budi@example.com',
          creditBalance: 500000,
          totalSpent: 2000000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          memberNumber: 'M002',
          name: 'Siti Nurhaliza',
          phone: '082345678901',
          email: 'siti@example.com',
          creditBalance: 250000,
          totalSpent: 1500000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handlePaymentSelect = (paymentData: PaymentData) => {
    console.log('Payment confirmed:', paymentData);
    setSelectedPayment(paymentData);
    // In real app: processPayment(paymentData)
  };

  const handleCancel = () => {
    console.log('Payment cancelled');
    setSelectedPayment(null);
  };

  if (selectedPayment) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
          <h3 className="text-lg font-bold text-green-700 dark:text-green-400">
            ✓ Pembayaran Berhasil Dipilih
          </h3>
          <pre className="mt-4 rounded bg-white p-4 text-sm dark:bg-gray-800">
            {JSON.stringify(selectedPayment, null, 2)}
          </pre>
          <button
            onClick={() => setSelectedPayment(null)}
            className="mt-4 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Kembali ke Pembayaran
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="mb-4 text-2xl font-bold">Payment with Members</h2>
      {isLoading ? (
        <div className="text-center text-gray-500">Loading members...</div>
      ) : (
        <PaymentMethodSelector
          cartTotal={325000}
          members={members}
          onPaymentSelect={handlePaymentSelect}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

/**
 * Example 3: Complete Checkout Flow
 */
export function CheckoutFlowExample() {
  const cartItems = [
    { id: 1, name: 'Liquid Vape 30ml', quantity: 2, price: 50000 },
    { id: 2, name: 'Cotton', quantity: 1, price: 15000 },
    { id: 3, name: 'Coil RTA', quantity: 1, price: 45000 },
  ];

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      memberNumber: 'M001',
      name: 'Ahmad Wijaya',
      phone: '089876543210',
      email: 'ahmad@example.com',
      creditBalance: 300000,
      totalSpent: 3500000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const [checkout, setCheckout] = useState<{
    step: 'cart' | 'payment' | 'confirmation';
    paymentData?: PaymentData;
  }>({ step: 'payment' });

  const handlePaymentSelect = (paymentData: PaymentData) => {
    setCheckout({ step: 'confirmation', paymentData });
  };

  const handleConfirm = () => {
    console.log('Transaction confirmed with:', checkout.paymentData);
    // Submit to API
    alert('Transaksi berhasil diproses!');
    setCheckout({ step: 'payment' });
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">Checkout</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Cart Summary */}
          <div className="md:col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Keranjang Belanja</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-blue-600 dark:text-blue-400">
                  Rp {cartTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="md:col-span-2">
            {checkout.step === 'payment' && (
              <PaymentMethodSelector
                cartTotal={cartTotal}
                members={members}
                onPaymentSelect={handlePaymentSelect}
                onCancel={() => console.log('Checkout cancelled')}
              />
            )}

            {checkout.step === 'confirmation' && checkout.paymentData && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-700 dark:bg-green-900/20">
                <h3 className="mb-4 text-lg font-bold text-green-700 dark:text-green-400">
                  Konfirmasi Pembayaran
                </h3>

                <div className="space-y-3 rounded-lg bg-white p-4 dark:bg-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Metode Pembayaran:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {checkout.paymentData.method === 'CASH' && 'Tunai'}
                      {checkout.paymentData.method === 'MEMBER_CREDIT' && 'Member Credit'}
                      {checkout.paymentData.method === 'TEMPO' && 'Tempo'}
                    </span>
                  </div>

                  {checkout.paymentData.cash && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Jumlah Diterima:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Rp {checkout.paymentData.cash.amountReceived.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Kembalian:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Rp {checkout.paymentData.cash.change.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </>
                  )}

                  {checkout.paymentData.memberCredit && (
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Member:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {checkout.paymentData.memberCredit.memberName}
                      </span>
                    </div>
                  )}

                  {checkout.paymentData.tempo && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Pelanggan:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {checkout.paymentData.tempo.customerName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Jatuh Tempo:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(checkout.paymentData.tempo.dueDate).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setCheckout({ step: 'payment' })}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Ubah Metode Pembayaran
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                  >
                    Konfirmasi & Proses
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 4: With Loading and Error States
 */
export function LoadingAndErrorExample() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentSelect = async (paymentData: PaymentData) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate random error for demo
      if (Math.random() > 0.7) {
        throw new Error('Gagal memproses pembayaran. Silakan coba lagi.');
      }

      console.log('Payment processed successfully:', paymentData);
      alert('Pembayaran berhasil diproses!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="mb-4 text-2xl font-bold">Payment with Loading State</h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <PaymentMethodSelector
        cartTotal={500000}
        onPaymentSelect={handlePaymentSelect}
        isProcessing={isProcessing}
      />
    </div>
  );
}

/**
 * Export all examples
 */
export const examples = {
  BasicExample,
  WithMembersExample,
  CheckoutFlowExample,
  LoadingAndErrorExample,
};
