# Form System Documentation

A comprehensive, production-ready form system for React applications with TypeScript support. Includes form state management, real-time validation, async validation, and support for all common input types.

## Overview

The form system consists of:

1. **useForm Hook** - Form state and validation management
2. **Validation Utilities** - Pre-built validators and validation rules
3. **Form Components** - Reusable form wrapper and field components
4. **Field Components** - Input, Textarea, Select, Checkbox, Radio components
5. **Examples** - Complete working example with all features

## Quick Start

### Basic Form

```tsx
import { useForm } from '@/hooks/useForm';
import { commonRules } from '@/lib/validation';
import { Form, FormField, FormActions } from '@/components/form/Form';
import { Input } from '@/components/ui/Input';

interface FormData {
  email: string;
  password: string;
}

export const LoginForm = () => {
  const form = useForm<FormData>({
    initialValues: {
      email: '',
      password: '',
    },
    validationRules: {
      email: [commonRules.required('Email'), commonRules.email()],
      password: [commonRules.required('Password')],
    },
    onSubmit: async (values) => {
      await loginUser(values);
    },
  });

  return (
    <Form form={form}>
      <FormField
        label="Email"
        name="email"
        error={form.errors.email}
        touched={form.touched.email}
        required
      >
        <Input
          name="email"
          type="email"
          value={form.values.email}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
        />
      </FormField>

      <FormField
        label="Password"
        name="password"
        error={form.errors.password}
        touched={form.touched.password}
        required
      >
        <Input
          name="password"
          type="password"
          value={form.values.password}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
        />
      </FormField>

      <FormActions
        submitText="Login"
        isSubmitting={form.isSubmitting}
        isValid={form.isValid}
      />
    </Form>
  );
};
```

## useForm Hook

### Hook Signature

```typescript
const form = useForm<T>(options: UseFormOptions<T>): UseFormReturn<T>
```

### Options

```typescript
interface UseFormOptions<T> {
  // Initial form values (required)
  initialValues: T;

  // Validation rules for fields
  validationRules?: ValidationRules;

  // Called when form is submitted successfully
  onSubmit?: (values: T) => void | Promise<void>;

  // Called when form submission fails
  onSubmitError?: (error: Error) => void;

  // Enable validation on field change
  validateOnChange?: boolean; // default: true

  // Enable validation on field blur
  validateOnBlur?: boolean; // default: true

  // Reset form after successful submission
  resetOnSubmit?: boolean; // default: false
}
```

### Return Value

```typescript
interface UseFormReturn<T> {
  // State
  values: T;                                    // Current form values
  errors: ValidationErrors;                     // Field errors
  touched: Record<string, boolean>;             // Fields user has interacted with
  isSubmitting: boolean;                        // Form is being submitted
  isDirty: boolean;                             // Form values have been modified
  isValid: boolean;                             // All validations pass

  // Field actions
  setFieldValue: (field: string, value: any) => Promise<void>;
  setFieldError: (field: string, error: string | null) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  setValues: (values: Partial<T>) => Promise<void>;
  setErrors: (errors: ValidationErrors) => void;

  // Form validation
  validateField: (field: string) => Promise<string | null>;
  validateForm: () => Promise<boolean>;

  // Event handlers
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleChange: (e: React.ChangeEvent<any>) => Promise<void>;
  handleBlur: (e: React.FocusEvent<any>) => void;

  // Form actions
  reset: () => void;
  resetField: (field: string) => void;

  // Async validation
  addAsyncValidation: (field: string, rule: AsyncValidationRule) => void;
}
```

## Validation

### Built-in Validators

```typescript
import { validators } from '@/lib/validation';

validators.required(value)                // Check if required
validators.email(value)                   // Validate email
validators.minLength(min)(value)          // Minimum length
validators.maxLength(max)(value)          // Maximum length
validators.numeric(value)                 // Is numeric
validators.min(min)(value)                // Minimum value
validators.max(max)(value)                // Maximum value
validators.phone(value)                   // Phone number format
validators.url(value)                     // URL format
validators.strongPassword(value)          // Strong password (min 8, uppercase, lowercase, number)
validators.pattern(regex)(value)          // Regex pattern match
validators.custom(fn)(value)              // Custom validation function
```

### Common Rules

Pre-configured rules with localized messages:

```typescript
import { commonRules } from '@/lib/validation';

commonRules.required('Field Name')
commonRules.email('Email')
commonRules.minLength('Field Name', 8)
commonRules.maxLength('Field Name', 50)
commonRules.numeric('Amount')
commonRules.min('Price', 0)
commonRules.max('Quantity', 1000)
commonRules.phone('Phone Number')
commonRules.url('Website')
commonRules.strongPassword('Password')
```

### Custom Validation

```typescript
const form = useForm<FormData>({
  initialValues: { ... },
  validationRules: {
    username: [
      commonRules.required('Username'),
      commonRules.minLength('Username', 3),
      {
        rule: (value) => !value.includes('admin'),
        message: 'Username cannot contain "admin"'
      }
    ]
  }
});
```

### Async Validation

For operations like checking email uniqueness:

```typescript
const form = useForm<FormData>({
  initialValues: { email: '' },
  validationRules: {
    email: [commonRules.required('Email'), commonRules.email()]
  }
});

// Add async validation
useEffect(() => {
  form.addAsyncValidation('email', {
    rule: async (value) => {
      const response = await fetch(`/api/check-email?email=${value}`);
      const { available } = await response.json();
      return available;
    },
    message: 'This email is already registered'
  });
}, [form]);
```

