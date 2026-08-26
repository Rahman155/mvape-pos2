/**
 * Field validation utilities for form validation
 * Supports real-time validation with comprehensive rules
 */

export type ValidationRule = {
  rule: (value: any) => boolean;
  message: string;
};

export type ValidationRules = {
  [key: string]: ValidationRule[];
};

export type ValidationErrors = {
  [key: string]: string | null;
};

/**
 * Common validators
 */
export const validators = {
  /**
   * Check if field is required (non-empty)
   */
  required: (value: any): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== undefined;
  },

  /**
   * Validate email format
   */
  email: (value: string): boolean => {
    if (!value) return true; // Allow empty if not required
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  /**
   * Validate minimum length
   */
  minLength: (min: number) => (value: string): boolean => {
    if (!value) return true;
    return value.length >= min;
  },

  /**
   * Validate maximum length
   */
  maxLength: (max: number) => (value: string): boolean => {
    if (!value) return true;
    return value.length <= max;
  },

  /**
   * Validate numeric value
   */
  numeric: (value: any): boolean => {
    if (!value) return true;
    return !isNaN(Number(value));
  },

  /**
   * Validate minimum numeric value
   */
  min: (min: number) => (value: number | string): boolean => {
    if (!value) return true;
    return Number(value) >= min;
  },

  /**
   * Validate maximum numeric value
   */
  max: (max: number) => (value: number | string): boolean => {
    if (!value) return true;
    return Number(value) <= max;
  },

  /**
   * Validate phone number (basic format)
   */
  phone: (value: string): boolean => {
    if (!value) return true;
    // Accepts various phone formats: +62812345678, 0812345678, 12345678
    const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
    return phoneRegex.test(value.replace(/[-\s]/g, ''));
  },

  /**
   * Validate URL format
   */
  url: (value: string): boolean => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate password strength (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
   */
  strongPassword: (value: string): boolean => {
    if (!value) return true;
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(value);
  },

  /**
   * Validate pattern match
   */
  pattern: (pattern: RegExp) => (value: string): boolean => {
    if (!value) return true;
    return pattern.test(value);
  },

  /**
   * Custom validation with callback
   */
  custom: (validator: (value: any) => boolean) => validator,
};

/**
 * Common validation rules for form fields
 */
export const commonRules = {
  required: (fieldName: string): ValidationRule => ({
    rule: validators.required,
    message: `${fieldName} is required`,
  }),

  email: (fieldName: string = 'Email'): ValidationRule => ({
    rule: validators.email,
    message: `${fieldName} is not valid`,
  }),

  minLength: (fieldName: string, min: number): ValidationRule => ({
    rule: validators.minLength(min),
    message: `${fieldName} must be at least ${min} characters`,
  }),

  maxLength: (fieldName: string, max: number): ValidationRule => ({
    rule: validators.maxLength(max),
    message: `${fieldName} must be no more than ${max} characters`,
  }),

  phone: (fieldName: string = 'Phone number'): ValidationRule => ({
    rule: validators.phone,
    message: `${fieldName} is not valid`,
  }),

  numeric: (fieldName: string): ValidationRule => ({
    rule: validators.numeric,
    message: `${fieldName} must be a number`,
  }),

  min: (fieldName: string, min: number): ValidationRule => ({
    rule: validators.min(min),
    message: `${fieldName} must be at least ${min}`,
  }),

  max: (fieldName: string, max: number): ValidationRule => ({
    rule: validators.max(max),
    message: `${fieldName} must be no more than ${max}`,
  }),

  url: (fieldName: string = 'URL'): ValidationRule => ({
    rule: validators.url,
    message: `${fieldName} is not valid`,
  }),

  strongPassword: (fieldName: string = 'Password'): ValidationRule => ({
    rule: validators.strongPassword,
    message: `${fieldName} must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number`,
  }),
};

/**
 * Validate a single field value against rules
 * Returns error message or null if valid
 */
export const validateField = (value: any, rules: ValidationRule[]): string | null => {
  for (const { rule, message } of rules) {
    if (!rule(value)) {
      return message;
    }
  }
  return null;
};

/**
 * Validate entire form data against validation rules
 * Returns object with field errors or empty if valid
 */
export const validateForm = (
  data: Record<string, any>,
  rules: ValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const value = data[fieldName];
    const error = validateField(value, fieldRules);
    errors[fieldName] = error;
  }

  return errors;
};

/**
 * Check if form has any validation errors
 */
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some((error) => error !== null);
};

/**
 * Async validation for operations like checking email uniqueness
 */
export type AsyncValidationRule = {
  rule: (value: any) => Promise<boolean>;
  message: string;
};

/**
 * Validate a field asynchronously
 */
export const validateFieldAsync = async (
  value: any,
  rules: AsyncValidationRule[]
): Promise<string | null> => {
  for (const { rule, message } of rules) {
    try {
      const isValid = await rule(value);
      if (!isValid) {
        return message;
      }
    } catch {
      return `Error validating field`;
    }
  }
  return null;
};
