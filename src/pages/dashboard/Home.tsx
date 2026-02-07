export default function Home() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Quick access to tools and status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/encode-decode"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs transition hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="text-sm font-medium text-gray-900 dark:text-white/90">
            Encode / Decode
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            AES-256-GCM helper for encrypt/decrypt testing.
          </div>
        </a>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm font-medium text-gray-900 dark:text-white/90">
            Theme
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Use the toggle in the top-right header.
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm font-medium text-gray-900 dark:text-white/90">
            Notes
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Add widgets here later (recent activity, quick links, etc.).
          </div>
        </div>
      </div>
    </div>
  );
}
