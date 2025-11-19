import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { InstallButton } from './InstallButton';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">{title}</h1>
        <div className="flex items-center gap-2">
          <InstallButton />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Icons.Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Icons.Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
