'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiService, getErrorMessage } from '@/lib/api';
import { RequireRole } from '@/components/RequireRole';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  memberNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  creditBalance: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  transactionDate: string;
  status: string;
}

interface MemberDetailResponse {
  member: Member;
  transactions: Transaction[];
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top-up form state
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNotes, setTopupNotes] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [showTopupForm, setShowTopupForm] = useState(false);

  // Fetch member details
  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.members.get(memberId);
        const data = response.data as MemberDetailResponse;
        setMember(data.member);
        setTransactions(data.transactions);
      } catch (err) {
        setError('Failed to fetch member details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMember();
    }
  }, [memberId]);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(topupAmount);

    if (!amount || amount <= 0) {
      toast.error('Top-up amount must be a positive number');
      return;
    }

    try {
      setTopupLoading(true);
      const response = await apiService.members.topup(memberId, {
        amount,
        notes: topupNotes || null,
      });

      const updatedData = response.data;
      setMember(updatedData.member);
      setTopupAmount('');
      setTopupNotes('');
      setShowTopupForm(false);

      toast.success(`Successfully added ${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount)} to member credit`);

      // Refetch member to get updated transaction history
      const refreshResponse = await apiService.members.get(memberId);
      const refreshData = refreshResponse.data as MemberDetailResponse;
      setTransactions(refreshData.transactions);
    } catch (err) {
      toast.error(getErrorMessage(err));
      console.error(err);
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <RequireRole roles={['OWNER']}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600 dark:text-gray-400">Loading member details...</p>
        </div>
      </RequireRole>
    );
  }

  if (error || !member) {
    return (
      <RequireRole roles={['OWNER']}>
        <div className="space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error || 'Member not found'}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </RequireRole>
    );
  }

  return (
    <RequireRole roles={['OWNER']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{member.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Member ID: {member.memberNumber}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back
          </button>
        </div>

        {/* Member Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Credit Balance */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
            <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Current Credit Balance</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-2">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(member.creditBalance)}
            </p>
          </div>

          {/* Total Spent */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-6">
            <p className="text-sm text-green-600 dark:text-green-300 font-medium">Total Spent</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-400 mt-2">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(member.totalSpent)}
            </p>
          </div>

          {/* Member Since */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900 rounded-lg p-6">
            <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Member Since</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-2">
              {new Date(member.createdAt).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Phone</label>
              <p className="text-gray-900 dark:text-white">{member.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{member.email || '-'}</p>
            </div>
          </div>
        </div>

        {/* Top-up Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Credit Top-up</h2>
            {!showTopupForm && (
              <button
                onClick={() => setShowTopupForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Credit
              </button>
            )}
          </div>

          {showTopupForm && (
            <form onSubmit={handleTopup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top-up Amount (IDR)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={topupNotes}
                  onChange={(e) => setTopupNotes(e.target.value)}
                  placeholder="Enter notes for this top-up"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={topupLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {topupLoading ? 'Processing...' : 'Confirm Top-up'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopupForm(false);
                    setTopupAmount('');
                    setTopupNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Transaction History</h2>

          {transactions.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(transaction.transactionDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(transaction.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
