/**
 * UnauthorizedPage component
 * Displays when user tries to access a page they don't have permission for
 */

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultPage } from '@/lib/permissions';

export interface UnauthorizedPageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

/**
 * Component showing unauthorized access message
 */
export function UnauthorizedPage({
  title = 'Access Denied',
  message = 'You do not have permission to access this page.',
  showBackButton = true,
  showHomeButton = true,
}: UnauthorizedPageProps) {
  const router = useRouter();
  const { role } = useAuth();

  const handleGoHome = () => {
    if (role) {
      router.push(getDefaultPage(role));
    } else {
      router.push('/login');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <div className="text-center px-6 py-12 max-w-md bg-white rounded-lg shadow-lg">
        {/* Lock Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm6-10V7a3 3 0 00-3-3H9a3 3 0 00-3 3v4h12V7a3 3 0 00-3-3h-3a3 3 0 00-3 3v4z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-red-900 mb-3">{title}</h1>

        {/* Message */}
        <p className="text-gray-600 mb-8">{message}</p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          {showBackButton && (
            <button
              onClick={handleGoBack}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={handleGoHome}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          )}
        </div>

        {/* Footer Info */}
        <p className="text-xs text-gray-500 mt-8">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
