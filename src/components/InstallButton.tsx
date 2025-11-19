import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useState } from 'react';

export function InstallButton() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      title="Install Budge App"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span className="hidden sm:inline">
        {isInstalling ? 'Installing...' : 'Install'}
      </span>
    </button>
  );
}

