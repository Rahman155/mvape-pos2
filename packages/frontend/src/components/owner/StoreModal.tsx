'use client';

/**
 * Store Modal Component (Tasks 51-53)
 * Modal for creating and editing stores with form validation
 */

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { apiClient } from '@/lib/apiClient';
import { Store } from '@/types/store';
import { toast } from 'react-hot-toast';

interface StoreModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  store: Store | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  address: string;
  phone: string;
  operatingHours: Record<string, { open: string; close: string }>;
}

interface FormErrors {
  name?: string;
  address?: string;
  phone?: string;
}

export default function StoreModal({
  isOpen,
  mode,
  store,
  onClose,
  onSuccess,
}: StoreModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    phone: '',
    operatingHours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '10:00', close: '17:00' },
    },
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or store changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && store) {
        setFormData({
          name: store.name,
          address: store.address,
          phone: store.phone || '',
          operatingHours: store.operatingHours || formData.operatingHours,
        });
      } else {
        setFormData({
          name: '',
          address: '',
          phone: '',
          operatingHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '18:00' },
            sunday: { open: '10:00', close: '17:00' },
          },
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, store]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Store name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Store address is required';
    }

    if (formData.phone && !/^\d{7,20}$|^[+\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleOperatingHourChange = (
    day: string,
    timeType: 'open' | 'close',
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [timeType]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || undefined,
        operatingHours: formData.operatingHours,
      };

      if (mode === 'create') {
        await apiClient.post('/api/stores', payload);
        toast.success('Store created successfully');
      } else if (mode === 'edit' && store) {
        await apiClient.put(`/api/stores/${store.id}`, payload);
        toast.success('Store updated successfully');
      }

      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Store' : 'Edit Store'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Store Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter store name"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Store Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store Address *
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter store address"
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>

        {/* Store Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Enter store phone number"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        {/* Operating Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Operating Hours
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {days.map(day => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-gray-700 capitalize">
                  {day}:
                </span>
                <input
                  type="time"
                  value={formData.operatingHours[day]?.open || '09:00'}
                  onChange={(e) => handleOperatingHourChange(day, 'open', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={formData.operatingHours[day]?.close || '18:00'}
                  onChange={(e) => handleOperatingHourChange(day, 'close', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {mode === 'create' ? 'Create Store' : 'Update Store'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
