import { Link } from "react-router";
import { ArrowRightIcon } from "../../icons";
import { TOOL_APPS } from "../../shared/toolApps";

export default function Home() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pilih aplikasi dari daftar di bawah atau dari sidebar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOOL_APPS.map((app) => (
          <Link
            key={app.path}
            to={app.path}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              {app.icon}
            </div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {app.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {app.description}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-300">
              Buka aplikasi
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
