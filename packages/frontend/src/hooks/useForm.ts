/**
 * useForm Hook - Comprehensive form state management
 * Handles form state, validation, submission, and async operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ValidationRules,
  ValidationErrors,
  AsyncValidationRule,
  validateForm,
  validateField,
  validateFieldAsync,
  hasErrors,
} from '@/lib/validation';

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules;
  onSubmit?: (values: T) => void | Promise<void>;
  onSubmitError?: (error: Error) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSubmit?: boolean;
}

export interface UseFormReturn<T> {
  // State
  values: T;
  errors: ValidationErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;

  // Actions
  setFieldValue: (field: string, value: any) => Promise<void>;
  setFieldError: (field: string, error: string | null) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  setValues: (values: Partial<T>) => Promise<void>;
  setErrors: (errors: ValidationErrors) => void;
  validateField: (field: string) => Promise<string | null>;
  validateForm: () => Promise<boolean>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleChange: (e: React.ChangeEvent<any>) => Promise<void>;
  handleBlur: (e: React.FocusEvent<any>) => void;
  reset: () => void;
  resetField: (field: string) => void;

  // Async validation
  addAsyncValidation: (field: string, rule: AsyncValidationRule) => void;
}

/**
 * Hook for managing form state with validation
 */
export const useForm = <T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> => {
  const {
    initialValues,
    validationRules = {},
    onSubmit,
    onSubmitError,
    validateOnChange = true,
    validateOnBlur = true,
    resetOnSubmit = false,
  } = options;

  // State
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Refs for async validation tracking
  const asyncValidationRulesRef = useRef<Record<string, AsyncValidationRule[]>>({});
  const asyncValidationTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * Calculate if form is valid
   */
  const isValid = !hasErrors(errors) && Object.values(errors).length === Object.keys(validationRules).length;

  /**
   * Set field value with optional validation
   */
  const setFieldValueFn = useCallback(
    async (field: string, value: any) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));

      setIsDirty(true);

      // Clear previous async validation timeout
      if (asyncValidationTimeoutRef.current[field]) {
        clearTimeout(asyncValidationTimeoutRef.current[field]);
      }

      if (validateOnChange) {
        // Debounce async validation (500ms)
        asyncValidationTimeoutRef.current[field] = setTimeout(async () => {
          // Validate synchronously first
          const syncRules = validationRules[field] || [];
          const syncError = validateField(value, syncRules);

          if (syncError) {
            setErrors((prev) => ({
              ...prev,
              [field]: syncError,
            }));
            return;
          }

          // Then validate asynchronously if rules exist
          const asyncRules = asyncValidationRulesRef.current[field] || [];
          if (asyncRules.length > 0) {
            const asyncError = await validateFieldAsync(value, asyncRules);
            setErrors((prev) => ({
              ...prev,
              [field]: asyncError,
            }));
          } else {
            setErrors((prev) => ({
              ...prev,
              [field]: null,
            }));
          }
        }, 500);
      }
    },
    [validateOnChange, validationRules]
  );

  /**
   * Set field error manually
   */
  const setFieldErrorFn = useCallback((field: string, error: string | null) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  /**
   * Set field touched state
   */
  const setFieldTouchedFn = useCallback((field: string, touched: boolean) => {
    setTouched((prev) => ({
      ...prev,
      [field]: touched,
    }));
  }, []);

  /**
   * Set multiple values
   */
  const setValuesFn = useCallback(
    async (newValues: Partial<T>) => {
      setValues((prev) => ({
        ...prev,
        ...newValues,
      }));
      setIsDirty(true);

      if (validateOnChange) {
        const newErrors: ValidationErrors = {};
        for (const [field, value] of Object.entries(newValues)) {
          const fieldRules = validationRules[field] || [];
          newErrors[field] = validateField(value, fieldRules) || null;
        }
        setErrors((prev) => ({
          ...prev,
          ...newErrors,
        }));
      }
    },
    [validateOnChange, validationRules]
  );

  /**
   * Set errors directly
   */
  const setErrorsFn = useCallback((newErrors: ValidationErrors) => {
    setErrors(newErrors);
  }, []);

  /**
   * Validate single field
   */
  const validateFieldFn = useCallback(
    async (field: string): Promise<string | null> => {
      const value = values[field];
      const syncRules = validationRules[field] || [];
      const syncError = validateField(value, syncRules);

      if (syncError) {
        setErrors((prev) => ({
          ...prev,
          [field]: syncError,
        }));
        return syncError;
      }

      // Validate asynchronously
      const asyncRules = asyncValidationRulesRef.current[field] || [];
      if (asyncRules.length > 0) {
        const asyncError = await validateFieldAsync(value, asyncRules);
        setErrors((prev) => ({
          ...prev,
          [field]: asyncError,
        }));
        return asyncError;
      }

      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
      return null;
    },
    [values, validationRules]
  );

  /**
   * Validate entire form
   */
  const validateFormFn = useCallback(async (): Promise<boolean> => {
    const newErrors = validateForm(values, validationRules);
    setErrors(newErrors);

    // Validate async rules
    for (const [field, asyncRules] of Object.entries(asyncValidationRulesRef.current)) {
      if (asyncRules.length > 0) {
        const asyncError = await validateFieldAsync(values[field], asyncRules);
        newErrors[field] = asyncError;
      }
    }

    setErrors(newErrors);
    return !hasErrors(newErrors);
  }, [values, validationRules]);

  /**
   * Handle form submission
   */
  const handleSubmitFn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const isFormValid = await validateFormFn();
      if (!isFormValid) {
        return;
      }

      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(values);
        }

        if (resetOnSubmit) {
          setValues(initialValues);
          setErrors({});
          setTouched({});
          setIsDirty(false);
        }
      } catch (error) {
        if (onSubmitError) {
          onSubmitError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateFormFn, onSubmit, onSubmitError, resetOnSubmit, initialValues, values]
  );

  /**
   * Handle input change
   */
  const handleChangeFn = useCallback(
    async (e: React.ChangeEvent<any>) => {
      const { name, value, type, checked } = e.target;
      const fieldValue = type === 'checkbox' ? checked : value;

      await setFieldValueFn(name, fieldValue);
    },
    [setFieldValueFn]
  );

  /**
   * Handle input blur
   */
  const handleBlurFn = useCallback(
    (e: React.FocusEvent<any>) => {
      const { name } = e.target;
      setFieldTouchedFn(name, true);

      if (validateOnBlur) {
        const value = values[name];
        const fieldRules = validationRules[name] || [];
        const error = validateField(value, fieldRules);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [validateOnBlur, values, validationRules, setFieldTouchedFn]
  );

  /**
   * Reset form to initial values
   */
  const resetFn = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  /**
   * Reset single field
   */
  const resetFieldFn = useCallback((field: string) => {
    setValues((prev) => ({
      ...prev,
      [field]: initialValues[field],
    }));
    setErrors((prev) => ({
      ...prev,
      [field]: null,
    }));
    setTouched((prev) => ({
      ...prev,
      [field]: false,
    }));
  }, [initialValues]);

  /**
   * Add async validation rule for field
   */
  const addAsyncValidationFn = useCallback((field: string, rule: AsyncValidationRule) => {
    if (!asyncValidationRulesRef.current[field]) {
      asyncValidationRulesRef.current[field] = [];
    }
    asyncValidationRulesRef.current[field].push(rule);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(asyncValidationTimeoutRef.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid,
    setFieldValue: setFieldValueFn,
    setFieldError: setFieldErrorFn,
    setFieldTouched: setFieldTouchedFn,
    setValues: setValuesFn,
    setErrors: setErrorsFn,
    validateField: validateFieldFn,
    validateForm: validateFormFn,
    handleSubmit: handleSubmitFn,
    handleChange: handleChangeFn,
    handleBlur: handleBlurFn,
    reset: resetFn,
    resetField: resetFieldFn,
    addAsyncValidation: addAsyncValidationFn,
  };
};
