import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Clock,
  TrendingUp,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context';
import { ThemeToggle } from '../ThemeToggle';
import { Logo, LogoIcon } from '../Logo';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    name: 'Projects',
    path: '/projects',
    icon: <FolderKanban className="w-5 h-5" />,
  },
  {
    name: 'Weekly Efforts',
    path: '/weekly-efforts',
    icon: <Clock className="w-5 h-5" />,
  },
  {
    name: 'Customers',
    path: '/customers',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    name: 'Resources',
    path: '/resources',
    icon: <Users className="w-5 h-5" />,
  },
  {
    name: 'KPIs',
    path: '/kpis',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    name: 'Trends',
    path: '/trends',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    name: 'Manage Users',
    path: '/manage-users',
    icon: <UserCog className="w-5 h-5" />,
    roles: ['Admin'],
  },
  {
    name: 'Audit Logs',
    path: '/audit-logs',
    icon: <FileText className="w-5 h-5" />,
    roles: ['Admin', 'CEO'],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false); // Mobile menu state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Determine if we should show the collapsed view
  // On mobile (isOpen is true), we always want to show the full menu regardless of isCollapsed state
  // On desktop (isOpen is false), we respect the isCollapsed state
  const showCollapsed = isCollapsed && !isOpen;

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md ${isOpen ? 'hidden' : 'block'}`}
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-[2px] z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:flex-shrink-0
          ${showCollapsed ? 'lg:w-20 w-64' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-x-hidden relative">
          {/* Logo/Header with Collapse Toggle */}
          <div className={`flex items-center h-16 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${showCollapsed ? 'justify-center px-2' : 'px-6'}`}>
            {showCollapsed ? (
              <LogoIcon size={32} className="flex-shrink-0" />
            ) : (
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <Logo size="sm" showText={true} />
                {/* Mobile Close Button */}
                <button
                  onClick={closeSidebar}
                  className="lg:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button - Floating on border */}
          {/* Removed floating button */}

          {/* User info removed from here */}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                // Filter menu items based on user role if needed
                if (item.roles && user && !item.roles.includes(user.role)) {
                  return null;
                }

                const isActive = location.pathname === item.path;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={closeSidebar}
                      className={`
                        flex items-center px-3 py-2.5 rounded-lg transition-colors group relative
                        ${showCollapsed ? 'justify-center' : 'space-x-3'}
                        ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                      title={showCollapsed ? item.name : ''}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!showCollapsed && <span className="text-sm font-medium truncate">{item.name}</span>}

                      {/* Tooltip for collapsed state */}
                      {showCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Section: User Info & Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className={`p-4 flex items-center ${showCollapsed ? 'flex-col space-y-4' : 'justify-between'}`}>
              
              {/* User Profile */}
              {user && (
                <Link 
                  to="/profile" 
                  onClick={closeSidebar}
                  className={`flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors ${showCollapsed ? 'justify-center' : 'space-x-3 overflow-hidden'}`}
                  title={showCollapsed ? 'Profile' : ''}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {!showCollapsed && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                        {user.role}
                      </span>
                    </div>
                  )}
                </Link>
              )}

              {/* Actions: Theme & Logout */}
              <div className={`flex items-center ${showCollapsed ? 'flex-col space-y-2' : 'space-x-1'}`}>
                <ThemeToggle />
                
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute top-6 -right-3 z-50 items-center justify-center w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {showCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </>
  );
}
