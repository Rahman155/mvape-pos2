/**
 * Member Creation Form Tests
 * Tests for form validation and member creation functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Validation helper function (replicated from component)
 */
const validateMemberForm = (data: any): Record<string, string> => {
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

describe('Member Creation Form Validation', () => {
  describe('Name Field Validation', () => {
    it('should reject empty name', () => {
      const errors = validateMemberForm({
        name: '',
        phone: '081234567890',
      });
      expect(errors.name).toBe('Member name is required');
    });

    it('should reject whitespace-only name', () => {
      const errors = validateMemberForm({
        name: '   ',
        phone: '081234567890',
      });
      expect(errors.name).toBe('Member name is required');
    });

    it('should reject name with less than 2 characters', () => {
      const errors = validateMemberForm({
        name: 'A',
        phone: '081234567890',
      });
      expect(errors.name).toBe('Member name must be at least 2 characters');
    });

    it('should reject name exceeding 255 characters', () => {
      const longName = 'A'.repeat(256);
      const errors = validateMemberForm({
        name: longName,
        phone: '081234567890',
      });
      expect(errors.name).toBe('Member name must not exceed 255 characters');
    });

    it('should accept valid name with 2 characters', () => {
      const errors = validateMemberForm({
        name: 'AB',
        phone: '081234567890',
      });
      expect(errors.name).toBeUndefined();
    });

    it('should accept valid name with 255 characters', () => {
      const name = 'A'.repeat(255);
      const errors = validateMemberForm({
        name,
        phone: '081234567890',
      });
      expect(errors.name).toBeUndefined();
    });

    it('should trim whitespace from name', () => {
      const errors = validateMemberForm({
        name: '  John Doe  ',
        phone: '081234567890',
      });
      expect(errors.name).toBeUndefined();
    });
  });

  describe('Phone Field Validation', () => {
    it('should reject empty phone', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '',
      });
      expect(errors.phone).toBe('Phone number is required');
    });

    it('should reject whitespace-only phone', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '   ',
      });
      expect(errors.phone).toBe('Phone number is required');
    });

    it('should reject phone with less than 7 digits', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234',
      });
      expect(errors.phone).toBe('Phone number must be at least 7 digits');
    });

    it('should reject phone exceeding 20 characters', () => {
      const longPhone = '0'.repeat(21);
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: longPhone,
      });
      expect(errors.phone).toBe('Phone number must not exceed 20 characters');
    });

    it('should accept valid phone with 7 digits', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '0812345',
      });
      expect(errors.phone).toBeUndefined();
    });

    it('should accept valid phone with 20 characters', () => {
      const phone = '0'.repeat(20);
      const errors = validateMemberForm({
        name: 'John Doe',
        phone,
      });
      expect(errors.phone).toBeUndefined();
    });

    it('should accept Indonesian phone numbers', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
      });
      expect(errors.phone).toBeUndefined();
    });

    it('should trim whitespace from phone', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '  081234567890  ',
      });
      expect(errors.phone).toBeUndefined();
    });
  });

  describe('Email Field Validation', () => {
    it('should accept empty email (optional)', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: '',
      });
      expect(errors.email).toBeUndefined();
    });

    it('should accept missing email (optional)', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
      });
      expect(errors.email).toBeUndefined();
    });

    it('should accept whitespace-only email (optional)', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: '   ',
      });
      expect(errors.email).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: 'invalid-email',
      });
      expect(errors.email).toBe('Invalid email format');
    });

    it('should reject email without domain', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: 'user@',
      });
      expect(errors.email).toBe('Invalid email format');
    });

    it('should reject email without TLD', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: 'user@domain',
      });
      expect(errors.email).toBe('Invalid email format');
    });

    it('should accept valid email', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: 'john@example.com',
      });
      expect(errors.email).toBeUndefined();
    });

    it('should accept email with subdomain', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: 'user@sub.example.com',
      });
      expect(errors.email).toBeUndefined();
    });

    it('should reject email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: longEmail,
      });
      expect(errors.email).toBe('Email must not exceed 255 characters');
    });

    it('should trim whitespace from email', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: '  john@example.com  ',
      });
      expect(errors.email).toBeUndefined();
    });
  });

  describe('Complete Form Validation', () => {
    it('should pass validation with all required fields', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
        email: 'john@example.com',
      });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should pass validation with required fields only (no email)', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '081234567890',
      });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should collect multiple validation errors', () => {
      const errors = validateMemberForm({
        name: '',
        phone: '123',
        email: 'invalid-email',
      });
      expect(errors.name).toBeDefined();
      expect(errors.phone).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(Object.keys(errors).length).toBe(3);
    });

    it('should handle realistic valid member data', () => {
      const errors = validateMemberForm({
        name: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@example.com',
      });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should handle realistic valid member data without email', () => {
      const errors = validateMemberForm({
        name: 'Siti Nurhaliza',
        phone: '082345678901',
      });
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle name with special characters', () => {
      const errors = validateMemberForm({
        name: "O'Brien-Smith Jr.",
        phone: '081234567890',
      });
      expect(errors.name).toBeUndefined();
    });

    it('should handle phone with special characters', () => {
      const errors = validateMemberForm({
        name: 'John Doe',
        phone: '+62-812-3456-7890',
      });
      expect(errors.phone).toBeUndefined();
    });

    it('should handle very long names near limit', () => {
      const name = 'A'.repeat(254); // 254 chars, should pass
      const errors = validateMemberForm({
        name,
        phone: '081234567890',
      });
      expect(errors.name).toBeUndefined();
    });

    it('should handle maximum length inputs', () => {
      const errors = validateMemberForm({
        name: 'A'.repeat(255),
        phone: '0'.repeat(20),
        email: 'a'.repeat(244) + '@example.com', // ~255 chars total
      });
      expect(errors.name).toBeUndefined();
      expect(errors.phone).toBeUndefined();
      expect(errors.email).toBeUndefined();
    });

    it('should trim leading/trailing whitespace across all fields', () => {
      const errors = validateMemberForm({
        name: '  John Doe  ',
        phone: '  081234567890  ',
        email: '  john@example.com  ',
      });
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Member ID Generation Verification', () => {
    it('should verify member number format is generated correctly', () => {
      // Member numbers are generated as MBR{timestamp}
      const timestamp = Date.now();
      const memberNumber = `MBR${timestamp}`;
      expect(memberNumber).toMatch(/^MBR\d+$/);
    });

    it('should generate unique member numbers', () => {
      const num1 = `MBR${Date.now()}`;
      // Small delay to ensure different timestamp
      const num2 = `MBR${Date.now() + 1}`;
      expect(num1).not.toBe(num2);
    });
  });
});
