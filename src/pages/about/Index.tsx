import { useEffect } from "react";

export default function AboutMeRedirect() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = "https://opakk.id";
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        About Me
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Mengarahkan ke <a className="text-brand-600 underline" href="https://opakk.id">opakk.id</a>...
      </p>
    </div>
  );
}
