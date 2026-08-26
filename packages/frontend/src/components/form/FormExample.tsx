/**
 * Comprehensive form example demonstrating all form components and validation
 * Shows real-time validation, async validation, and form submission
 */

'use client';

import React, { useState } from 'react';
import { useForm } from '@/hooks/useForm';
import { commonRules, AsyncValidationRule } from '@/lib/validation';
import { Form, FormField, FormSection, FormActions } from './Form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectOption } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { RadioGroup } from '@/components/ui/Radio';
import { Alert } from '@/components/ui/Alert';

/**
 * Example: User Registration Form
 * Demonstrates all form field types and validation features
 */

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: string;
  country: string;
  bio: string;
  agreeToTerms: boolean;
  subscribeNewsletter: boolean;
}

export const RegistrationFormExample: React.FC = () => {
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitData, setSubmitData] = useState<Partial<RegistrationFormData> | null>(null);

  const countries: SelectOption[] = [
    { label: 'Indonesia', value: 'id' },
    { label: 'Malaysia', value: 'my' },
    { label: 'Singapore', value: 'sg' },
    { label: 'Thailand', value: 'th' },
    { label: 'Philippines', value: 'ph' },
  ];

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  const form = useForm<RegistrationFormData>({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      gender: '',
      country: '',
      bio: '',
      agreeToTerms: false,
      subscribeNewsletter: false,
    },
    validationRules: {
      firstName: [commonRules.required('First Name'), commonRules.minLength('First Name', 2)],
      lastName: [commonRules.required('Last Name'), commonRules.minLength('Last Name', 2)],
      email: [commonRules.required('Email'), commonRules.email('Email')],
      phone: [commonRules.required('Phone'), commonRules.phone()],
      password: [
        commonRules.required('Password'),
        commonRules.strongPassword('Password'),
      ],
      confirmPassword: [commonRules.required('Confirm Password')],
      gender: [commonRules.required('Gender')],
      country: [commonRules.required('Country')],
      bio: [commonRules.maxLength('Bio', 500)],
      agreeToTerms: [
        {
          rule: (value: boolean) => value === true,
          message: 'You must agree to the terms and conditions',
        },
      ],
      subscribeNewsletter: [],
    },
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log('Form submitted:', values);
      setSubmitData(values);
      setSubmitSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
    validateOnChange: true,
    validateOnBlur: true,
    resetOnSubmit: true,
  });

  // Add async validation for email uniqueness
  React.useEffect(() => {
    const asyncEmailRule: AsyncValidationRule = {
      rule: async (value: string) => {
        if (!value) return true;
        // Simulate API call to check email uniqueness
        await new Promise((resolve) => setTimeout(resolve, 500));
        // This would be a real API call: return !await checkEmailExists(value);
        return !value.includes('test@example.com');
      },
      message: 'This email is already registered',
    };

    form.addAsyncValidation('email', asyncEmailRule);
  }, [form]);

  // Custom validation for password confirmation
  React.useEffect(() => {
    if (form.values.password && form.values.confirmPassword) {
      if (form.values.password !== form.values.confirmPassword) {
        form.setFieldError('confirmPassword', 'Passwords do not match');
      } else {
        form.setFieldError('confirmPassword', null);
      }
    }
  }, [form.values.password, form.values.confirmPassword, form]);

  const handleCancel = () => {
    form.reset();
    setSubmitSuccess(false);
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        User Registration Form
      </h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Complete the form below to create your account. All fields are required unless marked as optional.
      </p>

      {submitSuccess && (
        <Alert variant="success" className="mb-6">
          ✓ Registration successful! Form submitted with all data.
        </Alert>
      )}

      <Form form={form}>
        {/* Personal Information Section */}
        <FormSection
          title="Personal Information"
          description="Enter your basic information"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="First Name"
              name="firstName"
              error={form.errors.firstName}
              touched={form.touched.firstName}
              required
            >
              <Input
                name="firstName"
                type="text"
                placeholder="John"
                value={form.values.firstName}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                state={form.errors.firstName ? 'error' : undefined}
              />
            </FormField>

            <FormField
              label="Last Name"
              name="lastName"
              error={form.errors.lastName}
              touched={form.touched.lastName}
              required
            >
              <Input
                name="lastName"
                type="text"
                placeholder="Doe"
                value={form.values.lastName}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                state={form.errors.lastName ? 'error' : undefined}
              />
            </FormField>
          </div>

          <FormField
            label="Gender"
            name="gender"
            error={form.errors.gender}
            touched={form.touched.gender}
            required
          >
            <RadioGroup
              name="gender"
              options={genderOptions}
              value={form.values.gender}
              onChange={(value) => form.setFieldValue('gender', value)}
            />
          </FormField>
        </FormSection>

        {/* Contact Information Section */}
        <FormSection
          title="Contact Information"
          description="How can we reach you?"
        >
          <FormField
            label="Email Address"
            name="email"
            error={form.errors.email}
            touched={form.touched.email}
            required
            helperText="We'll never share your email"
          >
            <Input
              name="email"
              type="email"
              placeholder="john@example.com"
              value={form.values.email}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              state={form.errors.email ? 'error' : undefined}
            />
          </FormField>

          <FormField
            label="Phone Number"
            name="phone"
            error={form.errors.phone}
            touched={form.touched.phone}
            required
            helperText="Include country code (e.g., +62812345678 or 0812345678)"
          >
            <Input
              name="phone"
              type="tel"
              placeholder="+62812345678"
              value={form.values.phone}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              state={form.errors.phone ? 'error' : undefined}
            />
          </FormField>

          <FormField
            label="Country"
            name="country"
            error={form.errors.country}
            touched={form.touched.country}
            required
          >
            <Select
              name="country"
              options={countries}
              value={form.values.country}
              onChange={(value) => form.setFieldValue('country', value)}
              searchable
            />
          </FormField>
        </FormSection>

        {/* Account Security Section */}
        <FormSection
          title="Account Security"
          description="Create a strong password for your account"
        >
          <FormField
            label="Password"
            name="password"
            error={form.errors.password}
            touched={form.touched.password}
            required
            helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
          >
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.values.password}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              state={form.errors.password ? 'error' : undefined}
            />
          </FormField>

          <FormField
            label="Confirm Password"
            name="confirmPassword"
            error={form.errors.confirmPassword}
            touched={form.touched.confirmPassword}
            required
          >
            <Input
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={form.values.confirmPassword}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              state={form.errors.confirmPassword ? 'error' : undefined}
            />
          </FormField>
        </FormSection>

        {/* Additional Information Section */}
        <FormSection
          title="About You"
          description="Tell us more about yourself (optional)"
        >
          <FormField
            label="Bio"
            name="bio"
            error={form.errors.bio}
            touched={form.touched.bio}
            helperText="Maximum 500 characters"
          >
            <Textarea
              name="bio"
              placeholder="Tell us about yourself..."
              value={form.values.bio}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              charCount
              maxCharacters={500}
            />
          </FormField>
        </FormSection>

        {/* Preferences Section */}
        <FormSection title="Preferences">
          <FormField
            label="Accept Terms & Conditions"
            name="agreeToTerms"
            error={form.errors.agreeToTerms}
            touched={form.touched.agreeToTerms}
            required
          >
            <Checkbox
              name="agreeToTerms"
              label="I agree to the terms and conditions"
              checked={form.values.agreeToTerms}
              onChange={form.handleChange}
            />
          </FormField>

          <FormField
            label="Newsletter Subscription"
            name="subscribeNewsletter"
          >
            <Checkbox
              name="subscribeNewsletter"
              label="Subscribe me to the newsletter for updates and promotions"
              checked={form.values.subscribeNewsletter}
              onChange={form.handleChange}
            />
          </FormField>
        </FormSection>

        {/* Form Actions */}
        <FormActions
          submitText="Create Account"
          cancelText="Cancel"
          isSubmitting={form.isSubmitting}
          isValid={form.isValid}
          onCancel={handleCancel}
          showCancel
        />
      </Form>

      {/* Form State Debug Info */}
      <details className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
          Form State (Debug)
        </summary>
        <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
          {JSON.stringify(
            {
              isDirty: form.isDirty,
              isValid: form.isValid,
              isSubmitting: form.isSubmitting,
              values: form.values,
              errors: form.errors,
              touched: form.touched,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
};

export default RegistrationFormExample;
