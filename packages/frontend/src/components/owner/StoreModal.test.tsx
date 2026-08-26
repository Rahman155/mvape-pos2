/**
 * Store Modal Component Tests
 * Tests for store creation and editing functionality (Task 52)
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoreModal from './StoreModal';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/apiClient');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockApiClient = apiClient as any;
const mockToast = toast as any;

describe('StoreModal Component (Task 52)', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    isOpen: true,
    mode: 'create' as const,
    store: null,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.post = vi.fn().mockResolvedValue({ data: { id: 'store-123' } });
    mockApiClient.put = vi.fn().mockResolvedValue({ data: { id: 'store-456' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Store Creation Form (Requirement 10.2, 10.3)', () => {
    test('should display create form when mode is "create"', () => {
      render(<StoreModal {...defaultProps} />);

      expect(screen.getByText('Create New Store')).toBeInTheDocument();
      expect(screen.getByText('Create Store')).toBeInTheDocument();
    });

    test('should display all required form fields for store creation', () => {
      render(<StoreModal {...defaultProps} />);

      // Check for all required fields
      expect(screen.getByLabelText('Store Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Store Address *')).toBeInTheDocument();
      expect(screen.getByLabelText('Store Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Operating Hours')).toBeInTheDocument();
    });

    test('should accept store name input', async () => {
      render(<StoreModal {...defaultProps} />);
      const nameInput = screen.getByPlaceholderText('Enter store name') as HTMLInputElement;

      await userEvent.type(nameInput, 'Test Store');

      expect(nameInput.value).toBe('Test Store');
    });

    test('should accept store address input', async () => {
      render(<StoreModal {...defaultProps} />);
      const addressInput = screen.getByPlaceholderText('Enter store address') as HTMLTextAreaElement;

      await userEvent.type(addressInput, '123 Main Street, City, Country');

      expect(addressInput.value).toBe('123 Main Street, City, Country');
    });

    test('should accept store phone input', async () => {
      render(<StoreModal {...defaultProps} />);
      const phoneInput = screen.getByPlaceholderText('Enter store phone number') as HTMLInputElement;

      await userEvent.type(phoneInput, '+62-812-3456-7890');

      expect(phoneInput.value).toBe('+62-812-3456-7890');
    });

    test('should display operating hours for all days of week', () => {
      render(<StoreModal {...defaultProps} />);

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        expect(screen.getByText(new RegExp(day, 'i'))).toBeInTheDocument();
      });
    });

    test('should allow modifying operating hours', async () => {
      render(<StoreModal {...defaultProps} />);

      const timeInputs = screen.getAllByDisplayValue('09:00');
      expect(timeInputs.length).toBeGreaterThan(0);

      // Modify first Monday opening time
      const firstTimeInput = timeInputs[0];
      await userEvent.clear(firstTimeInput);
      await userEvent.type(firstTimeInput, '08:00');

      expect((firstTimeInput as HTMLInputElement).value).toBe('08:00');
    });
  });

  describe('Form Validation (Requirement 10.2)', () => {
    test('should show error when store name is empty', async () => {
      render(<StoreModal {...defaultProps} />);

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Store name is required')).toBeInTheDocument();
      });
    });

    test('should show error when store address is empty', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      await userEvent.type(nameInput, 'Test Store');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Store address is required')).toBeInTheDocument();
      });
    });

    test('should show error for invalid phone number format', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');
      const phoneInput = screen.getByPlaceholderText('Enter store phone number');

      await userEvent.type(nameInput, 'Test Store');
      await userEvent.type(addressInput, '123 Main Street');
      await userEvent.type(phoneInput, 'invalid'); // Invalid format

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
      });
    });

    test('should accept valid phone number formats', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');
      const phoneInput = screen.getByPlaceholderText('Enter store phone number');

      await userEvent.type(nameInput, 'Test Store');
      await userEvent.type(addressInput, '123 Main Street');
      await userEvent.type(phoneInput, '+62-812-3456-7890'); // Valid format

      // No error should be shown for valid phone
      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        // Check that API was called (validation passed)
        expect(mockApiClient.post).toHaveBeenCalled();
      });
    });

    test('should trim whitespace from inputs', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, '  Test Store  ');
      await userEvent.type(addressInput, '  123 Main Street  ');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/stores',
          expect.objectContaining({
            name: 'Test Store',
            address: '123 Main Street',
          })
        );
      });
    });

    test('should clear field errors when user corrects them', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');

      // Trigger error
      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Store name is required')).toBeInTheDocument();
      });

      // Fix the error
      await userEvent.type(nameInput, 'Test Store');

      // Error should be cleared
      expect(screen.queryByText('Store name is required')).not.toBeInTheDocument();
    });
  });

  describe('Store Creation Flow (Requirement 10.3)', () => {
    test('should call API with correct payload for store creation', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');
      const phoneInput = screen.getByPlaceholderText('Enter store phone number');

      await userEvent.type(nameInput, 'New Store');
      await userEvent.type(addressInput, '456 Oak Avenue');
      await userEvent.type(phoneInput, '+62-812-1111-2222');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/stores',
          expect.objectContaining({
            name: 'New Store',
            address: '456 Oak Avenue',
            phone: '+62-812-1111-2222',
            operatingHours: expect.any(Object),
          })
        );
      });
    });

    test('should show success toast on successful store creation', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'New Store');
      await userEvent.type(addressInput, '456 Oak Avenue');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Store created successfully');
      });
    });

    test('should call onSuccess callback after successful store creation', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'New Store');
      await userEvent.type(addressInput, '456 Oak Avenue');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    test('should disable submit button while loading', async () => {
      // Make API call take longer
      mockApiClient.post = vi.fn(() => new Promise(resolve => setTimeout(() => resolve({ data: { id: 'store-123' } }), 1000)));

      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'New Store');
      await userEvent.type(addressInput, '456 Oak Avenue');

      const submitButton = screen.getByText('Create Store') as HTMLButtonElement;
      await userEvent.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton.disabled).toBe(true);
    });

    test('should show error toast on API failure', async () => {
      const errorMessage = 'Network error';
      mockApiClient.post = vi.fn().mockRejectedValue(new Error(errorMessage));

      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'New Store');
      await userEvent.type(addressInput, '456 Oak Avenue');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    test('should not call onSuccess on API failure', async () => {
      mockApiClient.post = vi.fn().mockRejectedValue(new Error('API Error'));

      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'New Store');
      await userEvent.type(addressInput, '456 Oak Avenue');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Store Editing Flow', () => {
    const mockStore = {
      id: 'store-456',
      name: 'Existing Store',
      address: '789 Pine Street',
      phone: '+62-812-9999-8888',
      logoUrl: null,
      operatingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '18:00' },
        sunday: { open: '10:00', close: '17:00' },
      },
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    test('should display edit form when mode is "edit"', () => {
      render(
        <StoreModal
          {...defaultProps}
          mode="edit"
          store={mockStore}
        />
      );

      expect(screen.getByText('Edit Store')).toBeInTheDocument();
      expect(screen.getByText('Update Store')).toBeInTheDocument();
    });

    test('should pre-fill form with existing store data', () => {
      render(
        <StoreModal
          {...defaultProps}
          mode="edit"
          store={mockStore}
        />
      );

      expect((screen.getByPlaceholderText('Enter store name') as HTMLInputElement).value).toBe('Existing Store');
      expect((screen.getByPlaceholderText('Enter store address') as HTMLTextAreaElement).value).toBe('789 Pine Street');
      expect((screen.getByPlaceholderText('Enter store phone number') as HTMLInputElement).value).toBe('+62-812-9999-8888');
    });

    test('should call API with PUT method for store update', async () => {
      render(
        <StoreModal
          {...defaultProps}
          mode="edit"
          store={mockStore}
        />
      );

      const nameInput = screen.getByPlaceholderText('Enter store name') as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Store Name');

      const submitButton = screen.getByText('Update Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          `/api/stores/${mockStore.id}`,
          expect.objectContaining({
            name: 'Updated Store Name',
            address: mockStore.address,
          })
        );
      });
    });

    test('should show success toast on successful store update', async () => {
      render(
        <StoreModal
          {...defaultProps}
          mode="edit"
          store={mockStore}
        />
      );

      const nameInput = screen.getByPlaceholderText('Enter store name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Store');

      const submitButton = screen.getByText('Update Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Store updated successfully');
      });
    });
  });

  describe('Form Interactions', () => {
    test('should close modal when cancel button is clicked', async () => {
      render(<StoreModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should reset form when modal is closed and reopened', async () => {
      const { rerender } = render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      await userEvent.type(nameInput, 'Test Store');

      // Close modal
      rerender(<StoreModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<StoreModal {...defaultProps} isOpen={true} />);

      // Form should be reset
      expect((screen.getByPlaceholderText('Enter store name') as HTMLInputElement).value).toBe('');
    });

    test('should not submit form if validation fails', async () => {
      render(<StoreModal {...defaultProps} />);

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).not.toHaveBeenCalled();
      });
    });
  });

  describe('Phone Number Validation', () => {
    test('should accept numeric-only phone numbers', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');
      const phoneInput = screen.getByPlaceholderText('Enter store phone number');

      await userEvent.type(nameInput, 'Test Store');
      await userEvent.type(addressInput, '123 Main Street');
      await userEvent.type(phoneInput, '6281234567890'); // Numeric only

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalled();
      });
    });

    test('should accept phone numbers with formatting characters', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');
      const phoneInput = screen.getByPlaceholderText('Enter store phone number');

      await userEvent.type(nameInput, 'Test Store');
      await userEvent.type(addressInput, '123 Main Street');
      await userEvent.type(phoneInput, '+62 (812) 3456-7890'); // With formatting

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalled();
      });
    });

    test('should allow phone field to be optional', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'Test Store');
      await userEvent.type(addressInput, '123 Main Street');
      // Don't fill phone

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/stores',
          expect.objectContaining({
            phone: undefined,
          })
        );
      });
    });
  });

  describe('Operating Hours', () => {
    test('should include operating hours in the API request', async () => {
      render(<StoreModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter store name');
      const addressInput = screen.getByPlaceholderText('Enter store address');

      await userEvent.type(nameInput, 'Test Store');
      await userEvent.type(addressInput, '123 Main Street');

      const submitButton = screen.getByText('Create Store');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/stores',
          expect.objectContaining({
            operatingHours: expect.objectContaining({
              monday: expect.any(Object),
              sunday: expect.any(Object),
            }),
          })
        );
      });
    });
  });
});
