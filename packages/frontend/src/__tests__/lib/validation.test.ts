/**
 * Unit tests for validation utilities
 * Tests all validators, validation rules, and error handling
 */

import {
  validators,
  commonRules,
  validateField,
  validateForm,
  hasErrors,
  ValidationErrors,
  ValidationRules,
} from '@/lib/validation';

describe('Validators', () => {
  describe('required', () => {
    it('should return true for non-empty strings', () => {
      expect(validators.required('hello')).toBe(true);
      expect(validators.required('0')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(validators.required('')).toBe(false);
      expect(validators.required('   ')).toBe(false);
    });

    it('should return true for non-empty arrays', () => {
      expect(validators.required([1, 2, 3])).toBe(true);
      expect(validators.required([''])).toBe(true);
    });

    it('should return false for empty arrays', () => {
      expect(validators.required([])).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(validators.required(null)).toBe(false);
      expect(validators.required(undefined)).toBe(false);
    });

    it('should return true for truthy values', () => {
      expect(validators.required(true)).toBe(true);
      expect(validators.required(1)).toBe(true);
      expect(validators.required({})).toBe(true);
    });
  });

  describe('email', () => {
    it('should validate correct email formats', () => {
      expect(validators.email('test@example.com')).toBe(true);
      expect(validators.email('user.name@example.co.uk')).toBe(true);
      expect(validators.email('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validators.email('invalid')).toBe(false);
      expect(validators.email('@example.com')).toBe(false);
      expect(validators.email('test@')).toBe(false);
      expect(validators.email('test @example.com')).toBe(false);
    });

    it('should allow empty values', () => {
      expect(validators.email('')).toBe(true);
    });
  });

  describe('minLength', () => {
    it('should validate strings with sufficient length', () => {
      const validator = validators.minLength(3);
      expect(validator('hello')).toBe(true);
      expect(validator('abc')).toBe(true);
    });

    it('should reject strings shorter than minimum', () => {
      const validator = validators.minLength(3);
      expect(validator('ab')).toBe(false);
      expect(validator('a')).toBe(false);
    });

    it('should allow empty strings', () => {
      const validator = validators.minLength(3);
      expect(validator('')).toBe(true);
    });
  });

  describe('maxLength', () => {
    it('should validate strings within maximum length', () => {
      const validator = validators.maxLength(5);
      expect(validator('hello')).toBe(true);
      expect(validator('hi')).toBe(true);
    });

    it('should reject strings exceeding maximum', () => {
      const validator = validators.maxLength(5);
      expect(validator('toolong')).toBe(false);
    });

    it('should allow empty strings', () => {
      const validator = validators.maxLength(5);
      expect(validator('')).toBe(true);
    });
  });

  describe('numeric', () => {
    it('should validate numeric values', () => {
      expect(validators.numeric(123)).toBe(true);
      expect(validators.numeric('456')).toBe(true);
      expect(validators.numeric(0)).toBe(true);
      expect(validators.numeric('3.14')).toBe(true);
    });

    it('should reject non-numeric values', () => {
      expect(validators.numeric('abc')).toBe(false);
      expect(validators.numeric('12a34')).toBe(false);
    });

    it('should allow empty values', () => {
      expect(validators.numeric('')).toBe(true);
    });
  });

  describe('min', () => {
    it('should validate numbers equal to or greater than minimum', () => {
      const validator = validators.min(10);
      expect(validator(10)).toBe(true);
      expect(validator(20)).toBe(true);
      expect(validator('15')).toBe(true);
    });

    it('should reject numbers less than minimum', () => {
      const validator = validators.min(10);
      expect(validator(5)).toBe(false);
      expect(validator('9')).toBe(false);
    });

    it('should allow empty values', () => {
      const validator = validators.min(10);
      expect(validator('')).toBe(true);
    });
  });

  describe('max', () => {
    it('should validate numbers equal to or less than maximum', () => {
      const validator = validators.max(100);
      expect(validator(100)).toBe(true);
      expect(validator(50)).toBe(true);
      expect(validator('99')).toBe(true);
    });

    it('should reject numbers greater than maximum', () => {
      const validator = validators.max(100);
      expect(validator(101)).toBe(false);
      expect(validator('150')).toBe(false);
    });

    it('should allow empty values', () => {
      const validator = validators.max(100);
      expect(validator('')).toBe(true);
    });
  });

  describe('phone', () => {
    it('should validate various phone formats', () => {
      expect(validators.phone('+62812345678')).toBe(true);
      expect(validators.phone('0812345678')).toBe(true);
      expect(validators.phone('+62-812-345-678')).toBe(true);
      expect(validators.phone('0812 345 678')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(validators.phone('12345')).toBe(false);
      expect(validators.phone('abc')).toBe(false);
      expect(validators.phone('+1234')).toBe(false);
    });

    it('should allow empty values', () => {
      expect(validators.phone('')).toBe(true);
    });
  });

  describe('url', () => {
    it('should validate valid URLs', () => {
      expect(validators.url('https://example.com')).toBe(true);
      expect(validators.url('http://example.com/path')).toBe(true);
      expect(validators.url('https://sub.example.co.uk')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validators.url('not a url')).toBe(false);
      expect(validators.url('example.com')).toBe(false);
    });

    it('should allow empty values', () => {
      expect(validators.url('')).toBe(true);
    });
  });

  describe('strongPassword', () => {
    it('should validate strong passwords', () => {
      expect(validators.strongPassword('SecurePass123')).toBe(true);
      expect(validators.strongPassword('MyPassword99')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validators.strongPassword('weak')).toBe(false);
      expect(validators.strongPassword('password')).toBe(false);
      expect(validators.strongPassword('Password')).toBe(false);
      expect(validators.strongPassword('password123')).toBe(false);
      expect(validators.strongPassword('PASSWORD123')).toBe(false);
    });

    it('should allow empty values', () => {
      expect(validators.strongPassword('')).toBe(true);
    });
  });

  describe('pattern', () => {
    it('should validate against regex patterns', () => {
      const validator = validators.pattern(/^\d+$/);
      expect(validator('123')).toBe(true);
      expect(validator('abc')).toBe(false);
    });

    it('should allow empty values', () => {
      const validator = validators.pattern(/^\d+$/);
      expect(validator('')).toBe(true);
    });
  });

  describe('custom', () => {
    it('should accept custom validation functions', () => {
      const validator = validators.custom((value) => value === 'valid');
      expect(validator('valid')).toBe(true);
      expect(validator('invalid')).toBe(false);
    });
  });
});

describe('validateField', () => {
  it('should return null when all rules pass', () => {
    const rules = [
      commonRules.required('Test'),
      commonRules.minLength('Test', 2),
    ];
    expect(validateField('hello', rules)).toBeNull();
  });

  it('should return first error message when rule fails', () => {
    const rules = [
      commonRules.required('Test'),
      commonRules.minLength('Test', 10),
    ];
    expect(validateField('hi', rules)).toBe('Test must be at least 10 characters');
  });

  it('should return error for required field', () => {
    const rules = [commonRules.required('Test')];
    expect(validateField('', rules)).toBe('Test is required');
  });

  it('should return error for email validation', () => {
    const rules = [commonRules.email()];
    expect(validateField('invalid', rules)).toBe('Email is not valid');
  });
});

describe('validateForm', () => {
  it('should validate multiple fields', () => {
    const rules: ValidationRules = {
      name: [commonRules.required('Name')],
      email: [commonRules.required('Email'), commonRules.email()],
    };

    const data = { name: '', email: 'invalid' };
    const errors = validateForm(data, rules);

    expect(errors.name).toBe('Name is required');
    expect(errors.email).toBe('Email is not valid');
  });

  it('should return null for valid fields', () => {
    const rules: ValidationRules = {
      name: [commonRules.required('Name')],
      email: [commonRules.required('Email'), commonRules.email()],
    };

    const data = { name: 'John', email: 'john@example.com' };
    const errors = validateForm(data, rules);

    expect(errors.name).toBeNull();
    expect(errors.email).toBeNull();
  });

  it('should handle fields without rules', () => {
    const rules: ValidationRules = {
      name: [commonRules.required('Name')],
    };

    const data = { name: 'John', extra: 'field' };
    const errors = validateForm(data, rules);

    expect(errors.name).toBeNull();
    expect(errors.extra).toBeUndefined();
  });
});

describe('hasErrors', () => {
  it('should return true when errors exist', () => {
    const errors: ValidationErrors = {
      name: 'Required',
      email: null,
    };
    expect(hasErrors(errors)).toBe(true);
  });

  it('should return false when no errors exist', () => {
    const errors: ValidationErrors = {
      name: null,
      email: null,
    };
    expect(hasErrors(errors)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(hasErrors({})).toBe(false);
  });
});
