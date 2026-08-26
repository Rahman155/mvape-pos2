'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { formatDateForDisplay, formatTime } from '@/utils/formatters';
import Link from 'next/link';

interface AttendanceRecord {
  id: string;
  userId: string;
  username: string;
  name: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  status: string;
}

interface AttendancePagination {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

interface AttendanceResponse {
  data: {
    attendance: AttendanceRecord[];
    pagination: AttendancePagination;
  };
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<AttendancePagination>({
    total: 0,
    limit: 50,
    offset: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);

  // Initialize with default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Check authorization
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'OWNER') {
      router.push('/login');
    }
  }, [user, isAuthenticated, router]);

  // Fetch attendance records
  useEffect(() => {
    if (!user || user.role !== 'OWNER' || !startDate || !endDate) {
      return;
    }

    fetchAttendance();
  }, [user, startDate, endDate, currentPage]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', pagination.limit.toString());
      params.append('offset', (currentPage * pagination.limit).toString());

      const response = await apiClient.get<AttendanceResponse>(
        `/api/v1/attendance?${params.toString()}`
      );

      setAttendance(response.data.attendance);
      setPagination(response.data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance records';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    setCurrentPage(0); // Reset pagination
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.pages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) {
      return 'Incomplete';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== 'OWNER') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/owner" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Owner Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kasir Attendance</h1>
          <p className="text-gray-600">View kasir clock-in/out times and daily work duration</p>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader title="Filter Attendance Records" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchAttendance}
                  disabled={loading || !startDate || !endDate}
                  className="w-full"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Error Display */}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Attendance Records */}
        <Card>
          <CardHeader
            title="Attendance Records"
            description={`Showing ${pagination.offset + 1} to ${Math.min(pagination.offset + pagination.limit, pagination.total)} of ${pagination.total} records`}
          />
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No attendance records found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kasir</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Clock In</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Clock Out</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{record.name}</p>
                            <p className="text-xs text-gray-500">{record.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDateForDisplay(new Date(record.date))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatTime(new Date(record.clockIn))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.clockOut ? formatTime(new Date(record.clockOut)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              record.durationMinutes === null
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {formatDuration(record.durationMinutes)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              record.status === 'PRESENT'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'ABSENT'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage + 1} of {pagination.pages}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePrevPage}
                  disabled={loading || currentPage === 0}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextPage}
                  disabled={loading || currentPage >= pagination.pages - 1}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