## Form Components

### Form Wrapper

Wraps form inputs and handles submission:

```tsx
<Form form={form}>
  {/* Form fields go here */}
</Form>
```

### FormField

Wrapper for individual form fields with label and error display:

```tsx
<FormField
  label="Email"
  name="email"
  error={form.errors.email}
  touched={form.touched.email}
  required
  helperText="We'll never share your email"
>
  <Input
    name="email"
    type="email"
    value={form.values.email}
    onChange={form.handleChange}
    onBlur={form.handleBlur}
  />
</FormField>
```

### FormSection

Groups related fields with optional title and description:

```tsx
<FormSection
  title="Personal Information"
  description="Enter your basic information"
>
  {/* Form fields go here */}
</FormSection>
```

### FormActions

Renders submit/cancel buttons with loading state:

```tsx
<FormActions
  submitText="Create Account"
  cancelText="Cancel"
  isSubmitting={form.isSubmitting}
  isValid={form.isValid}
  onCancel={() => form.reset()}
  showCancel
/>
```

## Field Components

### Input

Text, email, password, number, etc:

```tsx
<Input
  name="email"
  type="email"
  label="Email"
  placeholder="john@example.com"
  value={form.values.email}
  onChange={form.handleChange}
  onBlur={form.handleBlur}
  error={form.errors.email}
  helperText="We'll never share your email"
  required
/>
```

### Textarea

Multi-line text input with character count:

```tsx
<Textarea
  name="bio"
  label="Bio"
  placeholder="Tell us about yourself..."
  value={form.values.bio}
  onChange={form.handleChange}
  charCount
  maxCharacters={500}
/>
```

### Select

Dropdown select with search support:

```tsx
<Select
  name="country"
  label="Country"
  options={[
    { label: 'Indonesia', value: 'id' },
    { label: 'Malaysia', value: 'my' },
  ]}
  value={form.values.country}
  onChange={(value) => form.setFieldValue('country', value)}
  searchable
/>
```

### Checkbox

Single checkbox or group:

```tsx
<Checkbox
  name="agreeToTerms"
  label="I agree to the terms and conditions"
  checked={form.values.agreeToTerms}
  onChange={form.handleChange}
/>
```

### RadioGroup

Radio button group:

```tsx
<RadioGroup
  name="gender"
  label="Gender"
  options={[
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ]}
  value={form.values.gender}
  onChange={(value) => form.setFieldValue('gender', value)}
/>
```

## Dark Mode Support

All form components support dark mode automatically. Just ensure the parent component has the appropriate dark mode class:

```tsx
<div className="dark">
  {/* Form components will use dark mode colors */}
</div>
```

## Validation States

### Real-Time Validation

```tsx
const form = useForm({
  initialValues: { email: '' },
  validationRules: {
    email: [commonRules.required('Email'), commonRules.email()]
  },
  validateOnChange: true,  // Validate as user types
  validateOnBlur: true      // Validate on blur
});
```

### Conditional Error Display

Only show errors for touched fields (fields user has interacted with):

```tsx
<FormField
  label="Email"
  name="email"
  error={form.touched.email ? form.errors.email : undefined}
  touched={form.touched.email}
>
  <Input {...} />
</FormField>
```

## Advanced Examples

### Password Confirmation

```tsx
useEffect(() => {
  if (form.values.password && form.values.confirmPassword) {
    if (form.values.password !== form.values.confirmPassword) {
      form.setFieldError('confirmPassword', 'Passwords do not match');
    } else {
      form.setFieldError('confirmPassword', null);
    }
  }
}, [form.values.password, form.values.confirmPassword]);
```

### Dependent Fields

```tsx
const handleCountryChange = async (country: string) => {
  await form.setFieldValue('country', country);
  // Reset city when country changes
  form.setFieldValue('city', '');
};
```

### Dynamic Validation

```tsx
const updateRules = (newRules: ValidationRules) => {
  // Re-run validation with new rules
  form.validateForm();
};
```

### Field Array (Multiple Items)

```tsx
interface FormData {
  items: { name: string; quantity: number }[];
}

const addItem = () => {
  const newItems = [
    ...form.values.items,
    { name: '', quantity: 1 }
  ];
  form.setFieldValue('items', newItems);
};
```

## Testing

### Unit Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useForm } from '@/hooks/useForm';
import { commonRules } from '@/lib/validation';

describe('useForm', () => {
  it('should validate email', async () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { email: '' },
        validationRules: {
          email: [commonRules.email()]
        }
      })
    );

    await act(async () => {
      await result.current.setFieldValue('email', 'invalid');
    });

    expect(result.current.errors.email).toBe('Email is not valid');
  });
});
```

## Performance Considerations

1. **Debounced Async Validation**: Async validation is debounced by 500ms to avoid excessive API calls
2. **Memoized Validation**: Validation functions are memoized to prevent unnecessary recalculations
3. **Lazy Form State**: Only re-render affected fields when values change
4. **Code Splitting**: Import components only when needed

## Accessibility

- All inputs have proper `label` elements with `htmlFor` attributes
- Error messages are associated with inputs
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader friendly

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Latest versions

## Examples

See `FormExample.tsx` for a complete working example with:
- All field types
- Real-time validation
- Async email validation
- Password confirmation
- Form submission
- Dark mode support
- Form state debugging
