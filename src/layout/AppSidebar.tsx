import { useCallback } from "react";
import { Link, useLocation } from "react-router";
import { TOOL_GROUPS } from "../shared/toolApps";
import { useSidebar } from "../context/SidebarContext";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const showLabels = isExpanded || isHovered || isMobileOpen;

  const renderGroup = (
    group: (typeof TOOL_GROUPS)[number],
    groupIndex: number
  ) => {
    return (
      <div key={group.id} className="flex flex-col">
        {groupIndex > 0 && (
          <hr className="my-4 border-gray-200 dark:border-gray-800" />
        )}

        {showLabels ? (
          <h2
            className={`mb-3 px-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 ${
              !isExpanded && !isHovered ? "lg:text-center" : ""
            }`}
          >
            {group.label}
          </h2>
        ) : (
          <div className="mb-4" />
        )}

        <ul className="flex flex-col gap-1">
          {group.items.map((item, itemIndex) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-theme-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                } ${!showLabels ? "lg:justify-center" : "justify-start"}`}
              >
                {isActive(item.path) && (
                  <span className="absolute left-0 inset-y-1.5 w-1 origin-center rounded-full bg-brand-500 motion-safe:animate-scale-y-center" />
                )}

                <span
                  className={`transition-transform duration-150 ease-out group-hover:translate-x-0.5 ${
                    isActive(item.path)
                      ? "text-brand-500 dark:text-brand-400"
                      : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {item.icon}
                </span>

                {showLabels && (
                  <span
                    className="transition-all duration-200 ease-out motion-safe:animate-fade-slide-in"
                    style={{
                      animationDelay: `${(itemIndex + groupIndex) * 30}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    {item.name}
                  </span>
                )}

                {showLabels && (item.new || item.pro) && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                      isActive(item.path)
                        ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                        : "bg-brand-50 text-brand-500 group-hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:group-hover:bg-brand-500/20"
                    }`}
                  >
                    {item.new ? "new" : "pro"}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-2">
            {TOOL_GROUPS.map((group, index) => renderGroup(group, index))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
