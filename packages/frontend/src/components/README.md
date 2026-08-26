# Components Directory

This directory contains all React components for the Vapestore POS application.

## Structure

### `common/`
Shared components used across the application:
- Header
- Sidebar/Navigation
- Loading states
- Error boundaries
- etc.

### `ui/`
Reusable UI component library:
- Button
- Input
- Modal
- Card
- Table
- Badge
- Toast
- etc.

### `kasir/`
Cashier-specific components:
- Dashboard
- Point of Sale
- Transaction History
- Member Management
- etc.

### `owner/`
Owner/Manager-specific components:
- Dashboard
- Store Management
- Inventory Management
- Reports
- Financial Reports
- etc.

## Component Guidelines

### Naming
- Use PascalCase for component names
- File name matches component name
- E.g., `Button.tsx` for `Button` component

### Structure
Each component should include:
```tsx
interface ComponentProps {
  // Props definition
}

export function ComponentName({ props }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Styling
- Use Tailwind CSS classes
- Support dark mode with `dark:` prefix
- Include responsive classes for mobile-first design

### Documentation
- Add JSDoc comments for complex components
- Document props with TypeScript interfaces
- Include usage examples if needed

### Example

```tsx
interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Button component with multiple variants
 */
export function Button({ 
  onClick, 
  disabled, 
  variant = 'primary',
  size = 'md',
  children 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
```

## Import Paths

Use the `@/` alias for imports:

```tsx
// Good
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

// Avoid
import { Button } from '../../../components/ui/Button';
```
