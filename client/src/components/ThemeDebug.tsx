import { useTheme } from '../context';
import { useEffect, useState } from 'react';

export const ThemeDebug = () => {
  const { theme, toggleTheme } = useTheme();
  const [htmlClass, setHtmlClass] = useState('');

  useEffect(() => {
    // Update HTML class display
    const updateClass = () => {
      setHtmlClass(document.documentElement.className || '(none)');
    };

    updateClass();

    // Watch for class changes
    const observer = new MutationObserver(updateClass);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-500 rounded-lg p-4 shadow-lg text-xs z-[9999]">
      <div className="font-bold mb-2 text-yellow-900 dark:text-yellow-100">Theme Debug Info</div>
      <div className="space-y-1 text-yellow-800 dark:text-yellow-200">
        <div>React State: <span className="font-mono font-bold">{theme}</span></div>
        <div>HTML Classes: <span className="font-mono font-bold">{htmlClass}</span></div>
        <div>localStorage: <span className="font-mono font-bold">{localStorage.getItem('theme') || 'null'}</span></div>
        <div>Has .dark: <span className="font-mono font-bold">{document.documentElement.classList.contains('dark') ? 'YES' : 'NO'}</span></div>
      </div>
      <button
        onClick={toggleTheme}
        className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold py-1 px-2 rounded"
      >
        Toggle Theme (Test)
      </button>
    </div>
  );
};
