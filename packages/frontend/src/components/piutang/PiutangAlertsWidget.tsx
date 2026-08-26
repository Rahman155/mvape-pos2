/**
 * Piutang Alerts Widget (Task 77)
 * Dashboard widget showing upcoming and overdue piutang reminders
 * 
 * Requirements: 18.8
 * - Display alerts for piutang near due date (within 7 days)
 * - Display alerts for overdue piutang (past due date)
 * - Include customer name, amount, due date, priority
 */

'use client';

import { useState, useEffect } from 'react';

interface PiutangAlert {
  id: string;
  transactionId: string | null;
  memberId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  amount: number;
  remainingBalance: number;
  dueDate: string | null;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  daysUntilDue?: number;
  daysOverdue?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertStats {
  upcoming: number;
  overdue: number;
  total: number;
}

export default function PiutangAlertsWidget() {
  const [upcomingAlerts, setUpcomingAlerts] = useState<PiutangAlert[]>([]);
  const [overdueAlerts, setOverdueAlerts] = useState<PiutangAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({ upcoming: 0, overdue: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);

        // Fetch upcoming alerts
        const upcomingRes = await fetch('/api/piutang/alerts/upcoming');
        if (upcomingRes.ok) {
          const upcomingData = await upcomingRes.json();
          setUpcomingAlerts(upcomingData.data || []);
        }

        // Fetch overdue alerts
        const overdueRes = await fetch('/api/piutang/alerts/overdue');
        if (overdueRes.ok) {
          const overdueData = await overdueRes.json();
          setOverdueAlerts(overdueData.data || []);
        }

        // Update stats
        setStats({
          upcoming: upcomingAlerts.length,
          overdue: overdueAlerts.length,
          total: (upcomingAlerts.length || 0) + (overdueAlerts.length || 0),
        });
      } catch (error) {
        console.error('Error fetching piutang alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Poll for updates every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: string | null | Date) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const getPriority = (days: number | undefined): 'critical' | 'warning' | 'normal' => {
    if (days === undefined) return 'normal';
    if (days < 0) return 'critical'; // Overdue
    if (days <= 3) return 'critical'; // Due within 3 days
    if (days <= 7) return 'warning'; // Due within 7 days
    return 'normal';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      default:
        return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading alerts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Pengingat Piutang</h2>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 border-b bg-gray-50 md:grid-cols-3">
        <div className="border-r px-4 py-3">
          <p className="text-xs text-gray-600">Total Piutang Aktif</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="border-r px-4 py-3">
          <p className="text-xs text-yellow-600 font-medium">Akan Jatuh Tempo</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.upcoming}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-red-600 font-medium">Terlambat</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 px-6 py-3 text-center font-medium ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-yellow-500 text-yellow-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Akan Jatuh Tempo ({stats.upcoming})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex-1 px-6 py-3 text-center font-medium ${
            activeTab === 'overdue'
              ? 'border-b-2 border-red-500 text-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Terlambat ({stats.overdue})
        </button>
      </div>

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'upcoming' ? (
          upcomingAlerts.length === 0 ? (
            <div className="flex items-center justify-center px-6 py-8">
              <p className="text-gray-500">Tidak ada piutang yang akan jatuh tempo</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingAlerts.map((alert) => {
                const priority = getPriority(alert.daysUntilDue);
                return (
                  <div key={alert.id} className={`p-4 ${getPriorityColor(priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{alert.customerName}</h3>
                        <p className="text-sm text-gray-600">{alert.customerPhone}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {formatCurrency(alert.remainingBalance)}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              alert.daysUntilDue === 0
                                ? 'text-red-600'
                                : alert.daysUntilDue! <= 3
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {alert.daysUntilDue === 0
                              ? 'Hari ini'
                              : `${alert.daysUntilDue} hari`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={`/owner/piutang/${alert.id}`}
                        className="flex-1 rounded px-2 py-1 text-center text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        Lihat Detail
                      </a>
                      <button className="flex-1 rounded bg-blue-500 px-2 py-1 text-center text-xs font-medium text-white hover:bg-blue-600">
                        Catat Pembayaran
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : overdueAlerts.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-8">
            <p className="text-gray-500">Tidak ada piutang yang terlambat</p>
          </div>
        ) : (
          <div className="divide-y">
            {overdueAlerts.map((alert) => {
              return (
                <div key={alert.id} className={`p-4 ${getPriorityColor('critical')}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{alert.customerName}</h3>
                      <p className="text-sm text-gray-600">{alert.customerPhone}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(alert.remainingBalance)}
                        </span>
                        <span className="text-xs font-semibold text-red-600">
                          {alert.daysOverdue} hari terlambat
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/owner/piutang/${alert.id}`}
                      className="flex-1 rounded px-2 py-1 text-center text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Lihat Detail
                    </a>
                    <button className="flex-1 rounded bg-red-500 px-2 py-1 text-center text-xs font-medium text-white hover:bg-red-600">
                      Hubungi Pelanggan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 bg-gray-50">
        <a href="/owner/piutang" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Lihat Semua Piutang →
        </a>
      </div>
    </div>
  );
}
