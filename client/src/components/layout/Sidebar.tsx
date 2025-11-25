import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCircle,
  FolderKanban,
  Clock,
  TrendingUp,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog
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
    name: 'Profile',
    path: '/profile',
    icon: <UserCircle className="w-5 h-5" />,
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

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:flex-shrink-0
          ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Logo/Header with Collapse Toggle */}
          <div className="flex items-center h-16 border-b border-gray-200 dark:border-gray-700 px-4">
            <div className={`flex items-center justify-between w-full ${isCollapsed ? 'justify-center' : ''}`}>
              {isCollapsed ? (
                <LogoIcon size={32} className="flex-shrink-0" />
              ) : (
                <div className="flex-1">
                  <Logo size="sm" showText={true} />
                </div>
              )}
              {/* Desktop Collapse Toggle Button */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 flex-shrink-0 ml-2"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                )}
              </button>
            </div>
          </div>

          {/* User info */}
          {user && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.role}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
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
                        flex items-center px-4 py-3 rounded-lg transition-colors group relative
                        ${isCollapsed ? 'justify-center' : 'space-x-3'}
                        ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                      title={isCollapsed ? item.name : ''}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Theme toggle and Logout button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Theme Toggle */}
            <div className={`flex items-center px-4 py-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isCollapsed && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>}
              <ThemeToggle />
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`flex items-center px-4 py-3 w-full rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group relative ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <span className="flex-shrink-0"><LogOut className="w-5 h-5" /></span>
              {!isCollapsed && <span className="text-sm font-medium">Logout</span>}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Logout
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
