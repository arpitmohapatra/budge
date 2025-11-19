import * as Icons from 'lucide-react';

interface BottomNavProps {
  currentView: 'dashboard' | 'transactions' | 'subscriptions' | 'analytics';
  onViewChange: (view: 'dashboard' | 'transactions' | 'subscriptions' | 'analytics') => void;
}

export function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Home', Icon: Icons.Home },
    { id: 'transactions' as const, label: 'Transactions', Icon: Icons.Wallet },
    { id: 'subscriptions' as const, label: 'Subscriptions', Icon: Icons.RefreshCw },
    { id: 'analytics' as const, label: 'Analytics', Icon: Icons.BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === id
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
