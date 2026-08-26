import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Vapestore POS
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          Progressive Web Application for Point of Sale Management
        </p>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            You can use this application online or offline. All your data is synced automatically when you&apos;re back online.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 text-left">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              📱 Mobile Ready
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Works seamlessly on smartphones, tablets, and desktops
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              🔒 Secure
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your data is encrypted and kept safe with industry standards
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              ⚡ Fast
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Instant loading and responsive interface for efficient work
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              🔄 Synced
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic synchronization across all your devices
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
