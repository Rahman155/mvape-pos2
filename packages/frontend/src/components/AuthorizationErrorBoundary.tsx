/**
 * AuthorizationErrorBoundary component
 * Catches authorization-related errors and displays appropriate message
 */

import React, { Component, ReactNode } from 'react';

export interface AuthorizationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AuthorizationErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error boundary for authorization errors
 * Displays user-friendly error message on auth failure
 */
export class AuthorizationErrorBoundary extends Component<
  AuthorizationErrorBoundaryProps,
  AuthorizationErrorBoundaryState
> {
  constructor(props: AuthorizationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): AuthorizationErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An authorization error occurred',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('Authorization error caught:', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50">
          <div className="text-center px-6">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Authorization Error</h2>
            <p className="text-red-700 mb-4">{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
