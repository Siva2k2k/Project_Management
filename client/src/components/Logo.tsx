import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizes = {
    sm: { logo: 32, text: 'text-lg' },
    md: { logo: 40, text: 'text-xl' },
    lg: { logo: 48, text: 'text-2xl' },
    xl: { logo: 64, text: 'text-4xl' },
  };

  const { logo: logoSize, text: textSize } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={logoSize}
        height={logoSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background Circle */}
        <circle cx="32" cy="32" r="30" fill="url(#gradient1)" />

        {/* Project Management Icon - Kanban Board */}
        <g transform="translate(16, 18)">
          {/* Column 1 */}
          <rect x="2" y="2" width="8" height="24" rx="2" fill="white" opacity="0.9" />
          <rect x="2" y="4" width="8" height="6" rx="1" fill="#3B82F6" />
          <rect x="2" y="12" width="8" height="4" rx="1" fill="#3B82F6" opacity="0.6" />

          {/* Column 2 */}
          <rect x="12" y="2" width="8" height="24" rx="2" fill="white" opacity="0.9" />
          <rect x="12" y="4" width="8" height="8" rx="1" fill="#8B5CF6" />
          <rect x="12" y="14" width="8" height="6" rx="1" fill="#8B5CF6" opacity="0.6" />

          {/* Column 3 */}
          <rect x="22" y="2" width="8" height="24" rx="2" fill="white" opacity="0.9" />
          <rect x="22" y="4" width="8" height="5" rx="1" fill="#EC4899" />
          <rect x="22" y="11" width="8" height="7" rx="1" fill="#EC4899" opacity="0.6" />
          <rect x="22" y="20" width="8" height="4" rx="1" fill="#EC4899" opacity="0.4" />
        </g>

        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="50%" stopColor="#764ba2" />
            <stop offset="100%" stopColor="#f093fb" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${textSize} text-gray-900 dark:text-white leading-tight`}>
            HiBiz
          </span>
          <span className={`text-xs text-gray-600 dark:text-gray-400 font-medium -mt-1`}>
            PM Dashboard
          </span>
        </div>
      )}
    </div>
  );
};

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Circle */}
      <circle cx="32" cy="32" r="30" fill="url(#gradient1)" />

      {/* Project Management Icon - Kanban Board */}
      <g transform="translate(16, 18)">
        {/* Column 1 */}
        <rect x="2" y="2" width="8" height="24" rx="2" fill="white" opacity="0.9" />
        <rect x="2" y="4" width="8" height="6" rx="1" fill="#3B82F6" />
        <rect x="2" y="12" width="8" height="4" rx="1" fill="#3B82F6" opacity="0.6" />

        {/* Column 2 */}
        <rect x="12" y="2" width="8" height="24" rx="2" fill="white" opacity="0.9" />
        <rect x="12" y="4" width="8" height="8" rx="1" fill="#8B5CF6" />
        <rect x="12" y="14" width="8" height="6" rx="1" fill="#8B5CF6" opacity="0.6" />

        {/* Column 3 */}
        <rect x="22" y="2" width="8" height="24" rx="2" fill="white" opacity="0.9" />
        <rect x="22" y="4" width="8" height="5" rx="1" fill="#EC4899" />
        <rect x="22" y="11" width="8" height="7" rx="1" fill="#EC4899" opacity="0.6" />
        <rect x="22" y="20" width="8" height="4" rx="1" fill="#EC4899" opacity="0.4" />
      </g>

      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="50%" stopColor="#764ba2" />
          <stop offset="100%" stopColor="#f093fb" />
        </linearGradient>
      </defs>
    </svg>
  );
};
