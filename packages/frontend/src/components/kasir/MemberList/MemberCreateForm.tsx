/**
 * Member Creation/Registration Form Component
 * Handles member registration with validation
 *
 * Requirements: 14.2, 14.3 (Member Management)
 * - Form with fields: name (required), phone (required), email (optional)
 * - Validates required fields
 * - Generates unique member ID/number on creation
 * - Stores member in database
 */

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { apiService, getErrorMessage } from '@/lib/api';

export interface MemberCreateFormData {
  name: string;
  phone: string;
  email?: string;
}

export interface MemberCreateFormProps {
  onSuccess?: (memberId: string, memberNumber: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Validation helper
 */
const validateMemberForm = (data: MemberCreateFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validate name (required, not empty after trim)
  if (!data.name || !data.name.trim()) {
    errors.name = 'Member name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Member name must be at least 2 characters';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Member name must not exceed 255 characters';
  }

  // Validate phone (required)
  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (data.phone.trim().length < 7) {
    errors.phone = 'Phone number must be at least 7 digits';
  } else if (data.phone.trim().length > 20) {
    errors.phone = 'Phone number must not exceed 20 characters';
  }

  // Validate email (optional but must be valid if provided)
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Invalid email format';
    } else if (data.email.trim().length > 255) {
      errors.email = 'Email must not exceed 255 characters';
    }
  }

  return errors;
};

/**
 * Member Creation Form Component
 */
export const MemberCreateForm: React.FC<MemberCreateFormProps> = ({
  onSuccess,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<MemberCreateFormData>({
    name: '',
    phone: '',
    email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{
    memberId: string;
    memberNumber: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateMemberForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Prepare data for submission (trim values)
      const submitData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
      };

      // Call API to create member
      const response = await apiService.members.create(submitData);

      if (response.data) {
        setSuccessMessage({
          memberId: response.data.id,
          memberNumber: response.data.memberNumber,
        });

        // Reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
        });

        // Call success callback
        onSuccess?.(response.data.id, response.data.memberNumber);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setErrorMessage(errorMsg);
      console.error('Failed to create member:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
    });
    setErrors({});
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  return (
    <Card>
      <CardHeader
        title="Create New Member"
        description="Register a new member with basic information"
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {errorMessage && (
            <Alert
              variant="error"
              title="Error"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setErrorMessage(null)}
                >
                  Dismiss
                </Button>
              }
            >
              {errorMessage}
            </Alert>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert variant="success" title="Success">
              <div className="space-y-2">
                <p>Member created successfully!</p>
                <p className="font-medium">Member Number: {successMessage.memberNumber}</p>
              </div>
            </Alert>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Member Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter member name"
                error={errors.name}
                disabled={isSubmitting || isLoading}
                required
                maxLength={255}
                className="w-full"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number (e.g., 081234567890)"
                error={errors.phone}
                disabled={isSubmitting || isLoading}
                required
                maxLength={20}
                className="w-full"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
              )}
            </div>

            {/* Email Field (Optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address (optional)"
                error={errors.email}
                disabled={isSubmitting || isLoading}
                maxLength={255}
                className="w-full"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onCancel?.();
              }}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Creating...' : 'Create Member'}
            </Button>
          </div>

          {/* Form Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
            <p>
              <strong>Note:</strong> A unique member ID and number will be automatically generated upon creation.
            </p>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};

export default MemberCreateForm;
