/**
 * Unit tests for useForm hook
 * Tests form state management, validation, submission, and async operations
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useForm } from '@/hooks/useForm';
import { commonRules } from '@/lib/validation';

interface TestFormData {
  name: string;
  email: string;
  age?: number;
}

describe('useForm Hook', () => {
  const initialValues: TestFormData = {
    name: '',
    email: '',
    age: undefined,
  };

  describe('Initial State', () => {
    it('should initialize with correct initial values', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should set isValid to true initially when no rules', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('setFieldValue', () => {
    it('should update field value', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      expect(result.current.values.name).toBe('John');
    });

    it('should mark form as dirty after field change', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      expect(result.current.isDirty).toBe(false);

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should validate on change when enabled', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          validateOnChange: true,
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', '');
      });

      await waitFor(() => {
        expect(result.current.errors.name).toBe('Name is required');
      });
    });

    it('should not validate on change when disabled', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          validateOnChange: false,
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', '');
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe('handleChange', () => {
    it('should handle text input changes', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      const event = {
        target: { name: 'name', value: 'John', type: 'text' },
      } as React.ChangeEvent<any>;

      await act(async () => {
        await result.current.handleChange(event);
      });

      expect(result.current.values.name).toBe('John');
    });

    it('should handle checkbox changes', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues: { ...initialValues, subscribe: false },
          validationRules: {},
        })
      );

      const event = {
        target: { name: 'subscribe', checked: true, type: 'checkbox' },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleChange(event);
      });

      expect((result.current.values as any).subscribe).toBe(true);
    });
  });

  describe('handleBlur', () => {
    it('should mark field as touched on blur', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      const event = {
        target: { name: 'name' },
      } as React.FocusEvent<any>;

      act(() => {
        result.current.handleBlur(event);
      });

      expect(result.current.touched.name).toBe(true);
    });

    it('should validate on blur when enabled', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          validateOnBlur: true,
        })
      );

      const event = {
        target: { name: 'name' },
      } as React.FocusEvent<any>;

      act(() => {
        result.current.handleBlur(event);
      });

      expect(result.current.errors.name).toBe('Name is required');
    });

    it('should not validate on blur when disabled', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          validateOnBlur: false,
        })
      );

      const event = {
        target: { name: 'name' },
      } as React.FocusEvent<any>;

      act(() => {
        result.current.handleBlur(event);
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe('validateForm', () => {
    it('should validate all fields', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
            email: [commonRules.required('Email'), commonRules.email()],
          },
        })
      );

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateForm();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.name).toBe('Name is required');
      expect(result.current.errors.email).toBe('Email is required');
    });

    it('should return true when all fields are valid', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
            email: [commonRules.required('Email'), commonRules.email()],
          },
        })
      );

      await act(async () => {
        await result.current.setValues({
          name: 'John',
          email: 'john@example.com',
        });
      });

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateForm();
      });

      expect(isValid!).toBe(true);
    });
  });

  describe('handleSubmit', () => {
    it('should call onSubmit when form is valid', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(onSubmit).toHaveBeenCalledWith({ name: 'John', email: '' });
    });

    it('should not call onSubmit when form is invalid', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          onSubmit,
        })
      );

      const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should set isSubmitting during submission', async () => {
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      const submitPromise = act(async () => {
        await result.current.handleSubmit(event);
      });

      // isSubmitting should be true during submission
      expect(result.current.isSubmitting).toBe(true);

      await submitPromise;

      // isSubmitting should be false after submission
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should reset form after submission when resetOnSubmit is true', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          onSubmit,
          resetOnSubmit: true,
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      expect(result.current.values.name).toBe('John');

      const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.isDirty).toBe(false);
    });

    it('should call onSubmitError on error', async () => {
      const error = new Error('Submit failed');
      const onSubmit = jest.fn(() => {
        throw error;
      });
      const onSubmitError = jest.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {
            name: [commonRules.required('Name')],
          },
          onSubmit,
          onSubmitError,
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(onSubmitError).toHaveBeenCalledWith(error);
    });
  });

  describe('reset', () => {
    it('should reset form to initial values', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
      });

      expect(result.current.values.name).toBe('John');

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.touched).toEqual({});
      expect(result.current.errors).toEqual({});
    });
  });

  describe('resetField', () => {
    it('should reset individual field', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues: { ...initialValues, name: 'Default' },
          validationRules: {},
        })
      );

      await act(async () => {
        await result.current.setFieldValue('name', 'John');
        await result.current.setFieldValue('email', 'john@example.com');
      });

      act(() => {
        result.current.resetField('name');
      });

      expect(result.current.values.name).toBe('Default');
      expect(result.current.values.email).toBe('john@example.com');
    });
  });

  describe('setFieldError', () => {
    it('should set field error manually', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      act(() => {
        result.current.setFieldError('name', 'Custom error');
      });

      expect(result.current.errors.name).toBe('Custom error');
    });
  });

  describe('setFieldTouched', () => {
    it('should set field touched state', () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      act(() => {
        result.current.setFieldTouched('name', true);
      });

      expect(result.current.touched.name).toBe(true);
    });
  });

  describe('setValues', () => {
    it('should set multiple values at once', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationRules: {},
        })
      );

      await act(async () => {
        await result.current.setValues({
          name: 'John',
          email: 'john@example.com',
        });
      });

      expect(result.current.values.name).toBe('John');
      expect(result.current.values.email).toBe('john@example.com');
    });
  });
});
