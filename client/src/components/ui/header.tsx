import { Menu } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  return (
    <div className="flex items-center h-14 px-4 border-b border-border bg-background md:hidden">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>
    </div>
  );
}
