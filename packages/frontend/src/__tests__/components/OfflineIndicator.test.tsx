/**
 * Tests for OfflineIndicator component
 * Tests rendering, status display, and user interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { OnlineStatus } from '@/types';
import * as useOnlineStatusHook from '@/hooks/useOnlineStatus';

// Mock the useOnlineStatus hook
jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: jest.fn(),
}));

describe('OfflineIndicator', () => {
  let mockUseOnlineStatus: jest.Mock;

  const defaultMockState = {
    status: OnlineStatus.Online,
    isOnline: true,
    isOffline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    lastError: null,
    triggerSync: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnlineStatus = useOnlineStatusHook.useOnlineStatus as jest.Mock;
    mockUseOnlineStatus.mockReturnValue(defaultMockState);
  });

  describe('Visibility', () => {
    it('should not render when online and onlyShowOffline is true', () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Online,
      });

      const { container } = render(<OfflineIndicator onlyShowOffline={true} />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.parentElement?.style.display).not.toBe('block');
    });

    it('should render when online and onlyShowOffline is false', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Online,
      });

      render(<OfflineIndicator onlyShowOffline={false} />);

      await waitFor(() => {
        expect(screen.getByText('Back online')).toBeInTheDocument();
      });
    });

    it('should render when offline regardless of onlyShowOffline', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      render(<OfflineIndicator onlyShowOffline={true} />);

      await waitFor(() => {
        expect(screen.getByText('You are offline')).toBeInTheDocument();
      });
    });

    it('should render when syncing', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
        isSyncing: true,
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
      });
    });

    it('should render when sync error occurs', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Network timeout',
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });
  });

  describe('Content Display', () => {
    it('should display offline message with custom text', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      render(
        <OfflineIndicator offlineText="No internet connection" />
      );

      await waitFor(() => {
        expect(screen.getByText('No internet connection')).toBeInTheDocument();
      });
    });

    it('should display syncing message with custom text', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
      });

      render(
        <OfflineIndicator syncingText="Uploading data..." />
      );

      await waitFor(() => {
        expect(screen.getByText('Uploading data...')).toBeInTheDocument();
      });
    });

    it('should display sync error message with custom text', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Connection failed',
      });

      render(
        <OfflineIndicator syncErrorText="Upload failed" />
      );

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('should display error details when available', async () => {
      const errorMessage = 'Server returned 500 error';
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: errorMessage,
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Pending Changes Display', () => {
    it('should not display pending count by default', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
        pendingChanges: 3,
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.queryByText(/3 changes/)).not.toBeInTheDocument();
      });
    });

    it('should display pending count when showPendingCount is true', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
        pendingChanges: 3,
      });

      render(<OfflineIndicator showPendingCount={true} />);

      await waitFor(() => {
        expect(screen.getByText(/3 changes waiting to sync/)).toBeInTheDocument();
      });
    });

    it('should use singular "change" for single pending change', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
        pendingChanges: 1,
      });

      render(<OfflineIndicator showPendingCount={true} />);

      await waitFor(() => {
        expect(screen.getByText(/1 change waiting to sync/)).toBeInTheDocument();
      });
    });

    it('should display syncing count when syncing', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
        isSyncing: true,
        pendingChanges: 5,
      });

      render(<OfflineIndicator showPendingCount={true} showSyncStatus={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Syncing 5 changes/)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle retry button click', async () => {
      const triggerSync = jest.fn();
      const clearError = jest.fn();

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Network error',
        triggerSync,
        clearError,
      });

      render(<OfflineIndicator />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(clearError).toHaveBeenCalled();
      expect(triggerSync).toHaveBeenCalled();
    });

    it('should handle dismiss button click', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Online,
      });

      const { container } = render(<OfflineIndicator />);

      await waitFor(() => {
        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        fireEvent.click(dismissButton);

        // After dismiss, component should not be visible
        const indicator = container.querySelector('[role="status"]');
        expect(indicator?.parentElement?.style.display).toBe('none');
      });
    });

    it('should call clearError when dismissing error', async () => {
      const clearError = jest.fn();

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Error',
        clearError,
      });

      render(<OfflineIndicator />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(clearError).toHaveBeenCalled();
    });
  });

  describe('Position Styling', () => {
    it('should apply top position class by default', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      const { container } = render(<OfflineIndicator />);

      await waitFor(() => {
        const div = container.querySelector('[role="status"]')?.parentElement;
        expect(div?.className).toContain('top-0');
      });
    });

    it('should apply bottom position class when specified', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      const { container } = render(<OfflineIndicator position="bottom" />);

      await waitFor(() => {
        const div = container.querySelector('[role="status"]')?.parentElement;
        expect(div?.className).toContain('bottom-0');
      });
    });
  });

  describe('Auto-Dismiss', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should auto-dismiss after specified timeout for sync errors', async () => {
      const clearError = jest.fn();

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Error',
        clearError,
      });

      const { container, rerender } = render(
        <OfflineIndicator autoDismissTimeout={3000} />
      );

      // Initially visible
      let indicator = container.querySelector('[role="status"]');
      expect(indicator).toBeInTheDocument();

      // Fast-forward time
      jest.advanceTimersByTime(3000);

      // Rerender to see updated state
      rerender(<OfflineIndicator autoDismissTimeout={3000} />);

      // Give React time to process
      await waitFor(() => {
        expect(clearError).toHaveBeenCalled();
      });
    });

    it('should not auto-dismiss when timeout is 0', async () => {
      const clearError = jest.fn();

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Error',
        clearError,
      });

      render(<OfflineIndicator autoDismissTimeout={0} />);

      jest.advanceTimersByTime(5000);

      expect(clearError).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have status role for screen readers', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toBeInTheDocument();
      });
    });

    it('should have aria-live polite for updates', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have aria-atomic for complete message', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toHaveAttribute('aria-atomic', 'true');
      });
    });

    it('should have accessible button labels', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Error',
      });

      render(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should display different icons for different states', async () => {
      const { container: offlineContainer } = render(
        <OfflineIndicator />
      );

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      // Offline should have WiFi icon

      const { container: syncingContainer } = render(
        <OfflineIndicator />
      );

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
      });

      // Syncing should have spinner icon
      expect(syncingContainer.querySelector('svg')).toHaveClass('animate-spin');
    });

    it('should apply different color styles for different states', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      const { container } = render(<OfflineIndicator />);

      await waitFor(() => {
        const div = container.querySelector('[role="status"]')?.parentElement;
        expect(div?.className).toContain('bg-red-50');
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', async () => {
      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });

      const { container } = render(
        <OfflineIndicator className="custom-class" />
      );

      await waitFor(() => {
        const div = container.querySelector('[role="status"]')?.parentElement;
        expect(div?.className).toContain('custom-class');
      });
    });
  });

  describe('Status Transitions', () => {
    it('should handle transition from offline to syncing', async () => {
      const { rerender } = render(<OfflineIndicator />);

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Offline,
      });
      rerender(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('You are offline')).toBeInTheDocument();
      });

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
        isSyncing: true,
      });
      rerender(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
      });
    });

    it('should handle transition from syncing to online', async () => {
      const { rerender } = render(<OfflineIndicator />);

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
        isSyncing: true,
      });
      rerender(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
      });

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Online,
      });
      rerender(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('Back online')).toBeInTheDocument();
      });
    });

    it('should handle transition from sync to error', async () => {
      const { rerender } = render(<OfflineIndicator />);

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.Syncing,
        isSyncing: true,
      });
      rerender(<OfflineIndicator />);

      mockUseOnlineStatus.mockReturnValue({
        ...defaultMockState,
        status: OnlineStatus.SyncError,
        lastError: 'Failed',
      });
      rerender(<OfflineIndicator />);

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });
  });
});
