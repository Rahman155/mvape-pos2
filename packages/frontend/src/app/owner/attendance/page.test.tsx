/**
 * Tests for attendance viewing page (Task 49)
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttendancePage from './page';
import { useAuth } from '@/hooks/useAuth';
import * as apiClient from '@/lib/apiClient';

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock apiClient
jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  username: 'owner1',
  email: 'owner@example.com',
  role: 'OWNER' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAttendanceData = {
  data: {
    attendance: [
      {
        id: 'att-1',
        userId: 'kasir-1',
        username: 'kasir1',
        name: 'Kasir One',
        date: '2024-01-15',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:30:00Z',
        durationMinutes: 510,
        status: 'PRESENT',
      },
      {
        id: 'att-2',
        userId: 'kasir-2',
        username: 'kasir2',
        name: 'Kasir Two',
        date: '2024-01-15',
        clockIn: '2024-01-15T08:30:00Z',
        clockOut: null,
        durationMinutes: null,
        status: 'INCOMPLETE',
      },
    ],
    pagination: {
      total: 2,
      limit: 50,
      offset: 0,
      pages: 1,
    },
  },
};

describe('Attendance Viewing Page (Task 49)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      role: 'OWNER',
      token: 'mock-token',
    });
  });

  describe('Requirement 15.3: Display kasir attendance per day', () => {
    it('should render the attendance page for owner', () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      expect(screen.getByText('Kasir Attendance')).toBeInTheDocument();
      expect(screen.getByText('View kasir clock-in/out times and daily work duration')).toBeInTheDocument();
    });

    it('should display attendance list with kasir names', async () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      await waitFor(() => {
        expect(screen.getByText('Kasir One')).toBeInTheDocument();
        expect(screen.getByText('Kasir Two')).toBeInTheDocument();
      });
    });

    it('should show status for each kasir', async () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      await waitFor(() => {
        expect(screen.getByText('PRESENT')).toBeInTheDocument();
        expect(screen.getByText('INCOMPLETE')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 15.4: Display clock-in and clock-out times with work duration', () => {
    it('should display clock-in times', async () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      await waitFor(() => {
        // Times should be formatted
        expect(screen.getByText(/09:00:00|08:30:00/)).toBeInTheDocument();
      });
    });

    it('should display clock-out times for completed sessions', async () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      await waitFor(() => {
        // First kasir has clock-out
        expect(screen.getByText(/17:30:00/)).toBeInTheDocument();
        // Second kasir should show empty clock-out indicator
        expect(screen.getByText('—')).toBeInTheDocument();
      });
    });

    it('should display calculated work duration', async () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      await waitFor(() => {
        // 510 minutes = 8 hours 30 minutes
        expect(screen.getByText(/8h 30m/)).toBeInTheDocument();
        // Incomplete should show "Incomplete"
        expect(screen.getByText('Incomplete')).toBeInTheDocument();
      });
    });
  });

  describe('Date selection functionality', () => {
    it('should have date filter inputs', () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      render(<AttendancePage />);

      const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('should update API call when date range changes', async () => {
      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(mockAttendanceData);

      const { rerender } = render(<AttendancePage />);

      const startDateInput = screen.getByLabelText('Start Date');
      await userEvent.clear(startDateInput);
      await userEvent.type(startDateInput, '2024-01-20');

      // Wait for API call
      await waitFor(() => {
        expect(apiClient.apiClient.get).toHaveBeenCalled();
      });
    });
  });

  describe('Authorization', () => {
    it('should redirect non-owner users to login', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: 'KASIR' },
        isAuthenticated: true,
        role: 'KASIR',
      });

      render(<AttendancePage />);

      // Should not render the attendance page content
      expect(screen.queryByText('Kasir Attendance')).not.toBeInTheDocument();
    });

    it('should redirect unauthenticated users to login', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        role: null,
      });

      render(<AttendancePage />);

      // Should show loading or nothing
      expect(screen.queryByText('Kasir Attendance')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when multiple pages exist', async () => {
      const multiPageData = {
        data: {
          attendance: mockAttendanceData.data.attendance,
          pagination: {
            ...mockAttendanceData.data.pagination,
            pages: 3,
          },
        },
      };

      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(multiPageData);

      render(<AttendancePage />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message on API failure', async () => {
      const errorMessage = 'Failed to fetch attendance records';
      (apiClient.apiClient.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      render(<AttendancePage />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error message', async () => {
      (apiClient.apiClient.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<AttendancePage />);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByText('API Error')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show message when no records found', async () => {
      const emptyData = {
        data: {
          attendance: [],
          pagination: {
            total: 0,
            limit: 50,
            offset: 0,
            pages: 0,
          },
        },
      };

      (apiClient.apiClient.get as jest.Mock).mockResolvedValue(emptyData);

      render(<AttendancePage />);

      await waitFor(() => {
        expect(screen.getByText('No attendance records found for the selected period')).toBeInTheDocument();
      });
    });
  });
});
