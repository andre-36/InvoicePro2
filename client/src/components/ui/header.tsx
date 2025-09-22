import {
  Menu,
} from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile Menu Toggle */}
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        {/* Empty space for cleaner look */}
        <div></div>
      </div>
    </header>
  );
}
